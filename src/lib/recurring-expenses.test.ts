import { describe, expect, it } from "vitest";
import {
  collectNextRecurringOccurrencePreviews,
  collectRecurringOccurrencePreviews,
  expenseFromRecurring,
  getDueSoonRecurringAlerts,
  listRecurringOccurrenceDates,
  recurringExpenseTotals,
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

  it("resuelve inicio y mediados de mes", () => {
    expect(resolveDueDate(2026, 6, { kind: "start_of_month" })).toBe(
      "2026-06-01",
    );
    expect(resolveDueDate(2026, 6, { kind: "mid_of_month" })).toBe("2026-06-15");
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

describe("collectRecurringOccurrencePreviews", () => {
  it("lista cargos futuros no generados", () => {
    const recurring = template({
      frequency: "monthly",
      dueTiming: { kind: "day_of_month", day: 20 },
      startDate: "2026-06-01",
    });
    const previews = collectRecurringOccurrencePreviews(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-06-10",
      60,
    );
    expect(previews.some((p) => p.date === "2026-06-20" && !p.generated)).toBe(
      true,
    );
    expect(previews[0]?.ivaPercent).toBe(0);
  });
});

describe("collectNextRecurringOccurrencePreviews", () => {
  it("muestra solo el siguiente cargo de cada gasto fijo", () => {
    const monthly = template({
      id: "monthly",
      frequency: "monthly",
      dueTiming: { kind: "day_of_month", day: 10 },
      startDate: "2026-01-01",
    });
    const annual = template({
      id: "annual",
      description: "Seguro anual",
      frequency: "annual",
      dueMonth: 9,
      dueTiming: { kind: "day_of_month", day: 1 },
      startDate: "2026-01-01",
    });

    const previews = collectNextRecurringOccurrencePreviews(
      { ...EMPTY_DATA, recurringExpenses: [monthly, annual] },
      "2026-07-01",
      120,
    );

    expect(previews.map((preview) => preview.templateId)).toEqual([
      "monthly",
      "annual",
    ]);
    expect(previews.map((preview) => preview.date)).toEqual([
      "2026-07-10",
      "2026-09-01",
    ]);
  });
});

describe("recurringExpenseTotals", () => {
  it("calcula el total a pagar con IVA incluido", () => {
    const totals = recurringExpenseTotals(
      template({ frequency: "monthly", amount: 64.46, ivaPercent: 21 }),
    );

    expect(totals).toEqual({
      base: 64.46,
      iva: 13.54,
      total: 78,
      ivaPercent: 21,
    });
  });

  it("respeta usuarios sin IVA", () => {
    const totals = recurringExpenseTotals(
      template({ frequency: "monthly", amount: 64.46, ivaPercent: 21 }),
      true,
    );

    expect(totals.total).toBe(64.46);
    expect(totals.ivaPercent).toBe(0);
  });

  it("trata los gastos no fiscales como importe íntegro sin IVA", () => {
    const totals = recurringExpenseTotals(
      template({
        frequency: "monthly",
        amount: 120,
        ivaPercent: 21,
        deductibility: "non_deductible",
      }),
    );

    expect(totals).toEqual({
      base: 120,
      iva: 0,
      total: 120,
      ivaPercent: 0,
    });
  });
});

describe("getDueSoonRecurringAlerts", () => {
  it("avisa de cargos en los próximos 7 días", () => {
    const recurring = template({
      frequency: "monthly",
      dueTiming: { kind: "day_of_month", day: 15 },
      startDate: "2026-06-01",
    });
    const alerts = getDueSoonRecurringAlerts(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-06-10",
      7,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.date).toBe("2026-06-15");
    expect(alerts[0]?.daysUntil).toBe(5);
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

  it("materializa gastos no fiscales con IVA 0", () => {
    const recurring = template({
      frequency: "monthly",
      amount: 120,
      ivaPercent: 21,
      deductibility: "non_deductible",
    });

    const expense = expenseFromRecurring(recurring, "2026-07-31");

    expect(expense.ivaPercent).toBe(0);
    expect(expense.deductibility).toBe("non_deductible");
    expect(expense.amount).toBe(120);
  });
});
