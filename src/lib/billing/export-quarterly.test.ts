import { describe, expect, it } from "vitest";
import { buildQuarterlyExportCsv } from "./export-quarterly";
import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type Document,
  type Expense,
  type Supplier,
} from "../types";
import { issueDocument } from "../document-integrity";
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

const doc = issueDocument(draftDoc, profile, "2026-05-10T10:00:00.000Z");

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
    status: "enviado",
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
  supplierId: "s1",
  supplierName: "Proveedor",
  description: "Material",
  amount: 50,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Transferencia",
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

const supplier: Supplier = {
  id: "s1",
  name: "Proveedor",
  nif: "B99887766",
  createdAt: "2026-01-01",
};

function captureBlockedExport(action: () => unknown): TaxExportBlockedError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(TaxExportBlockedError);
    return error as TaxExportBlockedError;
  }
  throw new Error("La exportación debía quedar bloqueada");
}

describe("export quarterly csv", () => {
  it("incluye resumen, ventas y gastos con formato para gestoría", () => {
    const csv = buildQuarterlyExportCsv([doc], [expense], profile, 2026, 2, [
      supplier,
    ]);

    expect(csv).toContain("EXPORTACIÓN TRIMESTRAL FISCAL");
    expect(csv).toContain("2.º trimestre 2026");
    expect(csv).toContain("Autónomo Test");
    expect(csv).toContain("RESUMEN DEL PERIODO");
    expect(csv).toContain("IVA neto a ingresar;10,50");
    expect(csv).toContain("Coste económico de gastos;50,00");
    expect(csv).toContain("Beneficio económico antes de reservar IRPF;50,00");
    expect(csv).toContain("Base estimada para IRPF;50,00");
    expect(csv).toContain("IRPF estimado (orientativo);10,00");
    expect(csv).toContain("Resultado económico tras reservar IRPF;40,00");
    expect(csv).not.toContain("Beneficio neto");
    expect(csv).toContain("LIBRO DE VENTAS");
    expect(csv).toContain("F-2026-0001");
    expect(csv).toContain("Cliente Test");
    expect(csv).toContain("87654321A");
    expect(csv).toContain("100,00");
    expect(csv).toContain("LIBRO DE GASTOS Y COMPRAS");
    expect(csv).toContain("Proveedor");
    expect(csv).toContain("B99887766");
    expect(csv).toContain("Transferencia");
    expect(csv).toContain("TOTAL GASTOS");
  });

  it("usa fecha, cliente e importes del snapshot aunque los campos vivos deriven", () => {
    const drifted: Document = {
      ...doc,
      number: "F-LIVE-ALTERADA",
      date: "2027-01-01",
      client: { name: "Cliente alterado", nif: "B00000000" },
      items: [{ ...doc.items[0], unitPrice: 999 }],
    };

    const csv = buildQuarterlyExportCsv([drifted], [], profile, 2026, 2);

    expect(csv).toContain("F-2026-0001");
    expect(csv).toContain("Cliente Test");
    expect(csv).toContain("87654321A");
    expect(csv).toContain("Base imponible ventas;100,00");
    expect(csv).not.toContain("F-LIVE-ALTERADA");
    expect(csv).not.toContain("Cliente alterado");
    expect(csv).not.toContain("999,00");
  });

  it("mantiene el no deducible en el libro sin reducir la fiscalidad", () => {
    const csv = buildQuarterlyExportCsv(
      [doc],
      [
        {
          ...expense,
          amount: 120,
          deductibility: "non_deductible",
        },
      ],
      profile,
      2026,
      2,
      [supplier],
    );

    expect(csv).toContain("Gasto neto deducible en IRPF;0,00");
    expect(csv).toContain("IVA deducible;0,00");
    expect(csv).toContain("Gastos no deducibles (coste registrado);145,20");
    expect(csv).toContain("Coste económico de gastos;145,20");
    expect(csv).toContain("Beneficio económico antes de reservar IRPF;-45,20");
    expect(csv).toContain("Base estimada para IRPF;100,00");
    expect(csv).toContain("IRPF estimado (orientativo);20,00");
    expect(csv).toContain("Resultado económico tras reservar IRPF;-65,20");
    expect(csv).toContain(
      "No deducible;120,00;21%;21%: base 120,00 / IVA 25,20;Cabecera o importe íntegro;25,20;;0,00;145,20;0,00;0,00;0,00",
    );
  });

  it("resume origen y desglose del IVA mixto conciliado", () => {
    const csv = buildQuarterlyExportCsv(
      [doc],
      [mixedVatExpense()],
      profile,
      2026,
      2,
      [supplier],
    );

    expect(csv).toContain("IVA deducible;31,00");
    expect(csv).toContain("TRAZABILIDAD DEL IVA DE GASTOS");
    expect(csv).toContain("Líneas conciliadas;1");
    expect(csv).toContain("Cabecera o contrato de importe íntegro;0");
    expect(csv).toContain("10% + 21%");
    expect(csv).toContain("10%: base 100,00 / IVA 10,00");
    expect(csv).toContain("21%: base 100,00 / IVA 21,00");
    expect(csv).toContain("31,00;;0,00;231,00;200,00;200,00;31,00");
  });

  it("incluye el recargo no recuperable en resumen y libro", () => {
    const surchargeExpense: Expense = {
      ...expense,
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
    const csv = buildQuarterlyExportCsv(
      [doc],
      [surchargeExpense],
      profile,
      2026,
      2,
      [supplier],
    );

    expect(csv).toContain("Coste económico de gastos;126,20");
    expect(csv).toContain("Gasto neto deducible en IRPF;126,20");
    expect(csv).toContain("IVA deducible;0,00");
    expect(csv).toContain("Recargo equivalencia (%)");
    expect(csv).toContain("21,00;5,2%;5,20;126,20;126,20;0,00;0,00");
  });

  it("bloquea un trimestre con evidencia mixta no conciliada", () => {
    const error = captureBlockedExport(() =>
      buildQuarterlyExportCsv(
        [doc],
        [mixedVatExpense({ amount: 250 })],
        profile,
        2026,
        2,
        [supplier],
      ),
    );

    expect(error).toMatchObject({
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 0,
      unsupportedMixedVatExpenses: 1,
    });
  });

  it("exporta un periodo exento con solo gasto no deducible", () => {
    const csv = buildQuarterlyExportCsv(
      [],
      [
        {
          ...expense,
          amount: 100,
          ivaPercent: 21,
          deductibility: "non_deductible",
        },
      ],
      { ...profile, vatExempt: true },
      2026,
      2,
      [supplier],
    );

    expect(csv).toContain("Coste económico de gastos;100,00");
    expect(csv).toContain("Gasto neto deducible en IRPF;0,00");
    expect(csv).toContain("IVA deducible;0,00");
    expect(csv).toContain("Beneficio económico antes de reservar IRPF;-100,00");
    expect(csv).toContain("Base estimada para IRPF;0,00");
    expect(csv).toContain("IRPF estimado (orientativo);0,00");
    expect(csv).toContain("Resultado económico tras reservar IRPF;-100,00");
    expect(csv).toContain("Perfil exento — IVA no calculado;1");
    expect(csv).not.toContain("Cabecera o contrato de importe íntegro");
    expect(csv).toContain(
      "No deducible;100,00;0%;0%: base 100,00 / IVA 0,00;Perfil exento;0,00;;0,00;100,00;0,00;0,00;0,00",
    );
  });

  it("mantiene el resumen fiscal congelado de snapshots legacy verificados", () => {
    const legacy: Document = {
      ...doc,
      documentSnapshot: {
        ...doc.documentSnapshot!,
        source: "legacy_backfill",
      },
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
      issuedAt: undefined,
    };

    const csv = buildQuarterlyExportCsv(
      [legacy],
      [],
      { ...profile, vatExempt: true },
      2026,
      2,
    );

    expect(csv).toContain("Base imponible ventas;100,00");
    expect(csv).toContain("IVA repercutido;21,00");
    expect(csv).toContain("100,00;21,00;121,00");
  });

  it("exporta el histórico importado atestado sin atribuirle sello moderno", () => {
    const historical = attestNewImportedDocument(
      {
        ...draftDoc,
        id: "pcfacturacion:factura:F-2026-0001",
        client: { name: "" },
        items: [{ ...draftDoc.items[0], description: "" }],
        status: "enviado",
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
      },
      profile,
      "pcfacturacion",
      "2026-07-12T22:00:00.000Z",
    );

    const csv = buildQuarterlyExportCsv([historical], [], profile, 2026, 2);
    expect(csv).toContain("Base imponible ventas;100,00");
    expect(csv).toContain("IVA repercutido;21,00");
    expect(csv).toContain("100,00;21,00;121,00");
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
    expect(historical.pdfSnapshot).toBeUndefined();
    expect(historical.snapshotSeal).toBeUndefined();
  });

  it("exporta solo la rectificativa vigente de una relación histórica V3", () => {
    const documents = attestedHistoricalCorrectionDocuments();
    const csv = buildQuarterlyExportCsv(documents, [], profile, 2024, 2);

    expect(csv).toContain("Base imponible ventas;100,00");
    expect(csv).toContain("IVA repercutido;21,00");
    expect(csv).toContain("FR-2024-0001");
    expect(csv).not.toMatch(/;F-2024-0001;/);
  });

  it("compensa compra y abono y rotula el saldo a favor en el libro", () => {
    const credit: Expense = {
      ...expense,
      id: "credit",
      description: "Abono material",
      amount: -50,
    };
    const csv = buildQuarterlyExportCsv(
      [doc],
      [expense, credit],
      profile,
      2026,
      2,
      [supplier],
    );

    expect(csv).toContain("Coste económico de gastos;0,00");
    expect(csv).toContain("Gasto neto deducible en IRPF;0,00");
    expect(csv).toContain("IVA deducible;0,00");
    expect(csv).toContain(
      "Criterio gastos;Importes firmados: los abonos y saldos a favor se muestran en negativo",
    );
    expect(csv).toContain("Abono / saldo a favor · Deducible");
    expect(csv).toContain("TOTAL GASTOS");
  });

  it("bloquea la exportación si existe evidencia fiscal corrupta", () => {
    const blocked: Document = {
      ...doc,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_hash_mismatch"],
      },
    };

    const error = captureBlockedExport(() =>
      buildQuarterlyExportCsv([blocked], [], profile, 2026, 2),
    );

    expect(error).toMatchObject({
      integrityBlockedDocuments: 1,
      unsupportedRectificationDocuments: 0,
    });
  });

  it("bloquea una corrección Q1→Q2 aunque su relación sellada sea válida", () => {
    const original = issueDocument(
      { ...draftDoc, id: "original-q1", date: "2026-03-31" },
      profile,
      "2026-03-31T10:00:00.000Z",
    );
    const rectification = issueDocument(
      {
        ...draftDoc,
        id: "rectification-q2",
        number: "FR-2026-0001",
        date: "2026-04-01",
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
      "2026-04-01T10:00:00.000Z",
    );
    const linkedOriginal: Document = {
      ...original,
      status: "rectificada",
      rectifiedById: rectification.id,
    };

    const error = captureBlockedExport(() =>
      buildQuarterlyExportCsv(
        [linkedOriginal, rectification],
        [],
        profile,
        2026,
        2,
      ),
    );

    expect(error).toMatchObject({
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 1,
    });
  });
});
