import { describe, expect, it } from "vitest";
import type { jsPDF } from "jspdf";
import { buildAnnualSummaryPdf } from "./export-annual-pdf";
import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type Document,
  type Expense,
} from "../types";
import { issueDocument, markDocumentPaid } from "../document-integrity";
import {
  applyLegacyImportRepair,
  attestNewImportedDocument,
  buildLegacyImportRepairPreview,
} from "../document-integrity/legacy-import-attestation";
import { captureIssuerSnapshot } from "../issuer-snapshot";
import { TaxExportBlockedError } from "../taxes";

const profile = {
  ...DEFAULT_PROFILE,
  name: "Autónomo Test",
  nif: "11111111H",
  address: "Calle Mayor 1",
  postalCode: "28001",
  city: "Madrid",
};

const draftDoc: Document = {
  id: "d1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-05-10",
  client: {
    name: "Cliente Test",
    nif: "87654321A",
    address: "Calle Cliente 2",
    postalCode: "28002",
    city: "Madrid",
  },
  items: [
    {
      id: "l1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "borrador",
  createdAt: "2026-05-10",
  updatedAt: "2026-05-10",
};

const doc = markDocumentPaid(
  issueDocument(draftDoc, profile, "2026-05-10T10:00:00.000Z"),
  "2026-05-10T11:00:00.000Z",
);

function attestedHistoricalCorrectionDocuments(): Document[] {
  const originalId = "pcfacturacion:factura:F-2024-0001";
  const rectificationId = "pcfacturacion:factura:FR-2024-0001";
  const rolloutResidue = {
    snapshotIntegrityRequired: true as const,
    snapshotIntegrity: {
      status: "blocked" as const,
      issues: [
        "document_snapshot_missing" as const,
        "pdf_snapshot_missing" as const,
        "snapshot_seal_missing" as const,
      ],
    },
  };
  const original: Document = {
    ...draftDoc,
    id: originalId,
    number: "F-2024-0001",
    date: "2024-04-01",
    status: "rectificada",
    issuer: captureIssuerSnapshot(profile, "2024-04-01T10:00:00.000Z"),
    documentLifecycle: "issued",
    integrityLock: "locked",
    rectifiedById: rectificationId,
    ...rolloutResidue,
  };
  const rectification: Document = {
    ...draftDoc,
    id: rectificationId,
    number: "FR-2024-0001",
    date: "2024-04-02",
    status: "pagado",
    issuer: captureIssuerSnapshot(profile, "2024-04-02T10:00:00.000Z"),
    documentLifecycle: "issued",
    integrityLock: "locked",
    rectification: {
      originalDocumentId: originalId,
      originalNumber: original.number,
      originalDate: original.date,
      reason: "Correccion historica",
      type: "correccion",
    },
    ...rolloutResidue,
  };
  const data = {
    ...EMPTY_DATA,
    profile,
    documents: [original, rectification],
    snapshotIntegrityVersion: 1 as const,
  };
  const result = applyLegacyImportRepair(
    data,
    buildLegacyImportRepairPreview(data),
    "2026-07-13T08:00:00.000Z",
  );
  if (result.status !== "applied") {
    throw new Error(
      `No se pudo atestar la correccion historica: ${result.reason}`,
    );
  }
  return result.data.documents;
}

const expense: Expense = {
  id: "e1",
  date: "2026-04-02",
  supplierName: "Proveedor",
  description: "Material",
  amount: 50,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Tarjeta",
  createdAt: "2026-04-02",
};

function mixedVatExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    ...expense,
    id: "mixed-vat-expense",
    description: "Compra IVA mixto",
    amount: 200,
    ivaPercent: 21,
    purchaseLines: [
      {
        id: "line-21",
        description: "Tipo general",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
      {
        id: "line-10",
        description: "Tipo reducido",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 10,
      },
    ],
    ...overrides,
  };
}

function pdfCommands(pdf: jsPDF): string {
  const pages = (pdf.internal as unknown as { pages: Array<string[] | null> })
    .pages;
  return pages.flatMap((page) => page ?? []).join("\n");
}

function captureBlockedExport(action: () => unknown): TaxExportBlockedError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(TaxExportBlockedError);
    return error as TaxExportBlockedError;
  }
  throw new Error("La exportación debía quedar bloqueada");
}

