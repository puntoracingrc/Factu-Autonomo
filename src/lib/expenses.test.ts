import { describe, expect, it } from "vitest";
import {
  expensePurchaseLineBaseTotal,
  expensePurchaseLinesBaseTotal,
  expenseTotalsFromBase,
  sanitizeExpensePurchaseDocument,
  sanitizeExpensePurchaseLines,
} from "./expenses";

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

  it("calcula y limpia líneas de compra", () => {
    const lines = sanitizeExpensePurchaseLines([
      {
        id: "line-1",
        description: " Lama persiana ",
        quantity: 2,
        unit: " ud ",
        unitPrice: 30,
        discountPercent: 10,
        ivaPercent: 21,
      },
      {
        id: "line-2",
        description: "Sin precio",
        quantity: 1,
        unitPrice: 0,
        ivaPercent: 21,
      },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      description: "Lama persiana",
      unit: "ud",
    });
    expect(expensePurchaseLineBaseTotal(lines[0])).toBe(54);
    expect(expensePurchaseLinesBaseTotal(lines)).toBe(54);
  });

  it("limpia datos de factura de proveedor vacíos", () => {
    expect(sanitizeExpensePurchaseDocument({})).toBeUndefined();
    expect(
      sanitizeExpensePurchaseDocument({
        invoiceNumber: " FD-1 ",
        supplierNif: " B12345678 ",
      }),
    ).toEqual({
      invoiceNumber: "FD-1",
      supplierNif: "B12345678",
    });
  });
});
