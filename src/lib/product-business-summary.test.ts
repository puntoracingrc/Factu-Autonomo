import { describe, expect, it } from "vitest";
import {
  buildProductBusinessSummary,
  isIssuedBusinessInvoice,
} from "./product-business-summary";
import { EMPTY_DATA, type Document, type Expense } from "./types";

const NOW = "2026-06-27T10:00:00.000Z";

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

  it("incluye rectificativas vigentes positivas en pendientes de cobro", () => {
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

    expect(summary.pendingInvoicesCount).toBe(1);
    expect(summary.totalPendingCollection).toBe(60.5);
    expect(summary.pendingInvoices.map((document) => document.id)).toEqual([
      "rect-1",
    ]);
  });

  it("suma gastos registrados", () => {
    const summary = buildProductBusinessSummary({
      ...EMPTY_DATA,
      expenses: [expense()],
    });

    expect(summary.totalExpenses).toBe(121);
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
