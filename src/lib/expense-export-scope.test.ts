import { describe, expect, it } from "vitest";
import type { Expense } from "./types";
import { filterExpensesForExport } from "./expense-export-scope";

function expense(
  id: string,
  deductibility?: Expense["deductibility"],
): Expense {
  return {
    id,
    date: "2026-07-19",
    supplierName: "Proveedor",
    description: id,
    amount: 10,
    ivaPercent: 21,
    deductibility,
    category: "Otros",
    paymentMethod: "Tarjeta",
    createdAt: "2026-07-19T00:00:00.000Z",
  };
}

describe("expense export scope", () => {
  const expenses = [
    expense("legacy"),
    expense("deductible", "deductible"),
    expense("business", "non_deductible"),
    expense("personal", "personal"),
  ];

  it("keeps the advisor default restricted to deductible expenses", () => {
    expect(
      filterExpensesForExport(expenses, "deductible").map(({ id }) => id),
    ).toEqual(["legacy", "deductible"]);
  });

  it("can include all business expenses without personal movements", () => {
    expect(
      filterExpensesForExport(expenses, "business").map(({ id }) => id),
    ).toEqual(["legacy", "deductible", "business"]);
  });

  it("only includes personal movements when the user explicitly selects all", () => {
    expect(
      filterExpensesForExport(expenses, "all").map(({ id }) => id),
    ).toEqual(["legacy", "deductible", "business", "personal"]);
  });
});
