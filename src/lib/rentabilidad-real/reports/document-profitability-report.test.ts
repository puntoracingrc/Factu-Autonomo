import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueDocument } from "@/lib/document-integrity";
import { attestNewImportedDocument } from "@/lib/document-integrity/legacy-import-attestation";
import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type AppData,
  type Document,
  type Expense,
} from "@/lib/types";
import {
  addStoredInternalAdjustment,
  clearInternalAdjustmentsForTests,
} from "@/lib/rentabilidad-real/internal-adjustments";
import { DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS } from "./local-report-settings";
import { buildDocumentProfitabilityReport } from "./document-profitability-report";
import type { RentabilidadRealReportSettings } from "./types";

const TEST_PROFILE = {
  ...DEFAULT_PROFILE,
  name: "Negocio Demo",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  city: "Madrid",
  postalCode: "28001",
  email: "negocio@example.test",
};

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
}

function document(
  overrides: Partial<Document> & Pick<Document, "id" | "type" | "number">,
): Document {
  const requestedStatus = overrides.status ?? "enviado";
  const draft: Document = {
    id: overrides.id,
    type: overrides.type,
    number: overrides.number,
    date: overrides.date ?? "2026-07-01",
    customerId: overrides.customerId ?? "client_1",
    client: overrides.client ?? { name: "Cliente Demo" },
    items: overrides.items ?? [
      {
        id: "line_1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    sourceQuoteDocumentId: overrides.sourceQuoteDocumentId,
    rectification: overrides.rectification,
    rectifiedById: overrides.rectifiedById,
    createdAt: overrides.createdAt ?? "2026-07-01T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-07-01T10:00:00.000Z",
  };
  if (requestedStatus === "borrador") return draft;
  const draftForIssue: Document = {
    ...draft,
    documentLifecycle: "draft",
    integrityLock: "unlocked",
  };
  delete draftForIssue.rectifiedById;
  return {
    ...issueDocument(draftForIssue, TEST_PROFILE, draft.createdAt),
    status: requestedStatus,
    rectifiedById: overrides.rectifiedById,
  };
}

function documentWithoutClient(
  overrides: Partial<Document> & Pick<Document, "id" | "type" | "number">,
): Document {
  const withClient = document(overrides);
  const copy: Partial<Document> = { ...withClient };
  delete copy.client;
  delete copy.customerId;
  return copy as Document;
}

function expense(overrides: Partial<Expense> & Pick<Expense, "id">): Expense {
  return {
    id: overrides.id,
    date: overrides.date ?? "2026-07-02",
    supplierName: overrides.supplierName ?? "Proveedor",
    description: overrides.description ?? "Material",
    amount: overrides.amount ?? 50,
    ivaPercent: overrides.ivaPercent ?? 21,
    category: overrides.category ?? "Material",
    paymentMethod: overrides.paymentMethod ?? "Tarjeta",
    businessKind: overrides.businessKind ?? "purchase",
    origin: overrides.origin,
    workDocumentId: overrides.workDocumentId,
    createdAt: overrides.createdAt ?? "2026-07-02T10:00:00.000Z",
  };
}

function data(input: { documents: Document[]; expenses?: Expense[] }): AppData {
  return {
    ...EMPTY_DATA,
    documents: input.documents,
    expenses: input.expenses ?? [],
    recurringExpenses: [],
  };
}

function settings(
  overrides: Partial<RentabilidadRealReportSettings> = {},
): RentabilidadRealReportSettings {
  return {
    ...DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    ...overrides,
  };
}

describe("buildDocumentProfitabilityReport", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearInternalAdjustmentsForTests();
    vi.unstubAllGlobals();
  });

  it("genera informe por documento para facturas", () => {
    const invoice = document({ id: "i1", type: "factura", number: "F-1" });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [invoice] }),
      settings(),
    );

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      primaryDocumentId: "i1",
      incomeWithoutIndirectTax: 100,
      operatingProfit: 100,
      analysisMode: "unknown",
    });
  });

  it("incluye el histórico atestado con importes congelados y excluye el app-issued sin sello", () => {
    const importedDraft = document({
      id: "pcfacturacion:factura:F-2024-0001",
      type: "factura",
      number: "F-2024-0001",
      status: "borrador",
      client: { name: "Cliente histórico" },
      items: [
        {
          id: "legacy-line",
          description: "",
          quantity: 1,
          unitPrice: 250,
          ivaPercent: 21,
        },
      ],
    });
    const imported = attestNewImportedDocument(
      {
        ...importedDraft,
        status: "enviado",
        documentLifecycle: "issued",
        integrityLock: "locked",
        issuer: {
          ...captureIssuerSnapshot(
            TEST_PROFILE,
            "2024-07-01T10:00:00.000Z",
          ),
          name: "",
          nif: "",
          address: "",
          city: "",
          postalCode: "",
        },
      },
      TEST_PROFILE,
      "pcfacturacion",
      "2026-07-13T00:00:00.000Z",
    );
    const sealedModern = document({
      id: "app-issued-equivalent",
      type: "factura",
      number: "F-2026-0999",
      items: importedDraft.items,
    });
    const appIssuedWithoutSeal: Document = {
      ...sealedModern,
      snapshotSeal: undefined,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["snapshot_seal_missing"],
      },
    };

    const report = buildDocumentProfitabilityReport(
      data({
        documents: [imported, appIssuedWithoutSeal],
      }),
      settings(),
    );

    expect(imported.legacyImportAttestation).toMatchObject({
      schemaVersion: 2,
      acceptedContentPolicy: {
        completenessExceptions: expect.arrayContaining([
          "issuer_nif_missing_or_nonstandard",
          "customer_nif_missing_or_nonstandard",
          "line_description_missing",
        ]),
      },
    });
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      primaryDocumentId: imported.id,
      incomeWithoutIndirectTax: 250,
      operatingProfit: 250,
    });
    expect(
      report.rows.some((row) => row.primaryDocumentId === sealedModern.id),
    ).toBe(false);

    const duplicatedReport = buildDocumentProfitabilityReport(
      data({ documents: [imported, imported] }),
      settings(),
    );
    expect(duplicatedReport.rows).toEqual([]);
    expect(duplicatedReport.summary).toMatchObject({
      rowCount: 0,
      incomeWithoutIndirectTax: 0,
      operatingProfit: 0,
    });
    expect(imported.snapshotIntegrity).toBeUndefined();

    const tamperedReport = buildDocumentProfitabilityReport(
      data({
        documents: [
          {
            ...imported,
            items: [
              {
                id: "changed-live-line",
                description: "Contenido vivo no canónico",
                quantity: 1,
                unitPrice: 999,
                ivaPercent: 21,
              },
            ],
          },
        ],
      }),
      settings(),
    );
    expect(tamperedReport.rows).toEqual([]);
  });

  it("usa el modo guardado del documento", () => {
    const invoice = document({ id: "i1", type: "factura", number: "F-1" });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [invoice] }),
      {
        ...settings(),
        documentAnalysisModes: {
          i1: "fixed_price_work",
        },
      },
    );

    expect(report.rows[0].analysisMode).toBe("fixed_price_work");
  });

  it("usa el modo guardado del presupuesto en un par presupuesto/factura", () => {
    const quote = document({ id: "q1", type: "presupuesto", number: "P-1" });
    const invoice = document({
      id: "i1",
      type: "factura",
      number: "F-1",
      sourceQuoteDocumentId: "q1",
    });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [quote, invoice] }),
      {
        ...settings(),
        documentAnalysisModes: {
          q1: "installation_with_materials",
        },
      },
    );

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].analysisMode).toBe("installation_with_materials");
  });

  it("filtra por modo de analisis antes de calcular resumen", () => {
    const invoiceA = document({ id: "i1", type: "factura", number: "F-1" });
    const invoiceB = document({
      id: "i2",
      type: "factura",
      number: "F-2",
      items: [
        {
          id: "line_2",
          description: "Servicio horas",
          quantity: 1,
          unitPrice: 200,
          ivaPercent: 21,
        },
      ],
    });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [invoiceA, invoiceB] }),
      {
        ...settings({ analysisModeFilter: "hours_project" }),
        documentAnalysisModes: {
          i1: "fixed_price_work",
          i2: "hours_project",
        },
      },
    );

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      primaryDocumentId: "i2",
      incomeWithoutIndirectTax: 200,
      analysisMode: "hours_project",
    });
    expect(report.summary.rowCount).toBe(1);
    expect(report.summary.incomeWithoutIndirectTax).toBe(200);
  });

  it("usa factura real sobre presupuesto cuando existe vínculo", () => {
    const quote = document({
      id: "q1",
      type: "presupuesto",
      number: "P-1",
      items: [
        {
          id: "line_1",
          description: "Servicio previsto",
          quantity: 1,
          unitPrice: 80,
          ivaPercent: 21,
        },
      ],
    });
    const invoice = document({
      id: "i1",
      type: "factura",
      number: "F-1",
      sourceQuoteDocumentId: "q1",
    });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [quote, invoice] }),
      settings(),
    );

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      sourceType: "quote_invoice_pair",
      expectedIncomeWithoutIndirectTax: 80,
      actualIncomeWithoutIndirectTax: 100,
      incomeWithoutIndirectTax: 100,
    });
  });

  it("incluye presupuesto previsto si no hay factura", () => {
    const quote = document({ id: "q1", type: "presupuesto", number: "P-1" });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [quote] }),
      settings(),
    );

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].qualityFlags).toContain("quote_without_invoice");
  });

  it("incluye ajustes internos cuando corresponde", () => {
    const invoice = document({ id: "i1", type: "factura", number: "F-1" });
    addStoredInternalAdjustment({
      id: "adj_1",
      sourceDocumentId: "i1",
      sourceType: "invoice",
      amount: 25,
      label: "Ajuste",
      category: "other_internal_adjustment",
    });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [invoice] }),
      settings(),
    );

    expect(report.rows[0].internalAdjustmentsTotal).toBe(25);
    expect(report.rows[0].internalRealProfit).toBe(75);
    expect(report.rows[0].qualityFlags).toContain("has_internal_adjustments");
  });

  it("excluye ajustes internos si settings dice false", () => {
    const invoice = document({ id: "i1", type: "factura", number: "F-1" });
    addStoredInternalAdjustment({
      id: "adj_1",
      sourceDocumentId: "i1",
      sourceType: "invoice",
      amount: 25,
      label: "Ajuste",
      category: "other_internal_adjustment",
    });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [invoice] }),
      settings({ includeInternalAdjustments: false }),
    );

    expect(report.rows[0].internalAdjustmentsTotal).toBe(0);
    expect(report.rows[0].internalRealProfit).toBe(100);
  });

  it("detecta low_margin y negative_profit", () => {
    const invoice = document({ id: "i1", type: "factura", number: "F-1" });
    const report = buildDocumentProfitabilityReport(
      data({
        documents: [invoice],
        expenses: [expense({ id: "e1", amount: 120, workDocumentId: "i1" })],
      }),
      settings(),
    );

    expect(report.rows[0].qualityFlags).toContain("low_margin");
    expect(report.rows[0].qualityFlags).toContain("negative_profit");
  });

  it("detecta no_linked_expenses y has_unlinked_candidates", () => {
    const invoice = document({ id: "i1", type: "factura", number: "F-1" });
    const report = buildDocumentProfitabilityReport(
      data({
        documents: [invoice],
        expenses: [expense({ id: "e1", amount: 20 })],
      }),
      settings(),
    );

    expect(report.rows[0].qualityFlags).toContain("no_linked_expenses");
    expect(report.rows[0].qualityFlags).toContain("has_unlinked_candidates");
  });

  it("no muta AppData", () => {
    const source = data({
      documents: [document({ id: "i1", type: "factura", number: "F-1" })],
    });
    const before = JSON.parse(JSON.stringify(source));

    buildDocumentProfitabilityReport(source, settings());

    expect(source).toEqual(before);
  });

  it("documento sin client aparece como Cliente sin asignar", () => {
    const invoice = documentWithoutClient({
      id: "i1",
      type: "factura",
      number: "F-1",
    });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [invoice] }),
      settings(),
    );

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      clientId: "client_unassigned",
      clientName: "Cliente sin asignar",
    });
  });

  it("excluye borrador de rectificativa y mantiene la factura vigente", () => {
    const invoice = document({ id: "i1", type: "factura", number: "F-1" });
    const draftRectification = document({
      id: "r1",
      type: "factura",
      number: "FR-1",
      status: "borrador",
      rectification: {
        originalDocumentId: "i1",
        originalNumber: "F-1",
        originalDate: "2026-07-01",
        reason: "Error en datos",
        type: "correccion",
      },
    });

    const report = buildDocumentProfitabilityReport(
      data({ documents: [invoice, draftRectification] }),
      settings(),
    );

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      primaryDocumentId: "i1",
      incomeWithoutIndirectTax: 100,
    });
  });

  it("usa rectificativa vigente sin duplicar la factura original", () => {
    const original = document({
      id: "i1",
      type: "factura",
      number: "F-1",
      status: "rectificada",
      rectifiedById: "r1",
    });
    const rectification = document({
      id: "r1",
      type: "factura",
      number: "FR-1",
      date: "2026-07-02",
      items: [
        {
          id: "line_rect",
          description: "Servicio corregido",
          quantity: 1,
          unitPrice: 80,
          ivaPercent: 21,
        },
      ],
      rectification: {
        originalDocumentId: "i1",
        originalNumber: "F-1",
        originalDate: "2026-07-01",
        reason: "Error en datos",
        type: "correccion",
      },
    });

    const report = buildDocumentProfitabilityReport(
      data({
        documents: [original, rectification],
        expenses: [expense({ id: "e1", amount: 20, workDocumentId: "i1" })],
      }),
      settings(),
    );

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      primaryDocumentId: "r1",
      incomeWithoutIndirectTax: 80,
      totalDirectCosts: 20,
      operatingProfit: 60,
    });
    expect(report.summary).toMatchObject({
      rowCount: 1,
      incomeWithoutIndirectTax: 80,
      operatingProfit: 60,
    });
  });
});
