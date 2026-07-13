import { describe, expect, it } from "vitest";
import {
  canMarkAsCollected,
  collectedIncome,
  isCollectedDocument,
  isPendingInvoicePayment,
  pendingCollection,
  statusAfterUnmarkingCollection,
} from "./income";
import {
  buildCustomerInvoicedTotals,
  customerInvoicedTotal,
} from "./customers";
import { issueDocument } from "./document-integrity";
import { materializeRectificationDocument } from "./document-integrity/rectification-issuance";
import {
  applyLegacyImportRepair,
  attestNewImportedDocument,
  buildLegacyImportRepairPreview,
} from "./document-integrity/legacy-import-attestation";
import { captureIssuerSnapshot } from "./issuer-snapshot";
import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type BusinessProfile,
  type Customer,
  type Document,
} from "./types";
import { collectedSalesTotal } from "./vat-regime";

const IMPORT_PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Negocio histórico",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  city: "Madrid",
  postalCode: "28001",
};

function invoice(
  status: Document["status"],
  total = 100,
  extra: Partial<Document> = {},
): Document {
  const {
    rectifiedById,
    receiptDocumentId,
    documentLifecycle,
    integrityLock,
    ...fiscalExtra
  } = extra;
  const draft: Document = {
    id: "1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-09",
    client: { name: "Ana", firstName: "Ana", lastName: "" },
    items: [
      {
        id: "l1",
        description: "Servicio",
        quantity: 1,
        unitPrice: total / 1.21,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    createdAt: "2026-06-09",
    updatedAt: "2026-06-09",
    ...fiscalExtra,
  };
  if (status === "borrador") return draft;
  const issued = draft.rectification
    ? materializeRectificationDocument(
        { ...draft, status },
        IMPORT_PROFILE,
        "2026-06-09T10:00:00.000Z",
      )
    : issueDocument(draft, IMPORT_PROFILE, "2026-06-09T10:00:00.000Z");
  return {
    ...issued,
    status,
    rectifiedById,
    receiptDocumentId,
    documentLifecycle: documentLifecycle ?? "issued",
    integrityLock: integrityLock ?? "locked",
  };
}

function attestedHistoricalReceiptPair(): Document[] {
  const invoiceId = "pcfacturacion:factura:F-2024-0001";
  const receiptId = "pcfacturacion:recibo:R-2024-0001";
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
  const historicalInvoice: Document = {
    ...invoice("borrador", 121, {
      id: invoiceId,
      number: "F-2024-0001",
      date: "2024-04-01",
    }),
    status: "pagado",
    issuer: captureIssuerSnapshot(IMPORT_PROFILE, "2024-04-01T10:00:00.000Z"),
    documentLifecycle: "issued",
    integrityLock: "locked",
    receiptDocumentId: receiptId,
    ...rolloutResidue,
  };
  const historicalReceipt: Document = {
    ...invoice("borrador", 121, {
      id: receiptId,
      type: "recibo",
      number: "R-2024-0001",
      date: "2024-04-02",
    }),
    status: "pagado",
    issuer: captureIssuerSnapshot(IMPORT_PROFILE, "2024-04-02T10:00:00.000Z"),
    documentLifecycle: "issued",
    integrityLock: "locked",
    sourceDocumentId: invoiceId,
    ...rolloutResidue,
  };
  const data = {
    ...EMPTY_DATA,
    profile: IMPORT_PROFILE,
    documents: [historicalInvoice, historicalReceipt],
    snapshotIntegrityVersion: 1 as const,
  };
  const result = applyLegacyImportRepair(
    data,
    buildLegacyImportRepairPreview(data),
    "2026-07-13T08:00:00.000Z",
  );
  if (result.status !== "applied") {
    throw new Error(`No se pudo atestar el recibo historico: ${result.reason}`);
  }
  return result.data.documents;
}

function attestedHistoricalCancellationPair(customerId: string): Document[] {
  const originalId = "pcfacturacion:factura:F-2024-0002";
  const rectificationId = "pcfacturacion:factura:FR-2024-0001";
  const originalDate = "2024-04-01";
  const rectificationDate = "2024-04-02";
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
    ...invoice("borrador", 121, {
      id: originalId,
      number: "F-2024-0002",
      date: originalDate,
      customerId,
    }),
    status: "anulada",
    issuer: captureIssuerSnapshot(
      IMPORT_PROFILE,
      `${originalDate}T10:00:00.000Z`,
    ),
    documentLifecycle: "canceled",
    integrityLock: "locked",
    rectifiedById: rectificationId,
    ...rolloutResidue,
  };
  const rectification: Document = {
    ...invoice("borrador", -121, {
      id: rectificationId,
      number: "FR-2024-0001",
      date: rectificationDate,
      customerId,
      rectification: {
        originalDocumentId: originalId,
        originalNumber: original.number,
        originalDate,
        reason: "Anulación histórica",
        type: "anulacion",
      },
    }),
    status: "pagado",
    issuer: captureIssuerSnapshot(
      IMPORT_PROFILE,
      `${rectificationDate}T10:00:00.000Z`,
    ),
    documentLifecycle: "issued",
    integrityLock: "locked",
    ...rolloutResidue,
  };
  const data = {
    ...EMPTY_DATA,
    profile: IMPORT_PROFILE,
    documents: [original, rectification],
    snapshotIntegrityVersion: 1 as const,
  };
  const result = applyLegacyImportRepair(
    data,
    buildLegacyImportRepairPreview(data),
    "2026-07-13T08:00:00.000Z",
  );
  if (result.status !== "applied") {
    throw new Error(`No se pudo atestar la anulación histórica: ${result.reason}`);
  }
  return result.data.documents;
}

describe("income helpers", () => {
  it("cuenta facturas y recibos manuales cobrados", () => {
    const docs: Document[] = [
      invoice("pagado", 121, { id: "1", number: "F-2026-0001" }),
      invoice("pagado", 60, { id: "2", type: "recibo", number: "R-1" }),
      invoice("enviado", 200, { id: "3", number: "F-2026-0003" }),
    ];
    expect(collectedIncome(docs)).toBeCloseTo(181, 0);
    expect(isCollectedDocument(docs[1])).toBe(true);
  });

  it("no duplica ingresos con recibo vinculado a factura", () => {
    const paidInvoice = invoice("pagado", 121, { id: "inv-1" });
    const autoReceipt = invoice("pagado", 121, {
      id: "r-1",
      type: "recibo" as const,
      number: "R-2026-0001",
      sourceDocumentId: "inv-1",
      receiptDocumentId: undefined,
    });
    expect(collectedIncome([paidInvoice, autoReceipt])).toBeCloseTo(121, 0);
  });

  it("no duplica un recibo legacy referido solo desde la factura", () => {
    const paidInvoice = invoice("pagado", 121, {
      id: "inv-legacy",
      receiptDocumentId: "receipt-legacy",
    });
    const legacyReceipt: Document = {
      ...invoice("pagado", 121, {
        id: "receipt-legacy",
        type: "recibo",
        number: "R-2026-0001",
      }),
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_relationship_invalid"],
      },
    };

    expect(collectedIncome([paidInvoice, legacyReceipt])).toBeCloseTo(121, 0);
    expect(isCollectedDocument(legacyReceipt)).toBe(false);
  });

  it("no duplica ingresos al confirmar una pareja histórica V3 factura-recibo", () => {
    const documents = attestedHistoricalReceiptPair();
    const [historicalInvoice, historicalReceipt] = documents;

    expect(
      documents.map((document) => document.legacyImportAttestation),
    ).toEqual([
      expect.objectContaining({ schemaVersion: 3 }),
      expect.objectContaining({ schemaVersion: 3 }),
    ]);
    expect(collectedIncome(documents)).toBeCloseTo(121, 2);
    expect(pendingCollection(documents)).toBe(0);
    expect(isCollectedDocument(historicalInvoice)).toBe(true);
    expect(isCollectedDocument(historicalReceipt)).toBe(false);
  });

  it("neta a cero una anulación histórica V3 pagada en ingresos y cliente", () => {
    const customer: Customer = {
      id: "legacy-customer",
      firstName: "Ana",
      lastName: "",
      name: "Ana",
      createdAt: "2024-04-01T00:00:00.000Z",
      updatedAt: "2024-04-01T00:00:00.000Z",
    };
    const documents = attestedHistoricalCancellationPair(customer.id);

    expect(
      documents.map((document) => document.legacyImportAttestation),
    ).toEqual([
      expect.objectContaining({ schemaVersion: 3 }),
      expect.objectContaining({ schemaVersion: 3 }),
    ]);
    expect(collectedIncome(documents)).toBe(0);
    expect(isCollectedDocument(documents[1])).toBe(false);
    expect(customerInvoicedTotal(documents, customer)).toBe(0);
    expect(
      buildCustomerInvoicedTotals([customer], documents).get(customer.id),
    ).toBe(0);
  });

  it("cuenta el cobro de un histórico importado atestado desde su snapshot", () => {
    const historical = attestNewImportedDocument(
      {
        ...invoice("borrador", 121, {
          id: "pcfacturacion:factura:F-2024-0001",
          number: "F-2024-0001",
          issuer: captureIssuerSnapshot(
            IMPORT_PROFILE,
            "2024-04-01T10:00:00.000Z",
          ),
          client: {
            name: "Cliente histórico",
            nif: "B12345678",
            address: "Calle Cliente 2",
            city: "Madrid",
            postalCode: "28002",
          },
        }),
        status: "pagado",
        documentLifecycle: "issued",
        integrityLock: "locked",
      },
      IMPORT_PROFILE,
      "pcfacturacion",
      "2026-07-12T22:00:00.000Z",
    );

    expect(collectedIncome([historical])).toBeCloseTo(121, 2);
    expect(isCollectedDocument(historical)).toBe(true);

    const appIssuedWithoutEvidence = {
      ...historical,
      id: "app-issued-without-evidence",
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      legacyImportAttestation: undefined,
      legacyImportProvenance: undefined,
      snapshotIntegrity: undefined,
    };
    expect(collectedIncome([appIssuedWithoutEvidence])).toBe(0);
    expect(
      pendingCollection([{ ...appIssuedWithoutEvidence, status: "enviado" }]),
    ).toBe(0);
    expect(canMarkAsCollected(historical)).toBe(false);

    const rawIssuedWithoutAnySignal: Document = {
      ...appIssuedWithoutEvidence,
      documentLifecycle: undefined,
      integrityLock: undefined,
      issuedAt: undefined,
    };
    expect(collectedIncome([rawIssuedWithoutAnySignal])).toBe(0);
    expect(pendingCollection([rawIssuedWithoutAnySignal])).toBe(0);
  });

  it("cuenta 121 euros de un PCF histórico v2 aceptado aunque falten datos formales", () => {
    const historical = attestNewImportedDocument(
      {
        ...invoice("borrador", 121, {
          id: "pcfacturacion:factura:F-2024-0002",
          number: "F-2024-0002",
          date: "2024-04-02",
          client: {
            name: "Cliente histórico",
          },
          issuer: {
            ...captureIssuerSnapshot(
              IMPORT_PROFILE,
              "2024-04-02T10:00:00.000Z",
            ),
            name: "",
            nif: "",
            address: "",
            postalCode: "",
            city: "",
          },
          items: [
            {
              id: "legacy-line-1",
              description: "",
              quantity: 1,
              unitPrice: 100,
              ivaPercent: 21,
            },
          ],
        }),
        status: "pagado",
        documentLifecycle: "issued",
        integrityLock: "locked",
      },
      IMPORT_PROFILE,
      "pcfacturacion",
      "2026-07-13T07:30:00.000Z",
    );

    expect(historical.legacyImportAttestation?.schemaVersion).toBe(2);
    expect(collectedIncome([historical])).toBeCloseTo(121, 2);
    expect(isCollectedDocument(historical)).toBe(true);
    expect(canMarkAsCollected(historical)).toBe(false);
    expect(collectedIncome([historical, historical])).toBe(0);
    expect(
      collectedSalesTotal([historical, historical], false, isCollectedDocument),
    ).toBe(0);
    expect(historical.snapshotIntegrity).toBeUndefined();
  });

  it("mantiene pendiente un PCF V2 incompleto positivo y no convierte un abono en deuda", () => {
    const historical = (id: string, unitPrice: number) =>
      attestNewImportedDocument(
        {
          ...invoice("borrador", 121, {
            id,
            number: id.endsWith("3") ? "F-2024-0003" : "A-2024-0001",
            date: "2024-04-03",
            client: { name: "Cliente histórico" },
            issuer: {
              ...captureIssuerSnapshot(
                IMPORT_PROFILE,
                "2024-04-03T10:00:00.000Z",
              ),
              name: "",
              nif: "",
              address: "",
              postalCode: "",
              city: "",
            },
            items: [
              {
                id: "legacy-pending-line",
                description: "",
                quantity: 1,
                unitPrice,
                ivaPercent: 21,
              },
            ],
          }),
          status: "enviado" as const,
          documentLifecycle: "issued" as const,
          integrityLock: "locked" as const,
        },
        IMPORT_PROFILE,
        "pcfacturacion",
        "2026-07-13T07:30:00.000Z",
      );
    const pending = historical("pcfacturacion:factura:F-2024-0003", 100);
    const historicalCredit = historical(
      "pcfacturacion:factura:A-2024-0001",
      -100,
    );

    expect(isPendingInvoicePayment(pending)).toBe(true);
    expect(pendingCollection([pending])).toBe(121);
    expect(pendingCollection([pending, pending])).toBe(0);
    expect(collectedIncome([pending])).toBe(0);
    expect(isPendingInvoicePayment(historicalCredit)).toBe(false);
    expect(pendingCollection([historicalCredit])).toBe(0);
  });

  it("excluye anuladas y rectificadas del cobro", () => {
    expect(
      canMarkAsCollected(invoice("enviado", 100, { rectifiedById: "fr1" })),
    ).toBe(false);
    expect(canMarkAsCollected(invoice("anulada"))).toBe(false);
  });

  it("calcula pendiente solo con facturas emitidas", () => {
    const docs = [
      invoice("enviado", 100, { id: "pending", number: "F-2026-0001" }),
      invoice("borrador", 50, { id: "draft", number: "F-2026-0002" }),
      invoice("pagado", 30, { id: "paid", number: "F-2026-0003" }),
    ];
    expect(pendingCollection(docs)).toBeCloseTo(100, 0);
  });

  it("incluye rectificativas vigentes positivas pendientes de cobro", () => {
    const original = invoice("rectificada", 121, {
      id: "original",
      rectifiedById: "rect-1",
    });
    const rectificativa = invoice("enviado", 60.5, {
      id: "rect-1",
      number: "FR-2026-0001",
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
        originalDate: original.date,
        reason: "Corrección de datos",
        type: "correccion",
      },
    });

    expect(pendingCollection([original, rectificativa])).toBeCloseTo(60.5, 2);
  });

  it("no trata una rectificativa negativa como pendiente de cobro", () => {
    const rectificativaNegativa = invoice("enviado", -121, {
      id: "rect-1",
      number: "FR-2026-0001",
      rectification: {
        originalDocumentId: "original",
        originalNumber: "F-2026-0001",
        originalDate: "2026-06-09",
        reason: "Anulación total",
        type: "anulacion",
      },
    });

    expect(pendingCollection([rectificativaNegativa])).toBe(0);
  });

  it("vuelve a enviado al desmarcar cobro", () => {
    expect(statusAfterUnmarkingCollection(invoice("pagado"))).toBe("enviado");
  });

  it("usa el total histórico sellado para cobrado y pendiente", () => {
    const issued = issueDocument(
      invoice("borrador", 121),
      IMPORT_PROFILE,
      "2026-06-09T10:00:00.000Z",
    );
    const drifted = {
      ...issued,
      items: [{ ...issued.items[0], unitPrice: 999 }],
    };

    expect(pendingCollection([drifted])).toBeCloseTo(121, 2);
    expect(collectedIncome([{ ...drifted, status: "pagado" }])).toBeCloseTo(
      121,
      2,
    );
  });
});
