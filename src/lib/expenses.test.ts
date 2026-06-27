import { describe, expect, it } from "vitest";
import { expenseTotalsFromBase } from "./expenses";

describe("expenseTotalsFromBase", () => {
  it("calcula base 100 e IVA 21 con total 121", () => {
    expect(expenseTotalsFromBase(100, 21)).toEqual({
      base: 100,
      iva: 21,
      total: 121,
      ivaPercent: 21,
    });
  });

  it("calcula gastos con IVA 0", () => {
    expect(expenseTotalsFromBase(100, 0)).toEqual({
      base: 100,
      iva: 0,
      total: 100,
      ivaPercent: 0,
    });
  });

  it("recalcula total al editar la base", () => {
    const before = expenseTotalsFromBase(100, 21);
    const after = expenseTotalsFromBase(200, 21);

    expect(before.total).toBe(121);
    expect(after.total).toBe(242);
  });

  it("evita NaN en la vista de totales", () => {
    const totals = expenseTotalsFromBase(Number.NaN, Number.NaN);

    expect(totals.base).toBe(0);
    expect(totals.iva).toBe(0);
    expect(totals.total).toBe(0);
    expect(Number.isNaN(totals.total)).toBe(false);
  });
});
