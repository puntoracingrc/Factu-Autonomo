import { describe, expect, it } from "vitest";
import {
  documentAmounts,
  expenseAmount,
  isVatExempt,
  zeroIvaItems,
} from "./vat-regime";
import type { Expense } from "./types";

describe("vat-regime", () => {
  it("detecta perfil exento", () => {
    expect(isVatExempt({ vatExempt: true })).toBe(true);
    expect(isVatExempt({})).toBe(false);
  });

  it("ignora IVA en importes de documentos", () => {
    const amounts = documentAmounts(
      {
        items: [
          {
            id: "1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
      true,
    );
    expect(amounts).toEqual({ subtotal: 100, iva: 0, total: 100 });
  });

  it("usa importe base en gastos exentos", () => {
    const expense: Expense = {
      id: "1",
      date: "2026-06-09",
      supplierName: "P",
      description: "Gasto",
      amount: 80,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      createdAt: "2026-06-09",
    };
    expect(expenseAmount(expense, true)).toBe(80);
    expect(expenseAmount(expense, false)).toBeCloseTo(96.8, 1);
  });

  it("pone IVA a cero en líneas", () => {
    expect(zeroIvaItems([{ id: "1", description: "A", quantity: 1, unitPrice: 1, ivaPercent: 21 }])[0].ivaPercent).toBe(0);
  });
});
