import { describe, expect, it } from "vitest";
import {
  buildProductBusinessSummary,
  isIssuedBusinessInvoice,
} from "./product-business-summary";
import { issueDocument, markDocumentPaid } from "./document-integrity";
import { withDocumentRelationshipIntegritySignals } from "./document-integrity/relationships";
import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type BusinessProfile,
  type Document,
  type Expense,
} from "./types";

const NOW = "2026-06-27T10:00:00.000Z";
const TEST_PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Autónomo Demo",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  postalCode: "28001",
  city: "Madrid",
};
const TEST_CLIENT = {
  name: "Cliente Demo",
  nif: "B12345678",
  address: "Calle Cliente 2",
  postalCode: "28002",
  city: "Madrid",
};

function invoice(overrides: Partial<Document> = {}): Document {
  return {
    id: overrides.id ?? "invoice",
    type: "factura",
    number: overrides.number ?? "F-2026-0001",
    date: overrides.date ?? "2026-06-27",
    client: overrides.client ?? { name: "Cliente Demo" },
    items: overrides.items ?? [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: overrides.status ?? "enviado",
    documentLifecycle: overrides.documentLifecycle ?? "issued",
    paymentStatus: overrides.paymentStatus ?? "pending",
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
    ...overrides,
  };
}

function quote(overrides: Partial<Document> = {}): Document {
  return {
    ...invoice({
      id: "quote",
      type: "presupuesto",
      number: "P-2026-0001",
      status: "enviado",
      documentLifecycle: "issued",
      ...overrides,
    }),
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: overrides.id ?? "expense",
    date: overrides.date ?? "2026-06-27",
    supplierName: overrides.supplierName ?? "Proveedor Demo",
    description: overrides.description ?? "Material",
    amount: overrides.amount ?? 100,
    ivaPercent: overrides.ivaPercent ?? 21,
    category: overrides.category ?? "Material",
    paymentMethod: overrides.paymentMethod ?? "Tarjeta",
    createdAt: overrides.createdAt ?? NOW,
    ...overrides,
  };
}

describe("buildProductBusinessSummary", () => {
  it("devuelve ceros con datos vacios", () => {
    const summary = buildProductBusinessSummary(EMPTY_DATA);

    expect(summary.customersCount).toBe(0);
    expect(summary.quotesCount).toBe(0);
    expect(summary.invoicesCount).toBe(0);
    expect(summary.totalBilledIssued).toBe(0);
    expect(summary.totalCollectedLocal).toBe(0);
    expect(summary.totalPendingCollection).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.salesIvaEstimated).toBe(0);
    expect(summary.expenseIvaEstimated).toBe(0);
    expect(summary.balanceEstimated).toBe(0);
  });

  it("no suma presupuestos como ingresos", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [quote()],
    });

    expect(summary.quotesCount).toBe(1);
    expect(summary.totalBilledIssued).toBe(0);
  });

  it("no suma facturas borrador como facturado emitido", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [
        invoice({
          id: "draft",
          status: "borrador",
          documentLifecycle: "draft",
          paymentStatus: "pending",
        }),
      ],
    });

    expect(summary.draftInvoicesCount).toBe(1);
    expect(summary.totalBilledIssued).toBe(0);
  });

  it("suma facturas emitidas como facturado", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [invoice()],
    });

    expect(summary.issuedInvoicesCount).toBe(1);
    expect(summary.totalBilledIssued).toBe(121);
  });

  it("suma facturas cobradas como cobrado localmente", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [
        invoice({
          id: "paid",
          status: "pagado",
          paymentStatus: "paid",
        }),
      ],
    });

    expect(summary.collectedInvoicesCount).toBe(1);
    expect(summary.totalCollectedLocal).toBe(121);
  });

  it("suma facturas emitidas no cobradas como pendiente", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [invoice()],
    });

    expect(summary.pendingInvoicesCount).toBe(1);
    expect(summary.totalPendingCollection).toBe(121);
  });

  it("usa la rectificativa positiva vigente en facturado, IVA y pendiente", () => {
    const original = invoice({
      id: "original",
      status: "rectificada",
      rectifiedById: "rect-1",
    });
    const rectification = invoice({
      id: "rect-1",
      number: "FR-2026-0001",
      items: [
        {
          id: "line-rect",
          description: "Corrección",
          quantity: 1,
          unitPrice: 50,
          ivaPercent: 21,
        },
      ],
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
        originalDate: original.date,
        reason: "Corrección de datos",
        type: "correccion",
      },
    });

    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [original, rectification],
    });

    expect(isIssuedBusinessInvoice(original)).toBe(false);
    expect(isIssuedBusinessInvoice(rectification)).toBe(true);
    expect(summary.issuedInvoicesCount).toBe(1);
    expect(summary.totalBilledIssued).toBe(60.5);
    expect(summary.salesIvaEstimated).toBe(10.5);
    expect(summary.balanceEstimated).toBe(60.5);
    expect(summary.pendingInvoicesCount).toBe(1);
    expect(summary.totalPendingCollection).toBe(60.5);
    expect(summary.pendingInvoices.map((document) => document.id)).toEqual([
      "rect-1",
    ]);
  });

  it("mantiene fuera del facturado las anulaciones y rectificativas bloqueadas", () => {
    const cancellation = invoice({
      id: "rect-cancellation",
      number: "FR-2026-0002",
      items: [
        {
          id: "line-cancellation",
          description: "Anulación",
          quantity: 1,
          unitPrice: -100,
          ivaPercent: 21,
        },
      ],
      rectification: {
        originalDocumentId: "original-cancellation",
        originalNumber: "F-2026-0002",
        originalDate: "2026-06-26",
        reason: "Anulación total",
        type: "anulacion",
      },
    });
    const blockedCorrection = invoice({
      id: "rect-blocked",
      number: "FR-2026-0003",
      rectification: {
        originalDocumentId: "original-blocked",
        originalNumber: "F-2026-0003",
        originalDate: "2026-06-26",
        reason: "Corrección de datos",
        type: "correccion",
      },
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_relationship_invalid"],
      },
    });

    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [cancellation, blockedCorrection],
    });

    expect(isIssuedBusinessInvoice(cancellation)).toBe(false);
    expect(isIssuedBusinessInvoice(blockedCorrection)).toBe(false);
    expect(summary.issuedInvoicesCount).toBe(0);
    expect(summary.totalBilledIssued).toBe(0);
    expect(summary.salesIvaEstimated).toBe(0);
  });

  it("cobra la corrección sellada con sus importes congelados aunque cambien las líneas vivas", () => {
    const originalIssued = issueDocument(
      invoice({
        id: "sealed-original",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        client: TEST_CLIENT,
      }),
      TEST_PROFILE,
      NOW,
    );
    const correctionIssued = issueDocument(
      invoice({
        id: "sealed-correction",
        number: "FR-2026-0004",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        client: TEST_CLIENT,
        items: [
          {
            id: "sealed-correction-line",
            description: "Corrección",
            quantity: 1,
            unitPrice: 50,
            ivaPercent: 21,
          },
        ],
        rectification: {
          originalDocumentId: originalIssued.id,
          originalNumber: originalIssued.number,
          originalDate: originalIssued.date,
          reason: "Corrección de datos",
          type: "correccion",
        },
      }),
      TEST_PROFILE,
      NOW,
    );
    const [original, checkedCorrection] =
      withDocumentRelationshipIntegritySignals([
        {
          ...originalIssued,
          status: "rectificada",
          rectifiedById: correctionIssued.id,
        },
        correctionIssued,
      ]);
    const paidCorrection = markDocumentPaid(checkedCorrection, NOW);
    const liveDrift: Document = {
      ...paidCorrection,
      items: paidCorrection.items.map((item) => ({
        ...item,
        unitPrice: 999,
      })),
      rectification: {
        ...paidCorrection.rectification!,
        type: "anulacion",
      },
    };

    expect(original.snapshotIntegrity).toBeUndefined();
    expect(checkedCorrection.snapshotIntegrity).toBeUndefined();

    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      profile: TEST_PROFILE,
      documents: [original, liveDrift],
    });

    expect(summary).toMatchObject({
      issuedInvoicesCount: 1,
      collectedInvoicesCount: 1,
      pendingInvoicesCount: 0,
      totalBilledIssued: 60.5,
      totalCollectedLocal: 60.5,
      totalPendingCollection: 0,
      salesIvaEstimated: 10.5,
    });
  });

  it("excluye una corrección en cuarentena de todos los importes de venta", () => {
    const quarantined = invoice({
      id: "rect-quarantined",
      number: "FR-2026-0005",
      status: "pagado",
      paymentStatus: "paid",
      rectification: {
        originalDocumentId: "original-quarantined",
        originalNumber: "F-2026-0005",
        originalDate: "2026-06-26",
        reason: "Corrección de datos",
        type: "correccion",
      },
      integrityQuarantine: {
        reason: "malformed_document",
        rawDocument: { id: "raw-quarantined" },
      },
    });

    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [quarantined],
    });

    expect(isIssuedBusinessInvoice(quarantined)).toBe(false);
    expect(summary).toMatchObject({
      issuedInvoicesCount: 0,
      collectedInvoicesCount: 0,
      totalBilledIssued: 0,
      totalCollectedLocal: 0,
      salesIvaEstimated: 0,
    });
  });

  it("suma gastos registrados", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      expenses: [expense()],
    });

    expect(summary.totalExpenses).toBe(121);
  });

  it("propaga el recargo al Panel sin tratar su IVA como recuperable", () => {
    const surcharge = expense({
      businessKind: "purchase_invoice",
      providerSummary: {
        status: "pending_original",
        summaryId: "summary-re",
        importedAt: NOW,
        summaryInvoiceTotal: 126.2,
        summaryIvaPercent: 21,
        summaryIvaAmount: 21,
        summaryRecargoPercent: 5.2,
        summaryRecargoAmount: 5.2,
      },
    });
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      expenses: [surcharge],
    });

    expect(summary).toMatchObject({
      totalExpenses: 126.2,
      totalPurchaseExpenses: 126.2,
      expenseIvaEstimated: 0,
      balanceEstimated: -126.2,
    });
  });

  it("compensa una compra y su abono en gasto, IVA y balances", () => {
    const purchase = expense({
      id: "purchase",
      businessKind: "purchase_invoice",
    });
    const credit = expense({
      id: "credit",
      amount: -100,
      businessKind: "purchase_invoice",
    });
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      expenses: [purchase, credit],
    });

    expect(summary).toMatchObject({
      totalExpenses: 0,
      totalPurchaseExpenses: 0,
      expenseIvaEstimated: 0,
      balanceEstimated: 0,
      cashBalanceEstimated: 0,
    });
  });

  it("conserva firmado un abono mixto aislado", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      expenses: [
        expense({
          amount: -200,
          businessKind: "purchase_invoice",
          purchaseLines: [
            {
              id: "credit-21",
              description: "Material general",
              quantity: -1,
              unitPrice: 100,
              total: -100,
              ivaPercent: 21,
            },
            {
              id: "credit-10",
              description: "Material reducido",
              quantity: -1,
              unitPrice: 100,
              total: -100,
              ivaPercent: 10,
            },
          ],
        }),
      ],
    });

    expect(summary).toMatchObject({
      totalExpenses: -231,
      totalPurchaseExpenses: -231,
      expenseIvaEstimated: -31,
      balanceEstimated: 231,
      cashBalanceEstimated: 231,
    });
  });

  it("calcula IVA estimado de facturas emitidas", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [invoice()],
    });

    expect(summary.salesIvaEstimated).toBe(21);
  });

  it("calcula IVA estimado de gastos", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      expenses: [expense()],
    });

    expect(summary.expenseIvaEstimated).toBe(21);
  });

  it("conserva el coste no deducible y lo excluye del IVA orientativo", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      expenses: [expense({ deductibility: "non_deductible" })],
    });

    expect(summary.totalExpenses).toBe(121);
    expect(summary.expenseIvaEstimated).toBe(0);
    expect(summary.balanceEstimated).toBe(-121);
  });

  it("evita NaN e importes negativos en totales", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [
        invoice({
          id: "bad-invoice",
          items: [
            {
              id: "bad-line",
              description: "Dato importado raro",
              quantity: Number.NaN,
              unitPrice: -100,
              ivaPercent: Number.NaN,
            },
          ],
        }),
      ],
      expenses: [expense({ amount: Number.NaN, ivaPercent: Number.NaN })],
    });

    expect(summary.totalBilledIssued).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(Number.isNaN(summary.balanceEstimated)).toBe(false);
  });

  it("calcula balance estimado con facturado emitido menos gastos", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [invoice()],
      expenses: [expense({ amount: 20, ivaPercent: 0 })],
    });

    expect(summary.balanceEstimated).toBe(101);
    expect(summary.cashBalanceEstimated).toBe(-20);
  });

  it("excluye rectificadas y anuladas del resumen de negocio", () => {
    const active = invoice({ id: "active" });
    const rectified = invoice({ id: "rectified", rectifiedById: "rect" });
    const canceled = invoice({ id: "canceled", status: "anulada" });

    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      documents: [active, rectified, canceled],
    });

    expect(isIssuedBusinessInvoice(active)).toBe(true);
    expect(isIssuedBusinessInvoice(rectified)).toBe(false);
    expect(isIssuedBusinessInvoice(canceled)).toBe(false);
    expect(summary.issuedInvoicesCount).toBe(1);
    expect(summary.totalBilledIssued).toBe(121);
  });
});
