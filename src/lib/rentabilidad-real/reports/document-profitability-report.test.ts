import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_DATA, type AppData, type Document, type Expense } from "@/lib/types";
import {
  addStoredInternalAdjustment,
  clearInternalAdjustmentsForTests,
} from "@/lib/rentabilidad-real/internal-adjustments";
import { DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS } from "./local-report-settings";
import { buildDocumentProfitabilityReport } from "./document-profitability-report";
import type { RentabilidadRealReportSettings } from "./types";

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
  return {
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
    status: overrides.status ?? "enviado",
    sourceQuoteDocumentId: overrides.sourceQuoteDocumentId,
    createdAt: overrides.createdAt ?? "2026-07-01T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-07-01T10:00:00.000Z",
  };
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

function data(input: {
  documents: Document[];
  expenses?: Expense[];
}): AppData {
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

    const report = buildDocumentProfitabilityReport(data({ documents: [invoice] }), settings());

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      primaryDocumentId: "i1",
      incomeWithoutIndirectTax: 100,
      operatingProfit: 100,
    });
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

    const report = buildDocumentProfitabilityReport(data({ documents: [quote] }), settings());

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

    const report = buildDocumentProfitabilityReport(data({ documents: [invoice] }), settings());

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
});
