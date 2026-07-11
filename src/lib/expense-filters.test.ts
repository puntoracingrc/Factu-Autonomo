import { describe, expect, it } from "vitest";
import {
  aggregateExpensesBySupplier,
  filterExpensesByPeriod,
  matchesSupplierFilter,
  supplierFilterKey,
} from "./expense-filters";
import type { Expense } from "./types";

const expenses: Expense[] = [
  {
    id: "1",
    date: "2026-06-10",
    supplierId: "s1",
    supplierName: "METALURGICA ARANDES S.L.",
    description: "Material",
    amount: 32,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    createdAt: "2026-06-10",
  },
  {
    id: "2",
    date: "2026-05-05",
    supplierId: "s1",
    supplierName: "METALURGICA ARANDES S.L.",
    description: "Persiana",
    amount: 85,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    createdAt: "2026-05-05",
  },
  {
    id: "3",
    date: "2025-11-14",
    supplierName: "GAME STORES IBERIA S.L.",
    description: "Videojuegos",
    amount: 47.22,
    ivaPercent: 21,
    category: "Otros",
    paymentMethod: "Efectivo",
    createdAt: "2025-11-14",
  },
];

describe("filterExpensesByPeriod", () => {
  it("filtra por mes", () => {
    const filtered = filterExpensesByPeriod(expenses, "month", 2026, 6, 2);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("filtra por año", () => {
    const filtered = filterExpensesByPeriod(expenses, "year", 2026, 6, 2);
    expect(filtered).toHaveLength(2);
  });
});

describe("aggregateExpensesBySupplier", () => {
  it("agrupa y calcula porcentajes", () => {
    const slices = aggregateExpensesBySupplier(expenses, false);
    expect(slices.length).toBeGreaterThanOrEqual(2);
    const arandes = slices.find((s) => s.label.includes("ARANDES"));
    expect(arandes?.amount).toBeGreaterThan(100);
    const totalPercent = slices.reduce((sum, s) => sum + s.percent, 0);
    expect(totalPercent).toBeCloseTo(100, 1);
  });

  it("solo entrega saldos netos positivos al donut", () => {
    const slices = aggregateExpensesBySupplier(
      [
        ...expenses,
        {
          ...expenses[0],
          id: "credit-s1",
          amount: -117,
          description: "Abono total Arandes",
        },
        {
          ...expenses[0],
          id: "credit-only",
          supplierId: "supplier-credit",
          supplierName: "Proveedor con saldo a favor",
          amount: -100,
          description: "Abono sin compras",
        },
      ],
      false,
    );

    expect(slices.some((slice) => slice.key === "id:s1")).toBe(false);
    expect(
      slices.some((slice) => slice.key === "id:supplier-credit"),
    ).toBe(false);
    expect(slices.every((slice) => slice.amount > 0)).toBe(true);
    expect(slices.every((slice) => slice.percent >= 0)).toBe(true);
    expect(slices.reduce((sum, slice) => sum + slice.percent, 0)).toBeCloseTo(
      100,
      6,
    );
  });

  it("el grupo Otros no incluye proveedores omitidos por tener saldo a favor", () => {
    const positives = Array.from({ length: 9 }, (_, index) => ({
      ...expenses[0],
      id: `positive-${index}`,
      supplierId: `supplier-${index}`,
      supplierName: `Proveedor ${index}`,
      amount: 100 - index,
    }));
    const credit = {
      ...expenses[0],
      id: "credit-only",
      supplierId: "supplier-credit",
      supplierName: "Proveedor con saldo a favor",
      amount: -100,
    };
    const slices = aggregateExpensesBySupplier([...positives, credit], false);
    const others = slices.find((slice) => slice.key === "__otros__");

    expect(others?.memberKeys).toEqual(["id:supplier-7", "id:supplier-8"]);
    expect(matchesSupplierFilter(positives[8], "__otros__", slices)).toBe(true);
    expect(matchesSupplierFilter(credit, "__otros__", slices)).toBe(false);
  });
});

describe("supplierFilterKey", () => {
  it("usa id cuando existe", () => {
    expect(supplierFilterKey(expenses[0])).toBe("id:s1");
    expect(
      matchesSupplierFilter(expenses[0], supplierFilterKey(expenses[0])),
    ).toBe(true);
    expect(matchesSupplierFilter(expenses[2], "id:s1")).toBe(false);
  });
});
