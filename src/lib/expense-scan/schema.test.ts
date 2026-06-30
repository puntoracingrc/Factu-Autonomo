import { describe, expect, it } from "vitest";
import { normalizeExpenseScanPayload } from "./schema";

describe("expense scan schema", () => {
  it("normaliza un payload válido", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Leroy Merlin", nif: "B12345678" },
      expense: {
        date: "12/05/2026",
        description: "Material",
        amount: 42.5,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        notes: "FM-99",
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.supplier.name).toBe("Leroy Merlin");
    expect(result?.expense.date).toBe("2026-05-12");
    expect(result?.expense.businessKind).toBe("purchase_invoice");
    expect(result?.expense.amount).toBe(42.5);
    expect(result?.expense.paymentMethod).toBe("Tarjeta");
  });

  it("clasifica tickets escaneados sin NIF como gasto rápido", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Gasolinera" },
      expense: {
        date: "2026-01-01",
        description: "Ticket combustible",
        amount: 15,
        ivaPercent: 21,
        category: "Vehículo",
        paymentMethod: "Tarjeta",
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.expense.businessKind).toBe("quick_ticket");
  });

  it("rechaza datos incompletos", () => {
    expect(
      normalizeExpenseScanPayload({
        supplier: { name: "" },
        expense: { description: "x", amount: 0 },
      }),
    ).toBeNull();
  });

  it("añade aviso con baja confianza", () => {
    const result = normalizeExpenseScanPayload({
      supplier: { name: "Tienda" },
      expense: {
        date: "2026-01-01",
        description: "Gasto",
        amount: 10,
        ivaPercent: 21,
        category: "Otros",
        paymentMethod: "Efectivo",
      },
      confidence: 0.4,
      warnings: [],
    });
    expect(result?.warnings.some((w) => w.includes("Confianza baja"))).toBe(true);
  });
});
