import { describe, expect, it } from "vitest";
import {
  expensePurchaseLineBaseTotal,
  expensePurchaseLinesBaseTotal,
  expenseTotalsFromBase,
  findDuplicatePurchaseExpense,
  findExpensePurchaseLinePriceAlerts,
  purchaseExpenseDuplicateMatches,
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

  it("mantiene importes negativos para abonos o devoluciones", () => {
    expect(expenseTotalsFromBase(-100, 21)).toEqual({
      base: -100,
      iva: -21,
      total: -121,
      ivaPercent: 21,
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

  it("conserva líneas negativas de abonos de proveedor", () => {
    const lines = sanitizeExpensePurchaseLines([
      {
        id: "line-return",
        description: "Material devuelto",
        quantity: -2,
        unitPrice: 30,
        ivaPercent: 21,
        total: -60,
      },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      description: "Material devuelto",
      quantity: -2,
      total: -60,
    });
    expect(expensePurchaseLineBaseTotal(lines[0])).toBe(-60);
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

  it("detecta facturas de proveedor duplicadas por numero, proveedor e importe", () => {
    const previousExpense: Expense = {
      id: "expense-1",
      date: "2026-06-16",
      supplierName: "METALURGICA ARANDES S.L.",
      description: "Compra de materiales y componentes metalicos",
      amount: 386.45,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Transferencia",
      purchaseDocument: {
        invoiceNumber: "FD/224811",
        supplierNif: "B60470374",
      },
      createdAt: "2026-06-16T10:00:00.000Z",
    };

    expect(
      purchaseExpenseDuplicateMatches(
        {
          invoiceNumber: " fd/224811 ",
          supplierName: "metalurgica arandes s.l.",
          amount: 386.45,
        },
        {
          invoiceNumber: previousExpense.purchaseDocument?.invoiceNumber,
          supplierNif: previousExpense.purchaseDocument?.supplierNif,
          supplierName: previousExpense.supplierName,
          amount: previousExpense.amount,
        },
      ),
    ).toBe(true);
    expect(
      findDuplicatePurchaseExpense([previousExpense], {
        invoiceNumber: "FD/224811",
        supplierNif: "B60470374",
        supplierName: "METALURGICA ARANDES S.L.",
        amount: 386.45,
      }),
    ).toBe(previousExpense);
    expect(
      purchaseExpenseDuplicateMatches(
        {
          invoiceNumber: "FD/224811",
          supplierName: "Metalúrgica Arandes SL",
        },
        {
          invoiceNumber: previousExpense.purchaseDocument?.invoiceNumber,
          supplierName: previousExpense.supplierName,
        },
      ),
    ).toBe(true);
    expect(
      findDuplicatePurchaseExpense(
        [previousExpense],
        {
          invoiceNumber: "FD/224811",
          supplierName: "METALURGICA ARANDES S.L.",
          amount: 386.45,
        },
        { excludeExpenseId: "expense-1" },
      ),
    ).toBeNull();
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
      iva: 31.61,
    });
    expect(summarizeWorkDocumentExpensesById(expenses).get("document-2")).toEqual({
      count: 1,
      cost: 80,
      iva: 16.8,
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

  it("no avisa de precio en líneas que no alimentan catálogo", () => {
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
          description: "Taladro para uso interno",
          catalogProduct: false,
          quantity: 1,
          unitPrice: 100,
        },
      ],
      createdAt: "2026-06-01T10:00:00.000Z",
    };

    const alerts = findExpensePurchaseLinePriceAlerts({
      currentLines: [
        {
          id: "current-line",
          description: "Taladro para uso interno",
          catalogProduct: false,
          quantity: 1,
          unitPrice: 150,
        },
      ],
      expenses: [previousExpense],
      supplierId: "supplier-1",
    });

    expect(alerts).toHaveLength(0);
  });
});
