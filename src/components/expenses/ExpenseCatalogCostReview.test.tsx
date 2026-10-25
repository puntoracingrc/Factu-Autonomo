import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ExpenseCatalogCostReview } from "./ExpenseCatalogCostReview";
import { ExpensePriceAlerts } from "./ExpensePriceAlerts";
import { reviewExpenseCatalogCosts } from "@/lib/expense-catalog-costs";
import { findExpensePurchaseLinePriceAlerts } from "@/lib/expenses";
import type { Expense, Product } from "@/lib/types";
const product: Product = {
  id: "synthetic-ui-product",
  key: "motor demo",
  name: "Motor demo",
  family: "Motores",
  unit: "ud",
  sales: { unitPrice: 150 },
  purchase: {
    unit: "ud",
    supplierName: "Proveedor demo",
    listPrice: 100,
    discountPercent: 35,
    netUnitCost: 65,
  },
  source: "manual",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
const expense: Expense = {
  id: "synthetic-ui-expense",
  date: "2026-09-01",
  description: "Factura demo",
  supplierName: "Proveedor demo",
  amount: 100,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Transferencia",
  createdAt: "2026-09-01",
  purchaseLines: [
    {
      id: "synthetic-ui-line",
      description: "Motor demo",
      quantity: 1,
      unitPrice: 100,
      unit: "ud",
      catalogProduct: false,
    },
  ],
};
describe("expense cost review UI", () => {
  it("shows a missing discount and keeps the cost update checkbox unchecked", () => {
    const reviews = reviewExpenseCatalogCosts({
      expense,
      products: [product],
      expenses: [],
    });
    const markup = renderToStaticMarkup(
      <ExpenseCatalogCostReview reviews={reviews} onChange={() => {}} />,
    );
    expect(markup).toContain("Se conservarán los costes actuales");
    expect(markup).toContain("Actualizar coste de Motor demo");
    expect(markup).not.toContain('checked=""');
    const alerts = findExpensePurchaseLinePriceAlerts({
      currentLines: expense.purchaseLines!,
      currentExpenseAmount: 100,
      products: [product],
      expenses: [],
      supplierName: expense.supplierName,
    });
    const warning = renderToStaticMarkup(
      <ExpensePriceAlerts alerts={alerts} />,
    );
    expect(warning).toContain("Posible descuento no aplicado");
    expect(warning).toContain("35 % → 0 %");
    expect(warning).toContain("65,00");
    expect(warning).toContain("100,00");
  });
  it("shows the explicit choice to adopt a reviewed cost", () => {
    const accepted = {
      ...expense,
      purchaseLines: expense.purchaseLines!.map((line) => ({
        ...line,
        updateCatalogCost: true,
      })),
    };
    const markup = renderToStaticMarkup(
      <ExpenseCatalogCostReview
        reviews={reviewExpenseCatalogCosts({
          expense: accepted,
          products: [product],
          expenses: [],
        })}
        onChange={() => {}}
      />,
    );
    expect(markup).toContain('checked=""');
    expect(markup).toContain("Se actualizará el coste de 1 producto");
    expect(markup).toContain("El PVP de venta se mantiene");
  });
});
