import { describe, expect, it } from "vitest";
import {
  EMPTY_DATA,
  type AppData,
  type Document,
  type Expense,
  type RecurringExpense,
} from "@/lib/types";
import { calculateRentabilidadRealWorkProfitability } from "./work-profitability-calculator";
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

  it("una compra y su abono enlazados se compensan sin perder el signo", () => {
    const invoice = documentFixture({ id: "invoice_1", type: "factura" });
    const purchase = expenseFixture({
      id: "expense_purchase",
      amount: 100,
      ivaPercent: 21,
      workDocumentId: invoice.id,
    });
    const credit = expenseFixture({
      id: "expense_credit",
      amount: -100,
      ivaPercent: 21,
      workDocumentId: invoice.id,
    });

    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({ documents: [invoice], expenses: [purchase, credit] }),
      { sourceDocumentId: invoice.id },
    );
    const result = input
      ? calculateRentabilidadRealWorkProfitability(input)
      : null;

    expect(input?.directCosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "expense_purchase",
          amount: 100,
          ivaAmount: 21,
          total: 121,
        }),
        expect.objectContaining({
          id: "expense_credit",
          amount: -100,
          ivaAmount: -21,
          total: -121,
        }),
      ]),
    );
    expect(result).toMatchObject({
      totalDirectCosts: 0,
      grossMargin: 1000,
      operatingProfit: 1000,
      estimatedIrpfBase: 1000,
    });
  });

  it("permite aplicar solo parte de un gasto enlazado al trabajo", () => {
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
    });
    const linkedExpense = expenseFixture({
      id: "expense_linked",
      amount: 200,
      ivaPercent: 21,
      workDocumentId: "invoice_1",
    });

    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [invoice],
        expenses: [linkedExpense],
      }),
      {
        sourceDocumentId: "invoice_1",
        directCostAmountOverrides: {
          expense_linked: 50,
        },
      },
    );

    expect(input?.directCosts).toHaveLength(1);
    expect(input?.directCosts[0]).toMatchObject({
      id: "expense_linked",
      amount: 50,
      ivaAmount: 10.5,
      total: 60.5,
      originalAmount: 200,
      originalIvaAmount: 42,
      originalTotal: 242,
      appliedAmountOverride: 50,
    });
  });

  it("conserva 100 + 21 como coste directo no deducible sin reducir IRPF", () => {
    const invoice = documentFixture({ id: "invoice_1", type: "factura" });
    const linkedExpense = expenseFixture({
      id: "expense_non_deductible",
      amount: 100,
      ivaPercent: 21,
      deductibility: "non_deductible",
      workDocumentId: "invoice_1",
    });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({ documents: [invoice], expenses: [linkedExpense] }),
      {
        sourceDocumentId: "invoice_1",
        irpfProvisionPercentage: 20,
      },
    );

    expect(input?.directCosts[0]).toMatchObject({
      amount: 121,
      fiscalDeductible: false,
      ivaAmount: 0,
      total: 121,
    });
    const result = input
      ? calculateRentabilidadRealWorkProfitability(input)
      : null;
    expect(result).toMatchObject({
      operatingProfit: 879,
      estimatedIrpfBase: 1000,
      estimatedIrpfProvision: 200,
      prudentAvailableCash: 679,
    });
  });

  it("un override parcial no vuelve deducible el coste no deducible", () => {
    const invoice = documentFixture({ id: "invoice_1", type: "factura" });
    const linkedExpense = expenseFixture({
      id: "expense_non_deductible",
      amount: 100,
      ivaPercent: 21,
      deductibility: "non_deductible",
      workDocumentId: "invoice_1",
    });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({ documents: [invoice], expenses: [linkedExpense] }),
      {
        sourceDocumentId: "invoice_1",
        irpfProvisionPercentage: 20,
        directCostAmountOverrides: { expense_non_deductible: 60.5 },
      },
    );

    expect(input?.directCosts[0]).toMatchObject({
      amount: 60.5,
      fiscalDeductible: false,
      ivaAmount: 0,
      originalAmount: 121,
      originalIvaAmount: 0,
      originalTotal: 121,
      appliedAmountOverride: 60.5,
    });
    const result = input
      ? calculateRentabilidadRealWorkProfitability(input)
      : null;
    expect(result).toMatchObject({
      operatingProfit: 939.5,
      estimatedIrpfBase: 1000,
      estimatedIrpfProvision: 200,
      prudentAvailableCash: 739.5,
    });
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

  it("usa la rectificativa vigente y mantiene gastos enlazados a la factura original", () => {
    const original = documentFixture({
      id: "invoice_original",
      type: "factura",
      number: "F-2026-0001",
      status: "rectificada",
      rectifiedById: "invoice_rect",
    });
    const rectificativa = documentFixture({
      id: "invoice_rect",
      type: "factura",
      number: "FR-2026-0001",
      items: [
        {
          id: "line_rect",
          description: "Servicio corregido",
          quantity: 1,
          unitPrice: 800,
          ivaPercent: 21,
        },
      ],
      rectification: {
        originalDocumentId: "invoice_original",
        originalNumber: "F-2026-0001",
        originalDate: "2026-07-01",
        reason: "Error en datos",
        type: "correccion",
      },
    });
    const linkedToOriginal = expenseFixture({
      id: "expense_original",
      amount: 120,
      workDocumentId: "invoice_original",
    });

    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [original, rectificativa],
        expenses: [linkedToOriginal],
      }),
      { sourceDocumentId: "invoice_rect" },
    );

    expect(input?.invoiceSummary?.documentId).toBe("invoice_rect");
    expect(input?.invoiceSummary?.subtotal).toBe(800);
    expect(input?.directCosts.map((cost) => cost.id)).toEqual([
      "expense_original",
    ]);
  });

  it("no calcula una factura original ya sustituida por rectificativa", () => {
    const original = documentFixture({
      id: "invoice_original",
      type: "factura",
      status: "rectificada",
      rectifiedById: "invoice_rect",
    });
    const rectificativa = documentFixture({
      id: "invoice_rect",
      type: "factura",
      number: "FR-2026-0001",
      rectification: {
        originalDocumentId: "invoice_original",
        originalNumber: "F-2026-0001",
        originalDate: "2026-07-01",
        reason: "Error en datos",
        type: "correccion",
      },
    });

    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({ documents: [original, rectificativa] }),
      { sourceDocumentId: "invoice_original" },
    );

    expect(input).toBeNull();
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
    expect(
      input?.fixedCostAllocationInput.fiscalDeductibleFixedCostsForPeriod,
    ).toBe(130);
  });

  it("separa la parte no deducible de los fijos seleccionados", () => {
    const invoice = documentFixture({ id: "invoice_1", type: "factura" });
    const deductible = recurringExpenseFixture({
      id: "fixed_deductible",
      amount: 100,
      ivaPercent: 0,
    });
    const nonDeductible = recurringExpenseFixture({
      id: "fixed_non_deductible",
      amount: 120,
      ivaPercent: 0,
      deductibility: "non_deductible",
    });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [invoice],
        recurringExpenses: [deductible, nonDeductible],
      }),
      {
        sourceDocumentId: "invoice_1",
        fixedCostAllocationMethod: "monthly_jobs",
        monthlyJobs: 2,
      },
    );

    expect(input?.fixedCostAllocationInput).toMatchObject({
      totalFixedCostsForPeriod: 220,
      fiscalDeductibleFixedCostsForPeriod: 100,
    });
    expect(input?.fixedCostCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "fixed_deductible",
          fiscalDeductible: true,
        }),
        expect.objectContaining({
          id: "fixed_non_deductible",
          fiscalDeductible: false,
        }),
      ]),
    );
  });

  it("no duplica fijo recurrente si ya existe el gasto mensual generado", () => {
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
    });
    const recurring = recurringExpenseFixture({
      id: "recurring_1",
      amount: 50,
    });
    const generatedFixedExpense = expenseFixture({
      id: "generated_recurring_1",
      businessKind: "fixed",
      recurringExpenseId: "recurring_1",
      recurringOccurrenceKey: "recurring_1:2026-07-01",
      amount: 50,
    });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [invoice],
        expenses: [generatedFixedExpense],
        recurringExpenses: [recurring],
      }),
      {
        sourceDocumentId: "invoice_1",
        fixedCostAllocationMethod: "monthly_jobs",
        monthlyJobs: 1,
        selectedFixedCostIds: ["recurring_1"],
      },
    );

    expect(input?.fixedCostCandidates.map((cost) => cost.id)).toEqual([
      "recurring_1",
    ]);
    expect(input?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(50);
  });

  it("conserva una ocurrencia histórica aunque la plantilla esté pausada hoy", () => {
    const aprilInvoice = documentFixture({
      id: "invoice_april",
      date: "2026-04-15",
    });
    const julyInvoice = documentFixture({
      id: "invoice_july",
      date: "2026-07-15",
    });
    const paused = recurringExpenseFixture({
      id: "autonomo_paused",
      amount: 300,
      startDate: "2026-01-01",
      enabled: false,
      updatedAt: "2026-07-01T10:00:00.000Z",
    });
    const aprilOccurrence = expenseFixture({
      id: "autonomo_april",
      date: "2026-04-30",
      origin: "recurring",
      businessKind: "fixed",
      recurringExpenseId: paused.id,
      recurringOccurrenceKey: `${paused.id}:2026-04-30`,
      amount: 300,
      ivaPercent: 0,
    });
    const data = baseAppData({
      documents: [aprilInvoice, julyInvoice],
      expenses: [aprilOccurrence],
      recurringExpenses: [paused],
    });

    const historical =
      buildRentabilidadRealWorkProfitabilityInputFromExistingData(data, {
        sourceDocumentId: aprilInvoice.id,
      });
    const current = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      data,
      { sourceDocumentId: julyInvoice.id },
    );

    expect(historical?.fixedCostCandidates).toHaveLength(1);
    expect(historical?.fixedCostCandidates[0]).toMatchObject({
      id: paused.id,
      date: aprilOccurrence.date,
      amount: 300,
    });
    expect(historical?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(
      300,
    );
    expect(current?.fixedCostCandidates).toEqual([]);
    expect(current?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(0);
  });

  it("usa solo el tramo recurrente aplicable a la fecha del documento", () => {
    const oldInvoice = documentFixture({
      id: "invoice_old",
      date: "2026-04-15",
    });
    const currentInvoice = documentFixture({
      id: "invoice_current",
      date: "2026-07-15",
    });
    const oldTranche = recurringExpenseFixture({
      id: "autonomo_v1",
      amount: 300,
      startDate: "2026-01-01",
      duration: { kind: "until_date", endDate: "2026-04-30" },
    });
    const currentTranche = recurringExpenseFixture({
      id: "autonomo_v2",
      amount: 350,
      startDate: "2026-05-01",
    });
    const data = baseAppData({
      documents: [oldInvoice, currentInvoice],
      recurringExpenses: [oldTranche, currentTranche],
    });

    const oldInput = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      data,
      { sourceDocumentId: "invoice_old" },
    );
    const currentInput =
      buildRentabilidadRealWorkProfitabilityInputFromExistingData(data, {
        sourceDocumentId: "invoice_current",
      });

    expect(oldInput?.fixedCostCandidates.map((cost) => cost.id)).toEqual([
      "autonomo_v1",
    ]);
    expect(oldInput?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(
      300,
    );
    expect(currentInput?.fixedCostCandidates.map((cost) => cost.id)).toEqual([
      "autonomo_v2",
    ]);
    expect(
      currentInput?.fixedCostAllocationInput.totalFixedCostsForPeriod,
    ).toBe(350);
  });

  it("excluye plantillas pausadas, futuras y con duración agotada", () => {
    const invoice = documentFixture({ date: "2026-07-15" });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [invoice],
        recurringExpenses: [
          recurringExpenseFixture({ id: "active", amount: 80 }),
          recurringExpenseFixture({ id: "paused", enabled: false }),
          recurringExpenseFixture({
            id: "future",
            startDate: "2026-08-01",
          }),
          recurringExpenseFixture({
            id: "closed_by_date",
            duration: { kind: "until_date", endDate: "2026-06-30" },
          }),
          recurringExpenseFixture({
            id: "closed_by_occurrences",
            startDate: "2026-01-01",
            duration: { kind: "occurrences", count: 2 },
          }),
        ],
      }),
      { sourceDocumentId: "invoice_1" },
    );

    expect(input?.fixedCostCandidates.map((cost) => cost.id)).toEqual([
      "active",
    ]);
    expect(input?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(80);
  });

  it("mensualiza un seguro anual antes de repartirlo entre trabajos", () => {
    const invoice = documentFixture({ date: "2026-07-15" });
    const input = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      baseAppData({
        documents: [invoice],
        recurringExpenses: [
          recurringExpenseFixture({
            id: "annual_insurance",
            description: "Seguro anual",
            amount: 1200,
            frequency: "annual",
            startDate: "2026-01-01",
          }),
        ],
      }),
      {
        sourceDocumentId: "invoice_1",
        fixedCostAllocationMethod: "monthly_jobs",
        monthlyJobs: 10,
      },
    );

    expect(input?.fixedCostCandidates[0]).toMatchObject({
      id: "annual_insurance",
      amount: 100,
    });
    expect(input?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(100);
    expect(
      input
        ? calculateRentabilidadRealWorkProfitability(input).allocatedFixedCosts
        : null,
    ).toBe(10);
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
