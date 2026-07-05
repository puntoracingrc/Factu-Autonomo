import { describe, expect, it } from "vitest";
import {
  EMPTY_DATA,
  type AppData,
  type Document,
  type Expense,
  type RecurringExpense,
} from "@/lib/types";
import { buildRentabilidadRealWorkProfitabilityInputFromExistingData } from "./work-profitability-builder";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function baseAppData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...deepClone(EMPTY_DATA),
    ...overrides,
    profile: {
      ...deepClone(EMPTY_DATA.profile),
      ...overrides.profile,
    },
    documents: overrides.documents ?? [],
    expenses: overrides.expenses ?? [],
    recurringExpenses: overrides.recurringExpenses ?? [],
    userReminders: overrides.userReminders ?? [],
    suppliers: overrides.suppliers ?? [],
    products: overrides.products ?? [],
    customers: overrides.customers ?? [],
    counters: {
      ...EMPTY_DATA.counters,
      ...overrides.counters,
    },
  };
}

function documentFixture(overrides: Partial<Document>): Document {
  return {
    id: "invoice_1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-01",
    client: {
      name: "Cliente Demo",
    },
    items: [
      {
        id: "line_1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 1000,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function expenseFixture(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense_1",
    date: "2026-07-02",
    supplierName: "Proveedor Demo",
    description: "Material",
    amount: 120,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    createdAt: "2026-07-02T10:00:00.000Z",
    ...overrides,
  };
}

function recurringExpenseFixture(
  overrides: Partial<RecurringExpense> = {},
): RecurringExpense {
  return {
    id: "recurring_1",
    supplierName: "Software Demo",
    description: "Software mensual",
    amount: 50,
    ivaPercent: 21,
    category: "Software",
    paymentMethod: "Tarjeta",
    frequency: "monthly",
    dueTiming: {
      kind: "start_of_month",
    },
    duration: {
      kind: "indefinite",
    },
    startDate: "2026-07-01",
    enabled: true,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildRentabilidadRealWorkProfitabilityInputFromExistingData", () => {
  it("factura con sourceQuoteDocumentId encuentra presupuesto", () => {
    const quote = documentFixture({
      id: "quote_1",
      type: "presupuesto",
      number: "P-2026-0001",
    });
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
      sourceQuoteDocumentId: "quote_1",
    });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({ documents: [quote, invoice] }),
      { sourceDocumentId: "invoice_1" },
    );

    expect(input?.quoteSummary?.documentId).toBe("quote_1");
    expect(input?.invoiceSummary?.documentId).toBe("invoice_1");
    expect(input?.source.sourceQuoteDocumentId).toBe("quote_1");
  });

  it("presupuesto encuentra factura vinculada", () => {
    const quote = documentFixture({
      id: "quote_1",
      type: "presupuesto",
      number: "P-2026-0001",
    });
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
      sourceQuoteDocumentId: "quote_1",
    });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({ documents: [quote, invoice] }),
      { sourceDocumentId: "quote_1" },
    );

    expect(input?.quoteSummary?.documentId).toBe("quote_1");
    expect(input?.invoiceSummary?.documentId).toBe("invoice_1");
  });

  it("gastos con workDocumentId se incluyen como costes directos", () => {
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
    });
    const linkedExpense = expenseFixture({
      id: "expense_linked",
      workDocumentId: "invoice_1",
    });
    const unlinkedExpense = expenseFixture({
      id: "expense_unlinked",
    });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [invoice],
        expenses: [linkedExpense, unlinkedExpense],
      }),
      { sourceDocumentId: "invoice_1" },
    );

    expect(input?.directCosts.map((cost) => cost.id)).toEqual([
      "expense_linked",
    ]);
    expect(input?.linkedExpenses?.map((item) => item.expense.id)).toEqual([
      "expense_linked",
    ]);
    expect((input?.warnings ?? []).map((warning) => warning.code)).toContain(
      "unlinked_direct_costs_available",
    );
  });

  it("incluye gastos enlazados a factura y presupuesto relacionado", () => {
    const quote = documentFixture({
      id: "quote_1",
      type: "presupuesto",
      number: "P-2026-0001",
    });
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
      sourceQuoteDocumentId: "quote_1",
    });
    const quoteExpense = expenseFixture({
      id: "quote_expense",
      workDocumentId: "quote_1",
    });
    const invoiceExpense = expenseFixture({
      id: "invoice_expense",
      workDocumentId: "invoice_1",
    });

    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [quote, invoice],
        expenses: [quoteExpense, invoiceExpense],
      }),
      { sourceDocumentId: "invoice_1" },
    );

    expect(input?.directCosts.map((cost) => cost.id).sort()).toEqual([
      "invoice_expense",
      "quote_expense",
    ]);
  });

  it("evita duplicados en costes directos", () => {
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
    });
    const linkedExpense = expenseFixture({
      id: "expense_linked",
      workDocumentId: "invoice_1",
    });

    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [invoice],
        expenses: [linkedExpense],
      }),
      { sourceDocumentId: "invoice_1" },
    );

    expect(input?.directCosts).toHaveLength(1);
  });

  it("devuelve candidatos sin enlazar y advierte que no entran en cálculo", () => {
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
    });
    const candidate = expenseFixture({
      id: "candidate",
      origin: "scan",
    });

    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [invoice],
        expenses: [candidate],
      }),
      { sourceDocumentId: "invoice_1" },
    );

    expect(input?.candidateUnlinkedExpenses?.map((item) => item.expense.id))
      .toEqual(["candidate"]);
    expect((input?.warnings ?? []).map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "candidate_expenses_not_included",
        "unlinked_expenses_excluded_from_calculation",
      ]),
    );
  });

  it("gastos fijos existentes aparecen como candidatos", () => {
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
    });
    const fixedExpense = expenseFixture({
      id: "fixed_1",
      businessKind: "fixed",
      amount: 80,
    });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [invoice],
        expenses: [fixedExpense],
        recurringExpenses: [recurringExpenseFixture()],
      }),
      {
        sourceDocumentId: "invoice_1",
        fixedCostAllocationMethod: "monthly_jobs",
        monthlyJobs: 2,
      },
    );

    expect(input?.fixedCostCandidates.map((cost) => cost.id)).toEqual([
      "fixed_1",
      "recurring_1",
    ]);
    expect(input?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(130);
  });

  it("no muta AppData", () => {
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
    });
    const data = baseAppData({
      documents: [invoice],
      expenses: [expenseFixture({ workDocumentId: "invoice_1" })],
    });
    const before = deepClone(data);

    buildRentabilidadRealWorkProfitabilityInputFromExistingData(data, {
      sourceDocumentId: "invoice_1",
    });

    expect(data).toEqual(before);
  });

  it("genera warnings si no hay gastos enlazados", () => {
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
    });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({ documents: [invoice] }),
      { sourceDocumentId: "invoice_1" },
    );

    expect((input?.warnings ?? []).map((warning) => warning.code)).toContain(
      "no_linked_direct_costs",
    );
  });
});
