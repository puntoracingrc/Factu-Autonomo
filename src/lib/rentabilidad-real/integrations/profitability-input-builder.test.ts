import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type AppData, type Document, type Expense } from "@/lib/types";
import { buildProfitabilityInputDraftFromExistingData } from "./profitability-input-builder";

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

function baseDocument(overrides: Partial<Document>): Document {
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
        unitPrice: 200,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function baseExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense_1",
    date: "2026-07-02",
    supplierName: "Proveedor Demo",
    description: "Material sin asignar",
    amount: 40,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    createdAt: "2026-07-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildProfitabilityInputDraftFromExistingData", () => {
  it("warns when assignments are missing", () => {
    const quote = baseDocument({
      id: "quote_1",
      type: "presupuesto",
      number: "P-2026-0001",
      status: "aceptado",
    });
    const invoice = baseDocument({
      id: "invoice_1",
      type: "factura",
      number: "F-2026-0001",
    });
    const expense = baseExpense();
    const data = baseAppData({
      documents: [quote, invoice],
      expenses: [expense],
    });

    const draft = buildProfitabilityInputDraftFromExistingData(data);

    expect(draft.incomes).toHaveLength(1);
    expect(draft.quotes).toHaveLength(1);
    expect(draft.directCostCandidates).toHaveLength(1);
    expect(draft.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "invoice_without_quote_assignment",
        "quote_without_invoice_assignment",
        "cost_without_work_assignment",
      ]),
    );
  });
});