describe("export annual pdf", () => {
  it("genera un PDF con al menos una página", () => {
    const pdf = buildAnnualSummaryPdf([doc], [expense], profile, 2026);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("incluye como facturada una factura emitida aunque siga pendiente de cobro", () => {
    const issuedUnpaid = issueDocument(
      { ...draftDoc, id: "issued-unpaid", number: "F-2026-0099" },
      profile,
      "2026-05-10T10:00:00.000Z",
    );
    const commands = pdfCommands(
      buildAnnualSummaryPdf([issuedUnpaid], [], profile, 2026),
    );

    expect(issuedUnpaid.status).not.toBe("pagado");
    expect(commands).toContain("Facturado en el año");
    expect(commands).toContain("121,00");
    expect(commands).not.toContain("Cobrado en el año");
  });

  it("separa el IVA del resultado tras reservar el IRPF", () => {
    const commands = pdfCommands(
      buildAnnualSummaryPdf([doc], [expense], profile, 2026),
    );

    expect(commands).toContain("IVA neto a pagar");
    expect(commands).toContain("10,50");
    expect(commands).toContain("Resultado económico tras reservar IRPF");
    expect(commands).toContain("40,00");
    expect(commands).not.toContain("Beneficio neto aproximado");
    expect(commands).not.toContain("29,50");
  });

  it("conserva el coste no deducible y lo excluye de base, IVA e IRPF", () => {
    const commands = pdfCommands(
      buildAnnualSummaryPdf(
        [doc],
        [
          {
            ...expense,
            amount: 100,
            deductibility: "non_deductible",
          },
        ],
        profile,
        2026,
      ),
    );

    expect(commands).toContain("Gasto neto del año");
    expect(commands).toContain("Gasto neto deducible en IRPF");
    expect(commands).toContain("Gastos y abonos no deducibles");
    expect(commands).toContain("No deducible");
    expect(commands).toContain("121,00");
    expect(commands).toContain("Coste económico neto de gastos y abonos");
    expect(commands).toContain("Beneficio económico antes de reservar IRPF");
    expect(commands).toContain("-21,00");
    expect(commands).toContain("Base estimada para IRPF");
    expect(commands).toContain("100,00");
    expect(commands).toContain("Resultado económico tras reservar IRPF");
    expect(commands).toContain("-41,00");
  });

  it("muestra tipos y origen sin añadir columnas al detalle anual", () => {
    const commands = pdfCommands(
      buildAnnualSummaryPdf([doc], [mixedVatExpense()], profile, 2026),
    );

    expect(commands).toContain("IVA 10% + 21%");
    expect(commands).toContain("líneas");
    expect(commands).toContain("conciliadas");
    expect(commands).toContain("31,00");
    expect(commands).toContain("231,00");
    expect(commands).toContain("200,00");
  });

  it("traza el recargo separado y el coste documental completo", () => {
    const surchargeExpense: Expense = {
      ...expense,
      description: "Compra con recargo",
      amount: 100,
      providerSummary: {
        status: "pending_original",
        summaryId: "summary-re",
        importedAt: "2026-07-11T10:00:00.000Z",
        summaryInvoiceTotal: 126.2,
        summaryIvaPercent: 21,
        summaryIvaAmount: 21,
        summaryRecargoPercent: 5.2,
        summaryRecargoAmount: 5.2,
      },
    };
    const commands = pdfCommands(
      buildAnnualSummaryPdf([doc], [surchargeExpense], profile, 2026),
    );

    expect(commands).toContain("R.E.");
    expect(commands).toContain("5,2%");
    expect(commands).toContain("5,20");
    expect(commands).toContain("126,20");
  });

  it("identifica un abono y compensa sus importes firmados en el resumen", () => {
    const credit: Expense = {
      ...expense,
      id: "credit",
      description: "Devolución de material",
      amount: -50,
    };
    const commands = pdfCommands(
      buildAnnualSummaryPdf([doc], [expense, credit], profile, 2026),
    );

    expect(commands).toContain("Gasto neto del año");
    expect(commands).toContain("Coste económico neto de gastos y abonos");
    expect(commands).toContain("Abono");
    expect(commands).toContain("saldo a favor");
    expect(commands).toContain("-50,00");
  });

  it("bloquea el PDF anual ante evidencia mixta no conciliada", () => {
    const error = captureBlockedExport(() =>
      buildAnnualSummaryPdf(
        [doc],
        [mixedVatExpense({ amount: 250 })],
        profile,
        2026,
      ),
    );

    expect(error).toMatchObject({
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 0,
      unsupportedMixedVatExpenses: 1,
    });
  });

  it("rotula el perfil exento sin presentarlo como cabecera o importe íntegro", () => {
    const commands = pdfCommands(
      buildAnnualSummaryPdf(
        [doc],
        [expense],
        { ...profile, vatExempt: true },
        2026,
      ),
    );

    expect(commands).toContain("IVA: perfil exento");
    expect(commands).not.toContain("cabecera o importe íntegro");
  });

  it("proyecta el snapshot histórico antes de seleccionar periodo e importes", () => {
    const drifted: Document = {
      ...doc,
      number: "F-LIVE-ALTERADA",
      date: "2027-01-01",
      client: { name: "Cliente alterado" },
      items: [{ ...doc.items[0], unitPrice: 999 }],
    };

    const commands = pdfCommands(
      buildAnnualSummaryPdf([drifted], [], profile, 2026),
    );

    expect(commands).toContain("F-2026-0001");
    expect(commands).toContain("Cliente Test");
    expect(commands).toContain("100,00");
    expect(commands).not.toContain("F-LIVE-ALTERADA");
    expect(commands).not.toContain("Cliente alterado");
    expect(commands).not.toContain("999,00");
  });

  it("incluye un histórico importado atestado en el resumen anual", () => {
    const historical = attestNewImportedDocument(
      {
        ...draftDoc,
        id: "pcfacturacion:factura:F-2026-0001",
        client: { name: "" },
        items: [{ ...draftDoc.items[0], description: "" }],
        status: "pagado",
        issuer: {
          ...captureIssuerSnapshot(profile, "2026-05-10T10:00:00.000Z"),
          name: "",
          nif: "",
          address: "",
          city: "",
          postalCode: "",
        },
        documentLifecycle: "issued",
        integrityLock: "locked",
        paymentStatus: "paid",
      },
      profile,
      "pcfacturacion",
      "2026-07-12T22:00:00.000Z",
    );
    const commands = pdfCommands(
      buildAnnualSummaryPdf([historical], [], profile, 2026),
    );

    expect(commands).toContain("F-2026-0001");
    expect(commands).toContain("100,00");
    expect(commands).toContain("21,00");
    expect(commands).toContain("121,00");
    expect(historical.legacyImportAttestation).toMatchObject({
      schemaVersion: 2,
      acceptedContentPolicy: {
        completenessExceptions: expect.arrayContaining([
          "issuer_nif_missing_or_nonstandard",
          "customer_nif_missing_or_nonstandard",
          "line_description_missing",
        ]),
      },
    });
    expect(historical.snapshotSeal).toBeUndefined();
  });

  it("incluye solo la rectificativa vigente de una relación histórica V3", () => {
    const commands = pdfCommands(
      buildAnnualSummaryPdf(
        attestedHistoricalCorrectionDocuments(),
        [],
        profile,
        2024,
      ),
    );

    expect(commands).toContain("FR-2024-0001");
    expect(commands).not.toContain("F-2024-0001");
    expect(commands).toContain("100,00");
    expect(commands).toContain("21,00");
    expect(commands).toContain("121,00");
  });

  it("bloquea el PDF si existe evidencia fiscal corrupta", () => {
    const blocked: Document = {
      ...doc,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_hash_mismatch"],
      },
    };

    const error = captureBlockedExport(() =>
      buildAnnualSummaryPdf([blocked], [], profile, 2026),
    );

    expect(error).toMatchObject({
      integrityBlockedDocuments: 1,
      unsupportedRectificationDocuments: 0,
    });
  });

  it("bloquea una corrección interanual aunque su relación sellada sea válida", () => {
    const original = issueDocument(
      { ...draftDoc, id: "original-2025", date: "2025-12-31" },
      profile,
      "2025-12-31T10:00:00.000Z",
    );
    const rectification = issueDocument(
      {
        ...draftDoc,
        id: "rectification-2026",
        number: "FR-2026-0001",
        date: "2026-01-01",
        items: [{ ...draftDoc.items[0], id: "rect-line", unitPrice: 70 }],
        rectification: {
          originalDocumentId: original.id,
          originalNumber: original.number,
          originalDate: original.date,
          reason: "Corrección de datos",
          type: "correccion",
        },
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      },
      profile,
      "2026-01-01T10:00:00.000Z",
    );
    const linkedOriginal: Document = {
      ...original,
      status: "rectificada",
      rectifiedById: rectification.id,
    };

    const error = captureBlockedExport(() =>
      buildAnnualSummaryPdf([linkedOriginal, rectification], [], profile, 2026),
    );

    expect(error).toMatchObject({
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 1,
    });
  });
});
