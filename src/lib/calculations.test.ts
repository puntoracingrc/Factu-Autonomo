import { describe, expect, it } from "vitest";
import {
  documentTotals,
  expenseTotal,
  lineIva,
  lineSubtotal,
  lineTotal,
  unitPriceFromGross,
  unitPriceGross,
} from "./calculations";
import type { Document, Expense, LineItem } from "./types";

function item(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: "1",
    description: "Servicio",
    quantity: 1,
    unitPrice: 100,
    ivaPercent: 21,
    ...overrides,
  };
}

describe("unit price with/without VAT", () => {
  it("convierte entre precio sin IVA y con IVA", () => {
    expect(unitPriceGross(100, 21)).toBe(121);
    expect(unitPriceFromGross(121, 21)).toBe(100);
  });

  it("redondea a dos decimales al desglosar IVA", () => {
    expect(unitPriceFromGross(100, 21)).toBeCloseTo(82.64, 2);
    expect(unitPriceGross(82.64, 21)).toBeCloseTo(99.99, 2);
  });

  it("admite IVA cero", () => {
    expect(unitPriceGross(50, 0)).toBe(50);
    expect(unitPriceFromGross(50, 0)).toBe(50);
  });
});

describe("line calculations", () => {
  it("calcula base, IVA y total de una línea", () => {
    const line = item({ quantity: 2, unitPrice: 50, ivaPercent: 21 });
    expect(lineSubtotal(line)).toBe(100);
    expect(lineIva(line)).toBe(21);
    expect(lineTotal(line)).toBe(121);
  });

  it("admite IVA reducido y cero", () => {
    expect(lineTotal(item({ unitPrice: 200, ivaPercent: 10 }))).toBe(220);
    expect(lineTotal(item({ unitPrice: 80, ivaPercent: 0 }))).toBe(80);
  });

  it("admite importes negativos en rectificativas", () => {
    const line = item({ unitPrice: -100, ivaPercent: 21 });
    expect(lineSubtotal(line)).toBe(-100);
    expect(lineTotal(line)).toBe(-121);
  });
});

describe("documentTotals", () => {
  it("suma varias líneas con distintos IVAs", () => {
    const doc: Pick<Document, "items"> = {
      items: [
        item({ id: "a", description: "A", unitPrice: 100, ivaPercent: 21 }),
        item({ id: "b", description: "B", unitPrice: 50, ivaPercent: 10 }),
        item({ id: "c", description: "C", quantity: 3, unitPrice: 10, ivaPercent: 4 }),
      ],
    };
    const totals = documentTotals(doc);
    expect(totals.subtotal).toBe(180);
    expect(totals.iva).toBeCloseTo(27.2, 2);
    expect(totals.total).toBeCloseTo(207.2, 2);
  });

  it("cuadra con la suma línea a línea", () => {
    const items = [
      item({ id: "1", description: "Servicio", unitPrice: 123.45, ivaPercent: 21 }),
      item({ id: "2", description: "Material", quantity: 2, unitPrice: 19.99, ivaPercent: 21 }),
    ];
    const totals = documentTotals({ items });
    const sumLines = items.reduce((sum, line) => sum + lineTotal(line), 0);
    expect(totals.total).toBeCloseTo(sumLines, 5);
  });

  it("devuelve cero con documento vacío", () => {
    expect(documentTotals({ items: [] })).toEqual({
      subtotal: 0,
      iva: 0,
      total: 0,
    });
  });
});

describe("expenseTotal", () => {
  it("calcula gasto con IVA incluido en el importe base", () => {
    const expense: Expense = {
      id: "1",
      date: "2026-06-09",
      supplierName: "Proveedor",
      description: "Compra",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      createdAt: "2026-06-09",
    };
    expect(expenseTotal(expense)).toBe(121);
  });
});
