import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type AppData, type Document, type Expense } from "@/lib/types";
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
