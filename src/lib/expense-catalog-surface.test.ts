import { describe, expect, it } from "vitest";
import { prepareCentralScannedExpenseBundle } from "./central-business-authority/expense-bundle-preparation";
import { resolveExpenseCatalogSurface } from "./expense-catalog-surface";
import { productsWithExpenseCosts, reviewExpenseCatalogCosts } from "./expense-catalog-costs";
import {
  expenseFiscalAmounts,
  expensePurchaseLineCanFeedProductCatalog,
  findExpensePurchaseLinePriceAlerts,
} from "./expenses";
import { invoicePriceSources } from "./product-catalog-lite/invoice-sources";
import { buildPurchaseProductSummaries } from "./purchase-products";
import { EMPTY_DATA, type Expense, type ExpensePurchaseLine, type Product } from "./types";

const now = "2026-09-08T10:00:00.000Z";
const line: ExpensePurchaseLine = {
  id: "synthetic-screen-line",
  description: "Mosquitera enrollable azul de prueba",
  supplierReference: "SYN-SCREEN-1",
  catalogProduct: true,
  sourceQuantity: 2,
  quantity: 2,
  chargeQuantity: 2,
  calculationBasis: "unit",
  unit: "UD",
  dimensionUnit: "cm",
  width: 80,
  height: 120,
  unitPrice: 72.5,
  discountPercent: 20,
  total: 116,
  ivaPercent: 21,
};
const expense: Expense = {
  id: "synthetic-screen-expense",
  date: "2026-09-08",
  supplierId: "synthetic-screen-supplier",
  supplierName: "Proveedor sintético",
  description: line.description,
  amount: 116,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Transferencia",
  origin: "scan",
  businessKind: "purchase_invoice",
  purchaseDocument: { invoiceNumber: "SYN-SCREEN-INVOICE" },
  purchaseLines: [line],
  createdAt: now,
};
const product: Product = {
  id: "synthetic-screen",
  name: line.description,
  key: "mosquitera enrollable azul de prueba",
  family: "Mosquiteras",
  source: "manual",
  unit: "m2",
  cost: 60,
  pvp: 75,
  purchase: {
    unit: "m2",
    supplierId: expense.supplierId,
    supplierName: expense.supplierName,
    supplierReference: line.supplierReference,
    listPrice: 75,
    netUnitCost: 60,
    discountPercent: 20,
  },
  sales: { unit: "m2", unitPrice: 120, ivaPercent: 21 },
  createdAt: now,
  updatedAt: now,
};

