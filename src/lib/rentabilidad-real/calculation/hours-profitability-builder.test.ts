import { describe, expect, it } from "vitest";
import {
  EMPTY_DATA,
  type AppData,
  type Document,
  type Expense,
  type RecurringExpense,
} from "@/lib/types";
import { buildRentabilidadRealHoursProfitabilityInputFromExistingData } from "./hours-profitability-builder";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function appData(overrides: Partial<AppData> = {}): AppData {
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
    number: "F-1",
    date: "2026-07-01",
    client: { name: "Cliente" },
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
    supplierName: "Proveedor",
    description: "Coste",
    amount: 100,
    ivaPercent: 21,
    category: "Servicios",
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
    supplierName: "Proveedor fijo",
    description: "Gasto fijo",
    amount: 600,
    ivaPercent: 0,
    category: "Profesional",
    paymentMethod: "Domiciliación",
    frequency: "monthly",
    dueTiming: { kind: "start_of_month" },
    duration: { kind: "indefinite" },
    startDate: "2026-07-01",
    enabled: true,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function withoutClient(document: Document): Document {
  const copy: Partial<Document> = { ...document };
  delete copy.client;
  return copy as Document;
}

describe("buildRentabilidadRealHoursProfitabilityInputFromExistingData", () => {
  it("factura con sourceQuoteDocumentId encuentra presupuesto", () => {
    const quote = documentFixture({
      id: "quote_1",
      type: "presupuesto",
      number: "P-1",
    });
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
      sourceQuoteDocumentId: "quote_1",
    });

    const input = buildRentabilidadRealHoursProfitabilityInputFromExistingData(
      appData({ documents: [quote, invoice] }),
      {
        sourceType: "document",
        selectedDocumentId: "invoice_1",
        billedHours: 10,
        realWorkedHours: 10,
      },
    );

    expect(input?.sourceQuoteDocumentId).toBe("quote_1");
    expect(input?.incomeWithoutIndirectTax).toBe(1000);
  });

  it("presupuesto encuentra factura", () => {
    const quote = documentFixture({
      id: "quote_1",
      type: "presupuesto",
      number: "P-1",
    });
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
      sourceQuoteDocumentId: "quote_1",
    });

    const input = buildRentabilidadRealHoursProfitabilityInputFromExistingData(
      appData({ documents: [quote, invoice] }),
      {
        sourceType: "document",
        selectedDocumentId: "quote_1",
      },
    );

    expect(input?.sourceDocumentId).toBe("quote_1");
    expect(input?.incomeWithoutIndirectTax).toBe(1000);
  });

  it("gastos workDocumentId se incluyen", () => {
    const invoice = documentFixture({ id: "invoice_1", type: "factura" });
    const expense = expenseFixture({ workDocumentId: "invoice_1" });

    const input = buildRentabilidadRealHoursProfitabilityInputFromExistingData(
      appData({ documents: [invoice], expenses: [expense] }),
      {
        sourceType: "document",
        selectedDocumentId: "invoice_1",
      },
    );

    expect(input?.directCosts.map((cost) => cost.id)).toEqual(["expense_1"]);
  });

  it("usa solo los gastos fijos seleccionados en modo manual", () => {
    const fixedA = recurringExpenseFixture({ id: "fixed_a", amount: 600 });
    const fixedB = recurringExpenseFixture({ id: "fixed_b", amount: 1120.25 });

    const input = buildRentabilidadRealHoursProfitabilityInputFromExistingData(
      appData({ recurringExpenses: [fixedA, fixedB] }),
      {
        sourceType: "manual",
        projectName: "Proyecto",
        fixedCostAllocationMethod: "hours",
        monthlyWorkHours: 120,
        selectedFixedCostIds: ["fixed_a"],
      },
    );

    expect(input?.fixedCostCandidates.map((cost) => cost.id)).toEqual([
      "fixed_a",
      "fixed_b",
    ]);
    expect(input?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(600);
  });

  it("seleccion vacia aplica cero fijos en horas", () => {
    const fixedA = recurringExpenseFixture({ id: "fixed_a", amount: 600 });

    const input = buildRentabilidadRealHoursProfitabilityInputFromExistingData(
      appData({ recurringExpenses: [fixedA] }),
      {
        sourceType: "manual",
        projectName: "Proyecto",
        fixedCostAllocationMethod: "hours",
        selectedFixedCostIds: [],
      },
    );

    expect(input?.fixedCostCandidates.map((cost) => cost.id)).toEqual(["fixed_a"]);
    expect(input?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(0);
  });

  it("no duplica plantilla recurrente y gasto fijo generado del mismo fijo", () => {
    const fixedA = recurringExpenseFixture({ id: "fixed_a", amount: 600 });
    const generatedFixedExpense = expenseFixture({
      id: "generated_fixed_a",
      businessKind: "fixed",
      recurringExpenseId: "fixed_a",
      recurringOccurrenceKey: "fixed_a:2026-07-01",
      amount: 600,
    });

    const input = buildRentabilidadRealHoursProfitabilityInputFromExistingData(
      appData({
        expenses: [generatedFixedExpense],
        recurringExpenses: [fixedA],
      }),
      {
        sourceType: "manual",
        projectName: "Proyecto",
        fixedCostAllocationMethod: "hours",
        monthlyWorkHours: 120,
        selectedFixedCostIds: ["fixed_a"],
      },
    );

    expect(input?.fixedCostCandidates.map((cost) => cost.id)).toEqual([
      "fixed_a",
    ]);
    expect(input?.fixedCostAllocationInput.totalFixedCostsForPeriod).toBe(600);
  });

  it("documento sin client no rompe y usa fallback", () => {
    const invoice = withoutClient(
      documentFixture({ id: "invoice_1", type: "factura" }),
    );

    const input = buildRentabilidadRealHoursProfitabilityInputFromExistingData(
      appData({ documents: [invoice] }),
      {
        sourceType: "document",
        selectedDocumentId: "invoice_1",
      },
    );

    expect(input?.customerName).toBe("Cliente sin asignar");
  });

  it("no muta AppData", () => {
    const invoice = documentFixture({ id: "invoice_1", type: "factura" });
    const data = appData({ documents: [invoice] });
    const before = deepClone(data);

    buildRentabilidadRealHoursProfitabilityInputFromExistingData(data, {
      sourceType: "document",
      selectedDocumentId: "invoice_1",
    });

    expect(data).toEqual(before);
  });

  it("warnings si faltan datos manuales", () => {
    const input = buildRentabilidadRealHoursProfitabilityInputFromExistingData(
      appData(),
      {
        sourceType: "manual",
        incomeWithoutIndirectTax: 500,
      },
    );

    expect(input?.warnings?.map((warning) => warning.code)).toContain(
      "manual_project_name_missing",
    );
  });
});
