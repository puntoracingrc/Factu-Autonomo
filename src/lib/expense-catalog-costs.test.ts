import { describe, it, expect } from "vitest";
import { EMPTY_DATA, type AppData, type Expense, type Product } from "./types";
import {
  findExpensePurchaseLinePriceAlerts,
  sanitizeExpensePurchaseLines,
} from "./expenses";
import {
  productsWithExpenseCosts,
  reviewExpenseCatalogCosts,
} from "./expense-catalog-costs";
import { currentPriceSource } from "./product-price-sources";
import { buildScannedExpenseDurableTransition } from "./scanned-expense-durability";
import { prepareCentralScannedExpenseBundle } from "./central-business-authority/expense-bundle-preparation";
const now = "2026-09-02T10:00:00.000Z";
const product: Product = {
  id: "synthetic-cost-product",
  key: "motor 20 17",
  name: "Motor 20/17",
  sku: "SYN-20",
  family: "Motores",
  subfamily: "Radio",
  unit: "ud",
  cost: 65,
  pvp: 100,
  supplierId: "synthetic-supplier",
  supplierName: "Proveedor sintético",
  sales: {
    unit: "ud",
    unitPrice: 150,
    ivaPercent: 21,
    description: "Motor para venta",
  },
  purchase: {
    unit: "ud",
    listPrice: 100,
    discountPercent: 35,
    netUnitCost: 65,
    supplierId: "synthetic-supplier",
    supplierName: "Proveedor sintético",
    supplierReference: "SYN-20",
    purchaseToSaleFactor: 1,
  },
  attributes: [{ key: "color", label: "Color", value: "Blanco" }],
  notes: "Dato manual que se conserva",
  aliases: ["Motor modelo 20"],
  imageDataUrl: "data:image/png;base64,synthetic",
  source: "manual",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};
