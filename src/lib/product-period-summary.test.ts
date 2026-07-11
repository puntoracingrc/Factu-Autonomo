import { describe, expect, it } from "vitest";
import {
  buildProductPeriodSummary,
  filterDocumentsByProductPeriod,
  filterExpensesByProductPeriod,
  getDefaultProductPeriod,
  type ProductPeriodSelection,
} from "./product-period-summary";
import { EMPTY_DATA, type Document, type Expense } from "./types";

const NOW = "2026-06-28T10:00:00.000Z";

function invoice(overrides: Partial<Document> = {}): Document {
  return {
    id: overrides.id ?? "invoice",
    type: "factura",
    number: overrides.number ?? "F-2026-0001",
    date: overrides.date ?? "2026-06-28",
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
    date: overrides.date ?? "2026-06-28",
    supplierName: overrides.supplierName ?? "Proveedor Demo",
    description: overrides.description ?? "Material",
    amount: overrides.amount ?? 50,
    ivaPercent: overrides.ivaPercent ?? 21,
    category: overrides.category ?? "Material",
    paymentMethod: overrides.paymentMethod ?? "Tarjeta",
    createdAt: overrides.createdAt ?? NOW,
    ...overrides,
  };
}

const june2026: ProductPeriodSelection = {
  kind: "month",
  year: 2026,
  month: 6,
  quarter: 2,
};

