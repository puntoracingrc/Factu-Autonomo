import { describe, expect, it } from "vitest";
import {
  filterExpensesByQuarter,
  getCurrentQuarter,
  getQuarterFromDate,
  isDateInQuarter,
  quarterLabel,
} from "./periods";
import type { Expense } from "./types";

describe("periods", () => {
  it("detecta trimestre por fecha", () => {
    expect(getQuarterFromDate("2026-02-15")).toEqual({ year: 2026, quarter: 1 });
    expect(getQuarterFromDate("2026-08-01")).toEqual({ year: 2026, quarter: 3 });
  });

  it("filtra gastos del trimestre", () => {
    const expenses: Expense[] = [
      {
        id: "1",
        date: "2026-04-10",
        supplierName: "A",
        description: "Abril",
        amount: 10,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        createdAt: "2026-04-10",
      },
      {
        id: "2",
        date: "2026-07-01",
        supplierName: "B",
        description: "Julio",
        amount: 20,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Tarjeta",
        createdAt: "2026-07-01",
      },
    ];
    expect(filterExpensesByQuarter(expenses, 2026, 2)).toHaveLength(1);
    expect(filterExpensesByQuarter(expenses, 2026, 3)).toHaveLength(1);
  });

  it("genera etiqueta legible", () => {
    expect(quarterLabel(2026, 2)).toBe("2.º trimestre 2026");
  });

  it("valida pertenencia a trimestre", () => {
    expect(isDateInQuarter("2026-05-01", 2026, 2)).toBe(true);
    expect(isDateInQuarter("2026-05-01", 2026, 1)).toBe(false);
  });

  it("obtiene trimestre actual", () => {
    const current = getCurrentQuarter(new Date("2026-11-15"));
    expect(current).toEqual({ year: 2026, quarter: 4 });
  });
});
