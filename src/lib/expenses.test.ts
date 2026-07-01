import { describe, expect, it } from "vitest";
import {
  expensePurchaseLineBaseTotal,
  expensePurchaseLinesBaseTotal,
  expenseTotalsFromBase,
  findExpensePurchaseLinePriceAlerts,
  sanitizeExpensePurchaseDocument,
  sanitizeExpensePurchaseLines,
  summarizeWorkDocumentExpensesById,
  summarizeWorkDocumentExpenses,
} from "./expenses";
import type { Expense } from "./types";

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

  it("resume costes vinculados a un trabajo", () => {
    const expenses: Expense[] = [
      {
        id: "expense-1",
        date: "2026-06-01",
        supplierName: "Proveedor Demo",
        description: "Material",
        amount: 120.5,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        workDocumentId: "document-1",
        createdAt: "2026-06-01T10:00:00.000Z",
      },
      {
        id: "expense-2",
        date: "2026-06-02",
        supplierName: "Proveedor Demo",
        description: "Recambio",
        amount: 30,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        workDocumentId: "document-1",
        createdAt: "2026-06-02T10:00:00.000Z",
      },
      {
        id: "expense-3",
        date: "2026-06-03",
        supplierName: "Otro proveedor",
        description: "Otro trabajo",
        amount: 80,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        workDocumentId: "document-2",
        createdAt: "2026-06-03T10:00:00.000Z",
      },
    ];

    expect(summarizeWorkDocumentExpenses(expenses, "document-1")).toEqual({
      count: 2,
      cost: 150.5,
    });
    expect(summarizeWorkDocumentExpensesById(expenses).get("document-2")).toEqual({
      count: 1,
      cost: 80,
    });
  });

  it("avisa si una línea escaneada sube mucho respecto a compras anteriores", () => {
    const previousExpense: Expense = {
      id: "expense-1",
      date: "2026-06-01",
      supplierId: "supplier-1",
      supplierName: "Proveedor Demo",
      description: "Compra anterior",
      amount: 50,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      purchaseLines: [
        {
          id: "previous-line",
          description: "Lama persiana blanca",
          quantity: 1,
          unitPrice: 10,
          discountPercent: 10,
        },
      ],
      createdAt: "2026-06-01T10:00:00.000Z",
    };

    const alerts = findExpensePurchaseLinePriceAlerts({
      currentLines: [
        {
          id: "current-line",
          description: "Lama persiana blanca",
          quantity: 1,
          unitPrice: 13,
          discountPercent: 0,
        },
      ],
      expenses: [previousExpense],
      supplierId: "supplier-1",
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      description: "Lama persiana blanca",
      previousUnitPrice: 10,
      currentUnitPrice: 13,
      priceChangePercent: 30,
      discountChangePoints: -10,
    });
  });

  it("no avisa por cambios pequeños de precio o por otros proveedores", () => {
    const previousExpense: Expense = {
      id: "expense-1",
      date: "2026-06-01",
      supplierId: "supplier-1",
      supplierName: "Proveedor Demo",
      description: "Compra anterior",
      amount: 50,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      purchaseLines: [
        {
          id: "previous-line",
          description: "Lama persiana blanca",
          quantity: 1,
          unitPrice: 10,
          discountPercent: 10,
        },
      ],
      createdAt: "2026-06-01T10:00:00.000Z",
    };

    expect(
      findExpensePurchaseLinePriceAlerts({
        currentLines: [
          {
            id: "current-line",
            description: "Lama persiana blanca",
            quantity: 1,
            unitPrice: 10.5,
            discountPercent: 8,
          },
        ],
        expenses: [previousExpense],
        supplierId: "supplier-1",
      }),
    ).toHaveLength(0);

    expect(
      findExpensePurchaseLinePriceAlerts({
        currentLines: [
          {
            id: "current-line",
            description: "Lama persiana blanca",
            quantity: 1,
            unitPrice: 13,
          },
        ],
        expenses: [previousExpense],
        supplierId: "supplier-2",
      }),
    ).toHaveLength(0);
  });
});