const invoice: Expense = {
  id: "synthetic-new-expense",
  date: "2026-09-01",
  supplierId: "synthetic-supplier",
  supplierName: "Proveedor sintético",
  description: "Compra sintética",
  amount: 67.6,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Transferencia",
  origin: "scan",
  businessKind: "purchase_invoice",
  purchaseDocument: { invoiceNumber: "SYN/002", issueDate: "2026-09-01" },
  purchaseLines: [
    {
      id: "synthetic-line",
      description: "Motor 20/17",
      supplierReference: "SYN-20",
      unit: "ud",
      quantity: 1,
      unitPrice: 104,
      discountPercent: 35,
      total: 67.6,
      catalogProduct: false,
    },
  ],
  createdAt: now,
};
const input = (
  expense = invoice,
  products = [product],
  expenses: Expense[] = [],
) => ({ expense, products, expenses, now });
const data = (): AppData => ({
  ...EMPTY_DATA,
  products: [structuredClone(product)],
  expenses: [],
  suppliers: [],
});
describe("expense-backed catalogue costs", () => {
  it("updates a known cost atomically without re-admitting or changing commercial data", () => {
    const initial = data(),
      before = structuredClone(initial);
    const result = buildScannedExpenseDurableTransition({
      data: initial,
      expense: (({ id, createdAt, ...draft }) => {
        void id;
        void createdAt;
        return draft;
      })(invoice),
      operationId: "synthetic-cost-save",
      now,
    });
    expect(result.data.expenses).toHaveLength(1);
    const updated = result.data.products[0];
    expect(updated.cost).toBe(67.6);
    expect(updated.purchase).toMatchObject({
      listPrice: 104,
      discountPercent: 35,
      netUnitCost: 67.6,
      purchaseToSaleFactor: 1,
    });
    for (const key of [
      "id",
      "name",
      "key",
      "sku",
      "family",
      "subfamily",
      "source",
      "createdAt",
      "sales",
      "attributes",
      "notes",
      "imageDataUrl",
      "aliases",
    ] as const)
      expect(updated[key]).toEqual(product[key]);
    expect(currentPriceSource(updated)).toMatchObject({
      kind: "supplier_invoice",
      documentNumber: "SYN/002",
      expenseId: result.value.expense.id,
      lineId: "synthetic-line",
      netUnitCost: 67.6,
      supplierName: "Proveedor sintético",
    });
    expect(initial).toEqual(before);
    const prepared = prepareCentralScannedExpenseBundle({
      data: initial,
      expense: invoice,
      operationId: "synthetic-cost-edit",
      now,
    });
    expect(prepared.ok).toBe(false); // Editing an expense absent from the baseline never creates it.
  });
  it("includes the exact product payload in the central expense bundle with a known version", () => {
    const initial = {
      ...data(),
      expenses: [{ ...invoice, amount: 65, purchaseLines: [] }],
    };
    const result = prepareCentralScannedExpenseBundle({
      data: initial,
      expense: invoice,
      operationId: "synthetic-cost-bundle",
      now,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mutations.map((m) => [m.entityType, m.expectation])).toEqual([
      ["expense", "known"],
      ["product", "known"],
    ]);
    expect(result.mutations[1].payload).toEqual(
      JSON.parse(JSON.stringify(result.transition.data.products[0])),
    );
    expect(result.transition.data.products[0].sales).toEqual(product.sales);
  });
  it("flags a missing discount against the SL catalogue even without prior SL invoices", () => {
    const expense = {
      ...invoice,
      amount: 104,
      purchaseLines: [
        {
          ...invoice.purchaseLines![0],
          discountPercent: undefined,
          total: 104,
        },
      ],
    };
    const alerts = findExpensePurchaseLinePriceAlerts({
      currentLines: expense.purchaseLines,
      currentExpenseAmount: 104,
      currentExpenseDate: expense.date,
      products: [product],
      expenses: [],
      supplierId: expense.supplierId,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      baselineOrigin: "catalog",
      previousNetUnitCost: 65,
      currentNetUnitCost: 104,
      missingDiscount: true,
      previousDiscountPercent: 35,
      currentDiscountPercent: 0,
    });
    expect(reviewExpenseCatalogCosts(input(expense))[0]).toMatchObject({
      willUpdate: false,
      needsReview: true,
      canChoose: true,
    });
    expect(productsWithExpenseCosts(input(expense))[0]).toEqual(product);
    const accepted = {
      ...expense,
      purchaseLines: [{ ...expense.purchaseLines[0], updateCatalogCost: true }],
    };
    expect(productsWithExpenseCosts(input(accepted))[0].cost).toBe(104);
  });
  it("can keep a cost despite a small change, and never changes an existing PVP", () => {
    const expense = {
      ...invoice,
      purchaseLines: [
        { ...invoice.purchaseLines![0], updateCatalogCost: false },
      ],
    };
    expect(productsWithExpenseCosts(input(expense))[0]).toEqual(product);
    expect(productsWithExpenseCosts(input())[0].sales?.unitPrice).toBe(150);
  });
  it("never confuses suppliers, model numbers, references or units", () => {
    for (const patch of [
      { supplierReference: "SYN-30", description: "Motor 30/17" },
      { supplierReference: "SYN-30" },
      { unit: "m2" },
    ]) {
      const expense = {
        ...invoice,
        purchaseLines: [{ ...invoice.purchaseLines![0], ...patch }],
      };
      expect(productsWithExpenseCosts(input(expense))[0]).toEqual(product);
    }
    expect(
      productsWithExpenseCosts(
        input({ ...invoice, supplierId: "other-supplier" }),
      )[0],
    ).toEqual(product);
    expect(
      reviewExpenseCatalogCosts(
        input({
          ...invoice,
          purchaseLines: [{ ...invoice.purchaseLines![0], unit: "m2" }],
        }),
      )[0].reason,
    ).toContain("unidad");
    const duplicate = { ...product, id: "another-matching-product" };
    expect(
      reviewExpenseCatalogCosts(input(invoice, [product, duplicate]))[0],
    ).toMatchObject({ willUpdate: false, needsReview: true, canChoose: false });
  });
  it("preserves chronology, credits and actual fiscal amounts", () => {
    const latest = { ...invoice, id: "latest-expense", date: "2026-10-01" };
    expect(
      productsWithExpenseCosts(input(invoice, [product], [latest]))[0],
    ).toEqual(product);
    for (const expense of [
      { ...invoice, amount: -67.6 },
      {
        ...invoice,
        purchaseLines: [{ ...invoice.purchaseLines![0], total: -67.6 }],
      },
      {
        ...invoice,
        purchaseLines: [{ ...invoice.purchaseLines![0], netUnitPrice: -1 }],
      },
    ]) {
      const initial = { ...data(), expenses: [expense] };
      const transition = buildScannedExpenseDurableTransition({
        data: initial,
        expense,
        operationId: "synthetic-credit-cost",
        now,
      });
      expect(transition.value.expense).toEqual(expense);
      expect(transition.data.products[0]).toEqual(product);
    }
  });
  it("does not replace a newer manually selected or tariff-backed cost", () => {
    const updated = productsWithExpenseCosts(input())[0];
    const old = {
      ...invoice,
      id: "old-expense",
      date: "2026-08-01",
      purchaseLines: [
        { ...invoice.purchaseLines![0], updateCatalogCost: true },
      ],
    };
    expect(productsWithExpenseCosts(input(old, [updated]))[0]).toEqual(updated);
  });

  it("does not let editing an earlier invoice overwrite a later purchase on the same day", () => {
    const older = { ...invoice, createdAt: "2026-09-02T08:00:00.000Z" };
    const later = {
      ...invoice,
      id: "synthetic-later-same-day",
      createdAt: "2026-09-02T09:00:00.000Z",
    };
    expect(
      productsWithExpenseCosts(input(older, [product], [older, later]))[0],
    ).toEqual(product);
  });
  it("rejects inconsistent extracted net prices and conflicting lines instead of last-line-wins", () => {
    const wrong = {
      ...invoice,
      purchaseLines: [{ ...invoice.purchaseLines![0], netUnitPrice: 90 }],
    };
    expect(reviewExpenseCatalogCosts(input(wrong))[0]).toMatchObject({
      willUpdate: false,
      needsReview: true,
      canChoose: false,
    });
    const second = {
      ...invoice.purchaseLines![0],
      id: "second-line",
      unitPrice: 106,
      total: 68.9,
    };
    const multiple = {
      ...invoice,
      purchaseLines: [invoice.purchaseLines![0], second],
    };
    expect(
      reviewExpenseCatalogCosts(input(multiple)).every(
        (r) => !r.willUpdate && r.needsReview,
      ),
    ).toBe(true);
    const chooseOne = {
      ...multiple,
      purchaseLines: [
        { ...multiple.purchaseLines[0], updateCatalogCost: true },
        second,
      ],
    };
    expect(productsWithExpenseCosts(input(chooseOne))[0].cost).toBe(67.6);
    const chooseBoth = {
      ...multiple,
      purchaseLines: multiple.purchaseLines.map((l) => ({
        ...l,
        updateCatalogCost: true,
      })),
    };
    expect(() => productsWithExpenseCosts(input(chooseBoth))).toThrow(
      "una sola línea",
    );
  });
  it("keeps invoice provenance, source variants and idempotency across JSON key order", () => {
    const first = productsWithExpenseCosts(input())[0];
    const sortedSource = Object.fromEntries(
      Object.entries(first.priceSources![0]).reverse(),
    ) as unknown as NonNullable<Product["priceSources"]>[number];
    const reordered = { ...first, priceSources: [sortedSource] };
    const second = productsWithExpenseCosts({
      ...input(invoice, [reordered]),
      now: "2026-09-03T10:00:00.000Z",
    })[0];
    expect(second.priceSources).toHaveLength(1);
    expect(second.priceSources![0]).toEqual(sortedSource);
    const correction = {
      ...invoice,
      purchaseLines: [
        { ...invoice.purchaseLines![0], unitPrice: 105, total: 68.25 },
      ],
    };
    const corrected = productsWithExpenseCosts(input(correction, [first]))[0];
    expect(corrected.priceSources).toHaveLength(2);
    expect(corrected.priceSources![0]).toEqual(first.priceSources![0]);
    expect(currentPriceSource(corrected)?.netUnitCost).toBe(68.25);
  });
  it("preserves the explicit decision through sanitizing purchase lines", () => {
    expect(
      sanitizeExpensePurchaseLines([
        { ...invoice.purchaseLines![0], updateCatalogCost: false },
      ])[0].updateCatalogCost,
    ).toBe(false);
  });
});
