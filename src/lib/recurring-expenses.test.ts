import { describe, expect, it } from "vitest";
import {
  listRecurringOccurrenceDates,
  resolveDueDate,
  syncRecurringExpenses,
} from "./recurring-expenses";
import { EMPTY_DATA } from "./types";
import type { RecurringExpense } from "./types";

function template(
  partial: Partial<RecurringExpense> & Pick<RecurringExpense, "frequency">,
): RecurringExpense {
  return {
    id: "r1",
    supplierName: "TGSS",
    description: "Cuota autónomos",
    amount: 300,
    ivaPercent: 0,
    category: "Profesionales",
    paymentMethod: "Domiciliación",
    dueTiming: { kind: "end_of_month" },
    duration: { kind: "indefinite" },
    startDate: "2026-01-01",
    enabled: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...partial,
  };
}

describe("resolveDueDate", () => {
  it("usa el último día del mes", () => {
    expect(resolveDueDate(2026, 2, { kind: "end_of_month" })).toBe("2026-02-28");
  });

  it("ajusta días que no existen en el mes", () => {
    expect(resolveDueDate(2026, 2, { kind: "day_of_month", day: 31 })).toBe(
      "2026-02-28",
    );
  });
});

describe("listRecurringOccurrenceDates", () => {
  it("genera fin de mes mensual", () => {
    const dates = listRecurringOccurrenceDates(
      template({ frequency: "monthly" }),
      "2026-03-31",
    );
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("limita por número de ocurrencias", () => {
    const dates = listRecurringOccurrenceDates(
      template({
        frequency: "monthly",
        dueTiming: { kind: "day_of_month", day: 10 },
        startDate: "2026-01-01",
        duration: { kind: "occurrences", count: 5 },
      }),
      "2026-12-31",
    );
    expect(dates).toHaveLength(5);
    expect(dates[0]).toBe("2026-01-10");
    expect(dates[4]).toBe("2026-05-10");
  });

  it("genera fechas anuales", () => {
    const dates = listRecurringOccurrenceDates(
      template({
        frequency: "annual",
        dueMonth: 3,
        dueTiming: { kind: "day_of_month", day: 15 },
        startDate: "2026-01-01",
      }),
      "2028-12-31",
    );
    expect(dates).toEqual(["2026-03-15", "2027-03-15", "2028-03-15"]);
  });
});

describe("syncRecurringExpenses", () => {
  it("materializa gastos sin duplicar", () => {
    const recurring = template({
      frequency: "monthly",
      duration: { kind: "occurrences", count: 2 },
    });
    const first = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-02-28",
    );
    expect(first.expenses).toHaveLength(2);

    const second = syncRecurringExpenses(first, "2026-02-28");
    expect(second.expenses).toHaveLength(2);
  });
});