describe("product period summary", () => {
  it("filtra facturas por mes y excluye las de fuera", () => {
    const documents = [
      invoice({ id: "june", date: "2026-06-28" }),
      invoice({ id: "may", date: "2026-05-31" }),
    ];

    expect(filterDocumentsByProductPeriod(documents, june2026).map((d) => d.id))
      .toEqual(["june"]);
  });

  it("filtra facturas por año", () => {
    const summary = buildProductPeriodSummary(
      {
        ...EMPTY_DATA,
        documents: [
          invoice({ id: "current", date: "2026-02-10" }),
          invoice({ id: "previous", date: "2025-12-31" }),
        ],
      },
      { kind: "year", year: 2026, month: 6, quarter: 2 },
    );

    expect(summary.invoicesCount).toBe(1);
    expect(summary.totalBilledIssued).toBe(121);
  });

  it("filtra gastos por mes", () => {
    const expenses = [
      expense({ id: "june", date: "2026-06-02" }),
      expense({ id: "july", date: "2026-07-02" }),
    ];

    expect(filterExpensesByProductPeriod(expenses, june2026).map((e) => e.id))
      .toEqual(["june"]);
  });

  it("devuelve ceros para un periodo vacio", () => {
    const summary = buildProductPeriodSummary(
      {
        ...EMPTY_DATA,
        documents: [invoice({ date: "2025-01-01" })],
        expenses: [expense({ date: "2025-01-01" })],
      },
      june2026,
    );

    expect(summary.invoicesCount).toBe(0);
    expect(summary.expensesCount).toBe(0);
    expect(summary.totalBilledIssued).toBe(0);
    expect(summary.totalExpenses).toBe(0);
  });

  it("calcula trimestre y no suma presupuestos como ingresos", () => {
    const summary = buildProductPeriodSummary(
      {
        ...EMPTY_DATA,
        documents: [
          quote({ id: "quote", date: "2026-04-01" }),
          invoice({ id: "invoice", date: "2026-06-30" }),
          invoice({ id: "outside", date: "2026-07-01" }),
        ],
      },
      { kind: "quarter", year: 2026, month: 6, quarter: 2 },
    );

    expect(summary.quotesCount).toBe(1);
    expect(summary.invoicesCount).toBe(1);
    expect(summary.business.issuedInvoicesCount).toBe(1);
    expect(summary.totalBilledIssued).toBe(121);
  });

  it("muestra el reemplazo rectificativo positivo una sola vez en el periodo", () => {
    const original = invoice({
      id: "period-original",
      date: "2026-06-10",
      status: "rectificada",
      rectifiedById: "period-correction",
    });
    const correction = invoice({
      id: "period-correction",
      number: "FR-2026-0001",
      date: "2026-06-12",
      items: [
        {
          id: "period-correction-line",
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

    const summary = buildProductPeriodSummary(
      {
        ...EMPTY_DATA,
        documents: [original, correction],
      },
      june2026,
    );

    expect(summary.business.issuedInvoicesCount).toBe(1);
    expect(summary.totalBilledIssued).toBe(60.5);
    expect(summary.salesIvaEstimated).toBe(10.5);
    expect(summary.totalPendingCollection).toBe(60.5);
  });

  it("calcula cobrado, pendiente, gastos, IVA estimado y balance", () => {
    const summary = buildProductPeriodSummary(
      {
        ...EMPTY_DATA,
        documents: [
          invoice({
            id: "paid",
            status: "pagado",
            paymentStatus: "paid",
          }),
          invoice({
            id: "pending",
            items: [
              {
                id: "line-2",
                description: "Servicio 2",
                quantity: 1,
                unitPrice: 200,
                ivaPercent: 21,
              },
            ],
          }),
          invoice({
            id: "draft",
            status: "borrador",
            documentLifecycle: "draft",
          }),
        ],
        expenses: [expense()],
      },
      june2026,
    );

    expect(summary.totalBilledIssued).toBe(363);
    expect(summary.totalCollectedLocal).toBe(121);
    expect(summary.totalPendingCollection).toBe(242);
    expect(summary.totalExpenses).toBe(60.5);
    expect(summary.salesIvaEstimated).toBe(63);
    expect(summary.expenseIvaEstimated).toBe(10.5);
    expect(summary.balanceEstimated).toBe(302.5);
  });

  it("imputa compra y abono por su propia fecha y los compensa en el año", () => {
    const data = {
      ...EMPTY_DATA,
      expenses: [
        expense({ id: "purchase", date: "2026-01-15" }),
        expense({ id: "credit", date: "2026-04-15", amount: -50 }),
      ],
    };
    const firstQuarter = buildProductPeriodSummary(data, {
      kind: "quarter",
      year: 2026,
      month: 1,
      quarter: 1,
    });
    const secondQuarter = buildProductPeriodSummary(data, {
      kind: "quarter",
      year: 2026,
      month: 4,
      quarter: 2,
    });
    const year = buildProductPeriodSummary(data, {
      kind: "year",
      year: 2026,
      month: 1,
      quarter: 1,
    });

    expect(firstQuarter).toMatchObject({
      totalExpenses: 60.5,
      expenseIvaEstimated: 10.5,
      balanceEstimated: -60.5,
    });
    expect(secondQuarter).toMatchObject({
      totalExpenses: -60.5,
      expenseIvaEstimated: -10.5,
      balanceEstimated: 60.5,
    });
    expect(year).toMatchObject({
      totalExpenses: 0,
      expenseIvaEstimated: 0,
      balanceEstimated: 0,
    });
  });

  it("evita NaN y conserva un periodo por defecto estable", () => {
    const summary = buildProductPeriodSummary(
      {
        ...EMPTY_DATA,
        documents: [
          invoice({
            items: [
              {
                id: "bad-line",
                description: "Dato raro",
                quantity: Number.NaN,
                unitPrice: Number.NaN,
                ivaPercent: Number.NaN,
              },
            ],
          }),
        ],
        expenses: [expense({ amount: Number.NaN, ivaPercent: Number.NaN })],
      },
      getDefaultProductPeriod(new Date("2026-06-28T10:00:00.000Z")),
    );

    expect(Number.isNaN(summary.totalBilledIssued)).toBe(false);
    expect(Number.isNaN(summary.totalExpenses)).toBe(false);
    expect(summary.selection.kind).toBe("year");
  });
});
