import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROFILE,
  type Document,
  type Expense,
  type RecurringExpense,
} from "@/lib/types";

import {
  parseCentralBusinessDocumentPayload,
  parseCentralExpensePayload,
  parseCentralProfilePayload,
  parseCentralRecurringExpensePayload,
} from "./payload-parsers";

const quote: Document = {
  id: "quote-1",
  type: "presupuesto",
  number: "P-2026-0001",
  date: "2026-07-29",
  client: { name: "Cliente sintético" },
  items: [
    {
      id: "line-1",
      description: "Trabajo sintético",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "borrador",
  createdAt: "2026-07-29T19:00:00.000Z",
  updatedAt: "2026-07-29T19:00:00.000Z",
};

const expense: Expense = {
  id: "expense-1",
  date: "2026-07-29",
  supplierName: "Proveedor sintético",
  description: "Compra sintética",
  amount: 121,
  ivaPercent: 21,
  category: "Compras",
  paymentMethod: "Tarjeta",
  purchaseLines: [
    {
      id: "line-1",
      description: "Material sintético",
      quantity: 2,
      unitPrice: 50,
      total: 100,
    },
  ],
  createdAt: "2026-07-29T19:00:00.000Z",
};

const recurringExpense: RecurringExpense = {
  id: "recurring-1",
  supplierName: "Proveedor sintético",
  description: "Cuota sintética",
  amount: 50,
  ivaPercent: 21,
  category: "Servicios",
  paymentMethod: "Domiciliación",
  frequency: "monthly",
  dueTiming: { kind: "day_of_month", day: 15 },
  duration: { kind: "occurrences", count: 12 },
  startDate: "2026-07-01",
  enabled: true,
  createdAt: "2026-07-29T19:00:00.000Z",
  updatedAt: "2026-07-29T19:00:00.000Z",
};

describe("central business payload parsers", () => {
  it("acepta presupuestos y recibos, pero rechaza facturas y datos fiscales", () => {
    expect(
      parseCentralBusinessDocumentPayload(quote, quote.id, "quote"),
    ).toEqual(quote);
    expect(
      parseCentralBusinessDocumentPayload(
        { ...quote, type: "recibo" },
        quote.id,
        "receipt",
      ),
    ).toEqual({ ...quote, type: "recibo" });
    expect(
      parseCentralBusinessDocumentPayload(
        { ...quote, type: "factura" },
        quote.id,
        "quote",
      ),
    ).toBeNull();
    expect(
      parseCentralBusinessDocumentPayload(
        { ...quote, centralInvoiceAuthority: {} },
        quote.id,
        "quote",
      ),
    ).toBeNull();
  });
  it("acepta gastos completos y rechaza números o líneas inválidas", () => {
    expect(parseCentralExpensePayload(expense, expense.id)).toEqual(expense);
    expect(
      parseCentralExpensePayload({ ...expense, amount: Number.NaN }, expense.id),
    ).toBeNull();
    expect(
      parseCentralExpensePayload(
        { ...expense, purchaseLines: [{ id: "line-1" }] },
        expense.id,
      ),
    ).toBeNull();
  });

  it("normaliza tombstones de gastos fijos y rechaza calendarios imposibles", () => {
    const withInvalidExclusion = {
      ...recurringExpense,
      occurrenceExclusions: [
        {
          key: "otra-plantilla:2026-08-15",
          excludedAt: "2026-07-29T20:00:00.000Z",
        },
      ],
    };

    expect(
      parseCentralRecurringExpensePayload(
        withInvalidExclusion,
        recurringExpense.id,
      ),
    ).not.toHaveProperty("occurrenceExclusions");
    expect(
      parseCentralRecurringExpensePayload(
        {
          ...recurringExpense,
          dueTiming: { kind: "day_of_month", day: 32 },
        },
        recurringExpense.id,
      ),
    ).toBeNull();
  });

  it("solo acepta el perfil singleton y normaliza sus ajustes", () => {
    const parsed = parseCentralProfilePayload(
      {
        ...DEFAULT_PROFILE,
        name: " Empresa sintética ",
        iva: { rates: [21, 10, 4], defaultRate: 21 },
      },
      "profile",
    );

    expect(parsed).toMatchObject({
      name: " Empresa sintética ",
      iva: { rates: [4, 10, 21], defaultRate: 21 },
    });
    expect(
      parseCentralProfilePayload(DEFAULT_PROFILE, "profile-secondary"),
    ).toBeNull();
    expect(
      parseCentralProfilePayload(
        { ...DEFAULT_PROFILE, iva: { rates: ["21"], defaultRate: 21 } },
        "profile",
      ),
    ).toBeNull();
  });
});
