import { describe, expect, it } from "vitest";
import {
  inferExpenseBusinessKind,
  isFixedExpense,
  normalizeExpenseBusinessKind,
} from "./expense-classification";
import type { Expense, Supplier } from "./types";

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense",
    date: "2026-06-30",
    supplierName: "Proveedor",
    description: "Material",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    origin: "manual",
    createdAt: "2026-06-30T10:00:00.000Z",
    ...overrides,
  };
}

describe("expense classification", () => {
  it("respeta el tipo guardado", () => {
    expect(
      inferExpenseBusinessKind(expense({ businessKind: "quick_ticket" })),
    ).toBe("quick_ticket");
  });

  it("detecta gastos fijos heredados", () => {
    const fixed = expense({ origin: "recurring", recurringExpenseId: "fixed-1" });
    expect(isFixedExpense(fixed)).toBe(true);
    expect(inferExpenseBusinessKind(fixed)).toBe("fixed");
  });

  it("usa proveedor con NIF como señal de factura de compra", () => {
    const supplier: Supplier = {
      id: "supplier-1",
      name: "Proveedor SL",
      nif: "B12345678",
      createdAt: "2026-06-30T10:00:00.000Z",
    };

    expect(inferExpenseBusinessKind(expense(), supplier)).toBe(
      "purchase_invoice",
    );
  });

  it("normaliza alias de IA", () => {
    expect(normalizeExpenseBusinessKind("ticket")).toBe("quick_ticket");
    expect(normalizeExpenseBusinessKind("factura")).toBe("purchase_invoice");
    expect(normalizeExpenseBusinessKind("fijo")).toBe("fixed");
  });
});