describe("mosquiteras facturadas por pieza", () => {
  it.each([
    { dimensionUnit: "mm", width: 800, height: 1200 },
    { dimensionUnit: "cm", width: 80, height: 120 },
    { dimensionUnit: "m", width: 0.8, height: 1.2 },
  ] as const)("convierte medidas en $dimensionUnit y usa el neto real", (size) => {
    const price = resolveExpenseCatalogSurface({ ...line, ...size });
    expect(price).toMatchObject({ status: "ready", list: 75.52, net: 60.42 });
    if (price?.status !== "ready") throw Error("No se calculó la superficie");
    expect(price.areaM2).toBeCloseTo(1.92, 8);
  });

  it("no lleva a Productos una mosquitera sin medidas o con precio incoherente", () => {
    for (const incomplete of [
      { ...line, width: undefined },
      { ...line, dimensionUnit: "unknown" as const },
      { ...line, total: 145 },
      { ...line, unit: "ml" },
      { ...line, quantity: 1.5 },
      { ...line, total: -116 },
    ]) {
      expect(expensePurchaseLineCanFeedProductCatalog(expense, incomplete)).toBe(false);
      expect(buildPurchaseProductSummaries([{ ...expense, purchaseLines: [incomplete] }])).toEqual([]);
    }
  });

  it("deja intactas las unidades originales de accesorios y las líneas ya cobradas por m²", () => {
    const accessory = { ...line, description: "Guía para mosquitera", width: undefined };
    const squareMetres = { ...line, unit: "m²", calculationBasis: "m2" as const,
      quantity: 1.92, unitPrice: 75, total: 115.2 };
    expect(resolveExpenseCatalogSurface(accessory)).toBeNull();
    expect(resolveExpenseCatalogSurface(squareMetres)).toBeNull();
    expect(expensePurchaseLineCanFeedProductCatalog(expense, accessory)).toBe(true);
    expect(buildPurchaseProductSummaries([{ ...expense, purchaseLines: [squareMetres] }])[0])
      .toMatchObject({ purchaseUnit: "m2", lastUnitPrice: 60 });
  });

  it("ofrece coste por m² en una nueva ficha sin recalcular el gasto", () => {
    const [summary] = buildPurchaseProductSummaries([expense]);
    expect(summary).toMatchObject({
      unit: "m2", purchaseUnit: "m2", totalQuantity: 1.92, totalBase: 116,
      lastUnitPrice: 60.42, lastPvp: 75.52, lastDiscountPercent: 20,
    });
    expect(expenseFiscalAmounts(expense)).toMatchObject({
      registeredBase: 116, registeredIva: 24.36, registeredTotal: 140.36,
    });
    expect(expense.purchaseLines?.[0]).toEqual(line);
  });

  it("actualiza una ficha por m² junto al gasto sin tocar su precio de venta", () => {
    const { id, createdAt, ...draft } = expense;
    void id;
    void createdAt;
    const prepared = prepareCentralScannedExpenseBundle({
      data: { ...EMPTY_DATA, products: [product] },
      expense: draft,
      operationId: "synthetic-screen-save",
      now,
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw Error("No se preparó la compra");
    expect(prepared.transition.value.expense.purchaseLines).toEqual([line]);
    expect(prepared.transition.data.products[0]).toMatchObject({
      cost: 60.42,
      purchase: { unit: "m2", listPrice: 75.52, netUnitCost: 60.42 },
      sales: product.sales,
      priceSources: [{ unit: "m2", netUnitCost: 60.42, lineId: line.id }],
    });
    expect(prepared.mutations.map((mutation) => mutation.entityType)).toEqual([
      "expense", "product",
    ]);
    expect(invoicePriceSources(product, [expense])[0]).toMatchObject({
      unit: "m2", listPrice: 75.52, netUnitCost: 60.42,
    });
    expect(product.cost).toBe(60);
  });

  it("no aplica el precio por m² a una ficha de precio por pieza", () => {
    const pieceProduct = {
      ...product, unit: "ud", purchase: { ...product.purchase, unit: "ud" },
    };
    expect(reviewExpenseCatalogCosts({
      expense, products: [pieceProduct], expenses: [],
    })[0]).toMatchObject({ willUpdate: false, canChoose: false, needsReview: true });
    expect(buildPurchaseProductSummaries([expense], [pieceProduct])[0]).toMatchObject({
      purchaseCount: 0, purchaseUnit: "ud", lastUnitPrice: 60,
    });
  });

  it("etiqueta el coste como m² si la unidad estaba solo en la faceta de venta", () => {
    const saleUnitProduct = {
      ...product, unit: undefined, purchase: { ...product.purchase, unit: undefined },
    };
    expect(productsWithExpenseCosts({
      expense, products: [saleUnitProduct], expenses: [], now,
    })[0]).toMatchObject({
      purchase: { unit: "m2", netUnitCost: 60.42 },
      priceSources: [{ unit: "m2", netUnitCost: 60.42 }],
    });
  });

  it("no avisa de una subida de coste por cambiar solo el tamaño de las piezas", () => {
    const previous = { ...expense, id: "synthetic-screen-before", date: "2026-09-01",
      amount: 58, purchaseLines: [{ ...line, width: 40, unitPrice: 36.25, total: 58 }] };
    expect(findExpensePurchaseLinePriceAlerts({
      currentLines: [line], currentExpenseAmount: 116, currentExpenseDate: expense.date,
      supplierId: expense.supplierId, expenses: [previous],
    })).toEqual([]);
  });
});
