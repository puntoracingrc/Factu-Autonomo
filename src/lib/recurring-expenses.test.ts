import { describe, expect, it } from "vitest";
import {
  applyRecurringExpenseChangeToData,
  collectNextRecurringOccurrencePreviews,
  collectRecurringOccurrencePreviews,
  deleteExpenseFromData,
  deleteRecurringExpenseFromData,
  expenseFromRecurring,
  getDueSoonRecurringAlerts,
  isRecurringExpenseApplicableOn,
  listRecurringOccurrenceDates,
  normalizeRecurringOccurrenceCount,
  normalizeRecurringExpense,
  previewRecurringExpenseChangeToData,
  recurringAnnualDueMonth,
  recurringDueLabel,
  recurringScheduleAnchorDate,
  recurringExpenseStatusOn,
  recurringExpenseTotals,
  resolveDueDate,
  saveFixedExpenseWithRecurringTemplateToData,
  syncRecurringExpenses,
  type RecurringExpenseDraft,
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

function draft(
  item: RecurringExpense,
  overrides: Partial<RecurringExpenseDraft> = {},
): RecurringExpenseDraft {
  return {
    supplierName: item.supplierName,
    description: item.description,
    amount: item.amount,
    ivaPercent: item.ivaPercent,
    deductibility: item.deductibility,
    category: item.category,
    paymentMethod: item.paymentMethod,
    frequency: item.frequency,
    dueTiming: item.dueTiming,
    dueMonth: item.dueMonth,
    duration: item.duration,
    startDate: item.startDate,
    enabled: item.enabled,
    notes: item.notes,
    ...overrides,
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

describe("recurringScheduleAnchorDate", () => {
  it("usa startDate para datos legacy o anclas inválidas", () => {
    const legacy = template({ frequency: "quarterly", startDate: "2026-01-01" });

    expect(recurringScheduleAnchorDate(legacy)).toBe("2026-01-01");
    expect(
      recurringScheduleAnchorDate({
        ...legacy,
        scheduleAnchorDate: "2026-02-31",
      }),
    ).toBe("2026-01-01");
    expect(
      recurringScheduleAnchorDate({
        ...legacy,
        scheduleAnchorDate: "2026-04-01",
      }),
    ).toBe("2026-01-01");
  });
});

describe("recurringDueLabel", () => {
  it("describe la regla anual sin fijarla a un año no bisiesto", () => {
    expect(
      recurringDueLabel(
        template({
          frequency: "annual",
          dueMonth: 2,
          dueTiming: { kind: "end_of_month" },
        }),
      ),
    ).toBe("Último día de febrero");
    expect(
      recurringDueLabel(
        template({
          frequency: "annual",
          dueMonth: 2,
          dueTiming: { kind: "day_of_month", day: 31 },
        }),
      ),
    ).toBe("Día 31 de febrero (se ajusta al último día disponible)");
  });

  it("conserva el mes semántico de una recurrencia anual legacy", () => {
    const legacy = template({
      frequency: "annual",
      dueMonth: undefined,
      dueTiming: { kind: "end_of_month" },
      startDate: "2027-07-10",
    });

    expect(recurringAnnualDueMonth(legacy)).toBe(7);
    expect(recurringDueLabel(legacy)).toBe("Último día de julio");
    expect(
      listRecurringOccurrenceDates(legacy, "2028-12-31"),
    ).toEqual(["2027-07-31", "2028-07-31"]);
  });

  it("descarta meses anuales inválidos sin cambiar el mes de inicio", () => {
    for (const dueMonth of [0, 13, 2.5, Number.NaN]) {
      expect(
        recurringAnnualDueMonth({ dueMonth, startDate: "2027-07-10" }),
      ).toBe(7);
    }
    expect(
      recurringAnnualDueMonth({ dueMonth: undefined, startDate: "sin-fecha" }),
    ).toBe(1);
  });
});

describe("saveFixedExpenseWithRecurringTemplateToData", () => {
  it("guarda juntos el gasto escaneado y su regla mensual sin duplicar el cargo", () => {
    const ids = ["fixed-template", "fixed-expense"];
    const result = saveFixedExpenseWithRecurringTemplateToData(
      EMPTY_DATA,
      {
        date: "2026-07-11",
        origin: "scan",
        businessKind: "fixed",
        supplierName: "Google Commerce Limited",
        description: "Suscripción mensual de streaming",
        amount: 13.21,
        ivaPercent: 21,
        category: "Suscripciones",
        paymentMethod: "Tarjeta",
        purchaseDocument: { invoiceNumber: "GPA-ANONIMIZADO" },
      },
      {
        supplierName: "Google Commerce Limited",
        description: "Suscripción mensual de streaming",
        amount: 13.21,
        ivaPercent: 21,
        category: "Suscripciones",
        paymentMethod: "Tarjeta",
        frequency: "monthly",
        dueTiming: { kind: "end_of_month" },
        duration: { kind: "indefinite" },
        startDate: "2026-07-11",
        enabled: true,
      },
      {
        now: "2026-07-11T20:05:00.000Z",
        newId: () => ids.shift() ?? "unexpected-id",
        referenceDate: "2026-07-31",
      },
    );

    expect(result.recurringExpense).toMatchObject({
      id: "fixed-template",
      frequency: "monthly",
      startDate: "2026-07-11",
    });
    expect(result.data.recurringExpenses).toEqual([
      result.recurringExpense,
    ]);
    expect(result.data.expenses).toHaveLength(1);
    expect(result.data.expenses[0]).toMatchObject({
      id: "fixed-expense",
      origin: "scan",
      businessKind: "fixed",
      recurringExpenseId: "fixed-template",
      recurringOccurrenceKey: "fixed-template:2026-07-31",
      purchaseDocument: { invoiceNumber: "GPA-ANONIMIZADO" },
    });
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

  it("normaliza una duración decimal al mismo entero en generación y vigencia", () => {
    const current = template({
      frequency: "monthly",
      startDate: "2026-01-01",
      duration: { kind: "occurrences", count: 1.5 },
    });

    expect(normalizeRecurringOccurrenceCount(1.5)).toBe(1);
    expect(listRecurringOccurrenceDates(current, "2026-12-31")).toEqual([
      "2026-01-31",
    ]);
    expect(isRecurringExpenseApplicableOn(current, "2026-01-31")).toBe(true);
    expect(isRecurringExpenseApplicableOn(current, "2026-02-01")).toBe(false);
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

  it("aplica todas las opciones anuales en el mes de vencimiento", () => {
    const cases = [
      [
        { kind: "start_of_month" } as const,
        ["2027-02-01", "2028-02-01"],
      ],
      [
        { kind: "mid_of_month" } as const,
        ["2027-02-15", "2028-02-15"],
      ],
      [
        { kind: "end_of_month" } as const,
        ["2027-02-28", "2028-02-29"],
      ],
      [
        { kind: "day_of_month", day: 20 } as const,
        ["2027-02-20", "2028-02-20"],
      ],
      [
        { kind: "day_of_month", day: 31 } as const,
        ["2027-02-28", "2028-02-29"],
      ],
    ] as const;

    for (const [dueTiming, expected] of cases) {
      expect(
        listRecurringOccurrenceDates(
          template({
            frequency: "annual",
            dueMonth: 2,
            dueTiming,
            startDate: "2027-01-01",
          }),
          "2028-12-31",
        ),
      ).toEqual(expected);
    }
  });
});

describe("isRecurringExpenseApplicableOn", () => {
  it("respeta pausa, inicio y final inclusivo", () => {
    const current = template({
      frequency: "monthly",
      startDate: "2026-03-01",
      duration: { kind: "until_date", endDate: "2026-06-30" },
    });

    expect(isRecurringExpenseApplicableOn(current, "2026-02-28")).toBe(false);
    expect(isRecurringExpenseApplicableOn(current, "2026-06-30")).toBe(true);
    expect(isRecurringExpenseApplicableOn(current, "2026-07-01")).toBe(false);
    expect(
      isRecurringExpenseApplicableOn(
        { ...current, enabled: false },
        "2026-04-01",
      ),
    ).toBe(false);
  });

  it("cierra la duración por ocurrencias tras sus periodos configurados", () => {
    const quarterly = template({
      frequency: "quarterly",
      startDate: "2026-01-01",
      duration: { kind: "occurrences", count: 2 },
    });

    expect(isRecurringExpenseApplicableOn(quarterly, "2026-06-30")).toBe(true);
    expect(isRecurringExpenseApplicableOn(quarterly, "2026-07-01")).toBe(false);
  });

  it("distingue estado activo, pausado, futuro y agotado con la misma vigencia", () => {
    const active = template({ frequency: "monthly" });
    const future = template({
      frequency: "monthly",
      startDate: "2026-08-01",
    });
    const exhausted = template({
      frequency: "monthly",
      duration: { kind: "occurrences", count: 2 },
    });

    expect(recurringExpenseStatusOn(active, "2026-07-15")).toBe("active");
    expect(
      recurringExpenseStatusOn({ ...active, enabled: false }, "2026-07-15"),
    ).toBe("paused");
    expect(recurringExpenseStatusOn(future, "2026-07-15")).toBe("upcoming");
    expect(recurringExpenseStatusOn(exhausted, "2026-07-15")).toBe("closed");
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

  it("no vuelve a avisar de una ocurrencia excluida", () => {
    const recurring = template({
      id: "r-alert",
      frequency: "monthly",
      dueTiming: { kind: "day_of_month", day: 15 },
      startDate: "2026-06-01",
      occurrenceExclusions: [
        {
          key: "r-alert:2026-06-15",
          excludedAt: "2026-06-10T08:00:00.000Z",
        },
      ],
    });

    const previews = collectRecurringOccurrencePreviews(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-06-10",
      60,
    );

    expect(previews.map((preview) => preview.date)).not.toContain(
      "2026-06-15",
    );
    expect(previews.map((preview) => preview.date)).toContain("2026-07-15");
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

  it("no regenera con otro UUID una ocurrencia borrada al sincronizar de nuevo", () => {
    const recurring = template({
      id: "seguro",
      frequency: "monthly",
      duration: { kind: "occurrences", count: 2 },
    });
    const firstSync = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-02-28",
    );
    const january = firstSync.expenses.find(
      (expense) => expense.recurringOccurrenceKey === "seguro:2026-01-31",
    );
    expect(january).toBeDefined();

    const deleted = deleteExpenseFromData(
      firstSync,
      january!.id,
      "2026-03-01T09:00:00.000Z",
    );
    const afterReloadSync = syncRecurringExpenses(deleted, "2026-02-28");

    expect(
      afterReloadSync.expenses.some(
        (expense) =>
          expense.recurringOccurrenceKey === "seguro:2026-01-31",
      ),
    ).toBe(false);
    expect(afterReloadSync.expenses).toHaveLength(1);
    expect(afterReloadSync.recurringExpenses[0]?.occurrenceExclusions).toEqual([
      {
        key: "seguro:2026-01-31",
        excludedAt: "2026-03-01T09:00:00.000Z",
      },
    ]);
  });

  it("excluye solo el cargo borrado y mantiene el histórico y los siguientes", () => {
    const recurring = template({ id: "alquiler", frequency: "monthly" });
    const synced = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-03-31",
    );
    const february = synced.expenses.find(
      (expense) => expense.recurringOccurrenceKey === "alquiler:2026-02-28",
    );

    const deleted = deleteExpenseFromData(
      synced,
      february!.id,
      "2026-04-01T08:00:00.000Z",
    );
    const nextSync = syncRecurringExpenses(deleted, "2026-04-30");

    expect(
      nextSync.expenses.map((expense) => expense.recurringOccurrenceKey),
    ).toEqual([
      "alquiler:2026-01-31",
      "alquiler:2026-03-31",
      "alquiler:2026-04-30",
    ]);
  });

  it("al borrar un gasto manual no crea exclusiones en las recurrencias", () => {
    const recurring = template({ id: "mutua", frequency: "monthly" });
    const manualExpense = {
      id: "manual-1",
      date: "2026-01-15",
      supplierName: "Papelería",
      description: "Material",
      amount: 20,
      ivaPercent: 21,
      category: "Compras",
      paymentMethod: "Tarjeta",
      origin: "manual" as const,
      createdAt: "2026-01-15T10:00:00.000Z",
    };

    const deleted = deleteExpenseFromData(
      {
        ...EMPTY_DATA,
        expenses: [manualExpense],
        recurringExpenses: [recurring],
      },
      manualExpense.id,
      "2026-02-01T08:00:00.000Z",
    );

    expect(deleted.expenses).toEqual([]);
    expect(deleted.recurringExpenses).toEqual([recurring]);
  });

  it("al borrar la plantilla conserva los cargos históricos", () => {
    const recurring = template({ id: "hosting", frequency: "monthly" });
    const synced = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-02-28",
    );

    const deleted = deleteRecurringExpenseFromData(synced, recurring.id);

    expect(deleted.recurringExpenses).toEqual([]);
    expect(deleted.expenses).toEqual(synced.expenses);
    expect(syncRecurringExpenses(deleted, "2026-03-31").expenses).toEqual(
      synced.expenses,
    );
  });

  it("normaliza y acota exclusiones importadas a la plantilla exacta", () => {
    const recurring = template({
      id: "r-safe",
      frequency: "monthly",
      updatedAt: "2026-03-02T00:00:00.000Z",
      occurrenceExclusions: [
        {
          key: "r-safe:2026-02-28",
          excludedAt: "fecha-invalida",
        },
        {
          key: "otra:2026-02-28",
          excludedAt: "2026-03-01T00:00:00.000Z",
        },
        {
          key: "r-safe:2026-02-31",
          excludedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
    });

    expect(normalizeRecurringExpense(recurring).occurrenceExclusions).toEqual([
      {
        key: "r-safe:2026-02-28",
        excludedAt: "2026-03-02T00:00:00.000Z",
      },
    ]);
  });
});

describe("applyRecurringExpenseChangeToData", () => {
  it("bloquea sin cambios una reprogramación con cargos materializados", () => {
    const recurring = template({
      id: "autonomo",
      frequency: "monthly",
      startDate: "2026-01-01",
    });
    const synced = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-03-31",
    );
    const change = draft(recurring, {
      dueTiming: { kind: "day_of_month", day: 15 },
    });
    const preview = previewRecurringExpenseChangeToData(
      synced,
      recurring.id,
      change,
      recurring.startDate,
      { referenceDate: "2026-03-31" },
    );

    expect(preview).toMatchObject({
      status: "manual_review",
      affectedExpenseCount: 3,
      affectedExclusionCount: 0,
      affectedDates: ["2026-01-31", "2026-02-28", "2026-03-31"],
    });

    const result = applyRecurringExpenseChangeToData(
      synced,
      recurring.id,
      change,
      recurring.startDate,
      {
        now: "2026-07-08T10:00:00.000Z",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );

    expect(result).toMatchObject({ status: "blocked", reason: "manual_review" });
    expect(result.data).toBe(synced);
  });

  it("bloquea exclusiones y cargos posteriores sin reinterpretarlos", () => {
    const recurring = template({
      id: "autonomo",
      frequency: "monthly",
      startDate: "2026-01-01",
    });
    const synced = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-06-30",
    );
    const may = synced.expenses.find(
      (expense) => expense.recurringOccurrenceKey === "autonomo:2026-05-31",
    );
    const withExclusion = deleteExpenseFromData(
      synced,
      may!.id,
      "2026-07-01T08:00:00.000Z",
    );
    const change = draft(recurring, { amount: 350 });
    const preview = previewRecurringExpenseChangeToData(
      withExclusion,
      recurring.id,
      change,
      "2026-05-01",
      { referenceDate: "2026-06-30" },
    );

    expect(preview).toMatchObject({
      status: "manual_review",
      affectedExpenseCount: 1,
      affectedExclusionCount: 1,
      affectedDates: ["2026-05-31", "2026-06-30"],
    });
    const result = applyRecurringExpenseChangeToData(
      withExclusion,
      recurring.id,
      change,
      "2026-05-01",
      {
        now: "2026-07-08T10:00:00.000Z",
        newId: () => "autonomo-v2",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );

    expect(result).toMatchObject({ status: "blocked", reason: "manual_review" });
    expect(result.data).toBe(withExclusion);
  });

  it("abre un tramo mensual seguro sin reescribir el histórico", () => {
    const recurring = template({
      id: "autonomo",
      frequency: "monthly",
      startDate: "2026-01-01",
    });
    const synced = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-03-31",
    );
    const withManualHistory = {
      ...synced,
      expenses: synced.expenses.map((expense, index) =>
        index === 0
          ? {
              ...expense,
              date: "2026-09-09",
              description: "Ajuste manual conservado",
              amount: 999,
            }
          : expense,
      ),
    };
    const historicalExpenses = withManualHistory.expenses;
    const change = draft(recurring, {
      amount: 350,
      dueTiming: { kind: "day_of_month", day: 15 },
    });
    const preview = previewRecurringExpenseChangeToData(
      withManualHistory,
      recurring.id,
      change,
      "2026-04-01",
      { referenceDate: "2026-04-30" },
    );
    expect(preview).toMatchObject({
      status: "ready",
      preservedExpenseCount: 3,
      affectedExpenseCount: 0,
    });

    const result = applyRecurringExpenseChangeToData(
      withManualHistory,
      recurring.id,
      change,
      "2026-04-01",
      {
        now: "2026-04-01T10:00:00.000Z",
        newId: () => "autonomo-v2",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    expect(result.data.recurringExpenses).toHaveLength(2);
    expect(result.data.recurringExpenses[0]?.duration).toEqual({
      kind: "until_date",
      endDate: "2026-03-31",
    });
    expect(result.data.recurringExpenses[1]).toMatchObject({
      id: "autonomo-v2",
      amount: 350,
      startDate: "2026-04-01",
      scheduleAnchorDate: "2026-01-01",
      dueTiming: { kind: "day_of_month", day: 15 },
    });
    expect(result.data.expenses.slice(0, historicalExpenses.length)).toEqual(
      historicalExpenses,
    );
    expect(result.data.expenses.at(-1)).toMatchObject({
      date: "2026-04-15",
      amount: 350,
      recurringExpenseId: "autonomo-v2",
      recurringOccurrenceKey: "autonomo-v2:2026-04-15",
    });
    expect(syncRecurringExpenses(result.data, "2026-04-30")).toBe(result.data);
  });

  it("conserva la cadencia trimestral legacy al cambiar solo el tramo", () => {
    const recurring = template({
      id: "seguro",
      frequency: "quarterly",
      startDate: "2026-01-01",
    });
    const synced = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-04-30",
    );
    const change = draft(recurring, { amount: 350 });
    const preview = previewRecurringExpenseChangeToData(
      synced,
      recurring.id,
      change,
      "2026-05-01",
      { referenceDate: "2026-07-31" },
    );
    const result = applyRecurringExpenseChangeToData(
      synced,
      recurring.id,
      change,
      "2026-05-01",
      {
        now: "2026-05-01T10:00:00.000Z",
        newId: () => "seguro-v2",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    expect(recurringScheduleAnchorDate(result.data.recurringExpenses[1]!)).toBe(
      "2026-01-01",
    );
    expect(
      result.data.expenses.map((expense) => expense.recurringOccurrenceKey),
    ).toEqual([
      "seguro:2026-01-31",
      "seguro:2026-04-30",
      "seguro-v2:2026-07-31",
    ]);
  });

  it("reinicia el ancla al cambiar de frecuencia", () => {
    const recurring = template({
      id: "plan",
      frequency: "quarterly",
      startDate: "2026-01-01",
    });
    const synced = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-04-30",
    );
    const change = draft(recurring, { frequency: "monthly" });
    const preview = previewRecurringExpenseChangeToData(
      synced,
      recurring.id,
      change,
      "2026-05-01",
      { referenceDate: "2026-06-30" },
    );
    const result = applyRecurringExpenseChangeToData(
      synced,
      recurring.id,
      change,
      "2026-05-01",
      {
        now: "2026-05-01T10:00:00.000Z",
        newId: () => "plan-v2",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    expect(result.data.recurringExpenses[1]).toMatchObject({
      frequency: "monthly",
      scheduleAnchorDate: "2026-05-01",
    });
    expect(
      result.data.expenses.map((expense) => expense.recurringOccurrenceKey),
    ).toEqual([
      "plan:2026-01-31",
      "plan:2026-04-30",
      "plan-v2:2026-05-31",
      "plan-v2:2026-06-30",
    ]);
  });

  it("mantiene el histórico anual y genera febrero bisiesto en el tramo nuevo", () => {
    const recurring = template({
      id: "anual",
      frequency: "annual",
      dueMonth: 2,
      dueTiming: { kind: "end_of_month" },
      startDate: "2027-01-01",
    });
    const synced = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2027-02-28",
    );
    const historical = synced.expenses[0];
    const change = draft(recurring, { amount: 450 });
    const preview = previewRecurringExpenseChangeToData(
      synced,
      recurring.id,
      change,
      "2027-03-01",
      { referenceDate: "2028-02-29" },
    );
    const result = applyRecurringExpenseChangeToData(
      synced,
      recurring.id,
      change,
      "2027-03-01",
      {
        now: "2027-03-01T10:00:00.000Z",
        newId: () => "anual-v2",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    expect(result.data.expenses[0]).toEqual(historical);
    expect(result.data.expenses[1]).toMatchObject({
      date: "2028-02-29",
      recurringOccurrenceKey: "anual-v2:2028-02-29",
      amount: 450,
    });
  });

  it("bloquea provenance ambigua y claves duplicadas", () => {
    const recurring = template({ id: "r-safe", frequency: "monthly" });
    const canonical = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-01-31",
    ).expenses[0]!;
    const ambiguous = {
      ...canonical,
      id: "sin-clave",
      recurringOccurrenceKey: undefined,
    };
    const duplicate = { ...canonical, id: "duplicado" };
    const data = {
      ...EMPTY_DATA,
      recurringExpenses: [recurring],
      expenses: [ambiguous, canonical, duplicate],
    };
    const preview = previewRecurringExpenseChangeToData(
      data,
      recurring.id,
      draft(recurring, { amount: 301 }),
      "2026-01-01",
      { referenceDate: "2026-01-31" },
    );

    expect(preview.status).toBe("manual_review");
    expect(preview.manualReview.map((item) => item.reason)).toEqual(
      expect.arrayContaining([
        "ambiguous_provenance",
        "duplicate_occurrence_key",
      ]),
    );
  });

  it("conserva literalmente exclusiones históricas válidas", () => {
    const historicalExclusions = [
      {
        key: "seguro:2026-01-31",
        excludedAt: "2026-02-01T09:00:00.000Z",
      },
      {
        key: "seguro:2025-12-31",
        excludedAt: "2026-01-01T09:00:00.000Z",
      },
    ];
    const recurring = template({
      id: "seguro",
      frequency: "monthly",
      startDate: "2025-12-01",
      occurrenceExclusions: historicalExclusions,
    });
    const data = { ...EMPTY_DATA, recurringExpenses: [recurring] };
    const change = draft(recurring, { amount: 350 });
    const preview = previewRecurringExpenseChangeToData(
      data,
      recurring.id,
      change,
      "2026-02-01",
      { referenceDate: "2026-02-28" },
    );
    expect(preview.status).toBe("ready");

    const result = applyRecurringExpenseChangeToData(
      data,
      recurring.id,
      change,
      "2026-02-01",
      {
        now: "2026-02-01T10:00:00.000Z",
        newId: () => "seguro-v2",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    expect(result.data.recurringExpenses[0]?.occurrenceExclusions).toBe(
      historicalExclusions,
    );
    expect(result.data.recurringExpenses[0]?.occurrenceExclusions).toEqual(
      historicalExclusions,
    );
  });

  it("bloquea exclusiones históricas inválidas o duplicadas", () => {
    const recurring = template({
      id: "seguro",
      frequency: "monthly",
      occurrenceExclusions: [
        {
          key: "seguro:2025-12-31",
          excludedAt: "fecha-invalida",
        },
        {
          key: "seguro:2025-11-30",
          excludedAt: "2025-12-01T09:00:00.000Z",
        },
        {
          key: "seguro:2025-11-30",
          excludedAt: "2025-12-02T09:00:00.000Z",
        },
      ],
    });
    const data = { ...EMPTY_DATA, recurringExpenses: [recurring] };
    const preview = previewRecurringExpenseChangeToData(
      data,
      recurring.id,
      draft(recurring, { amount: 350 }),
      "2026-02-01",
      { referenceDate: "2026-02-28" },
    );

    expect(preview.status).toBe("manual_review");
    expect(preview.manualReview.map((item) => item.reason)).toEqual(
      expect.arrayContaining(["invalid_exclusion", "duplicate_exclusion"]),
    );
  });

  it("bloquea IDs de plantilla duplicados y colisiones del tramo nuevo", () => {
    const recurring = template({
      id: "duplicada",
      frequency: "monthly",
      startDate: "2026-01-01",
    });
    const duplicatedData = {
      ...EMPTY_DATA,
      recurringExpenses: [recurring, { ...recurring, amount: 999 }],
    };
    const change = draft(recurring, { amount: 350 });
    const duplicatePreview = previewRecurringExpenseChangeToData(
      duplicatedData,
      recurring.id,
      change,
      "2026-02-01",
      { referenceDate: "2026-02-28" },
    );
    expect(duplicatePreview).toMatchObject({ status: "manual_review" });
    expect(duplicatePreview.manualReview).toContainEqual({
      kind: "template",
      id: "duplicada",
      reason: "duplicate_template_id",
    });
    const duplicateResult = applyRecurringExpenseChangeToData(
      duplicatedData,
      recurring.id,
      change,
      "2026-02-01",
      {
        referenceDate: duplicatePreview.referenceDate,
        expectedPrecondition: duplicatePreview.precondition,
      },
    );
    expect(duplicateResult).toMatchObject({
      status: "blocked",
      reason: "manual_review",
    });
    expect(duplicateResult.data).toBe(duplicatedData);

    const collision = template({
      id: "tramo-existente",
      frequency: "annual",
      startDate: "2027-01-01",
    });
    const collisionData = {
      ...EMPTY_DATA,
      recurringExpenses: [recurring, collision],
    };
    const readyPreview = previewRecurringExpenseChangeToData(
      collisionData,
      recurring.id,
      change,
      "2026-02-01",
      { referenceDate: "2026-02-28" },
    );
    const result = applyRecurringExpenseChangeToData(
      collisionData,
      recurring.id,
      change,
      "2026-02-01",
      {
        now: "2026-02-01T10:00:00.000Z",
        newId: () => collision.id,
        referenceDate: readyPreview.referenceDate,
        expectedPrecondition: readyPreview.precondition,
      },
    );
    expect(result).toMatchObject({
      status: "blocked",
      reason: "identifier_collision",
    });
    expect(result.data).toBe(collisionData);

    const orphanTemplate = template({
      id: "tramo-huerfano",
      frequency: "monthly",
    });
    const orphanData = {
      ...EMPTY_DATA,
      recurringExpenses: [recurring],
      expenses: [
        {
          ...expenseFromRecurring(orphanTemplate, "2026-02-28"),
          id: "gasto-huerfano",
          createdAt: "2026-02-28T10:00:00.000Z",
        },
      ],
    };
    const orphanPreview = previewRecurringExpenseChangeToData(
      orphanData,
      recurring.id,
      change,
      "2026-02-01",
      { referenceDate: "2026-02-28" },
    );
    const orphanCollision = applyRecurringExpenseChangeToData(
      orphanData,
      recurring.id,
      change,
      "2026-02-01",
      {
        newId: () => orphanTemplate.id,
        referenceDate: orphanPreview.referenceDate,
        expectedPrecondition: orphanPreview.precondition,
      },
    );
    expect(orphanCollision).toMatchObject({
      status: "blocked",
      reason: "identifier_collision",
    });
    expect(orphanCollision.data).toBe(orphanData);
  });

  it.each([
    { effectiveDate: "", referenceDate: "2026-02-28", reason: "invalid_effective_date" },
    {
      effectiveDate: "2026-02-31",
      referenceDate: "2026-02-28",
      reason: "invalid_effective_date",
    },
    {
      effectiveDate: "2026-02-01",
      referenceDate: "fecha-invalida",
      reason: "invalid_reference_date",
    },
  ])(
    "bloquea fechas inválidas sin mutar ($reason)",
    ({ effectiveDate, referenceDate, reason }) => {
      const recurring = template({ id: "fecha", frequency: "monthly" });
      const data = { ...EMPTY_DATA, recurringExpenses: [recurring] };
      const change = draft(recurring, { amount: 350 });
      const preview = previewRecurringExpenseChangeToData(
        data,
        recurring.id,
        change,
        effectiveDate,
        { referenceDate },
      );
      expect(preview.status).toBe("manual_review");
      expect(preview.manualReview.map((item) => item.reason)).toContain(reason);

      const result = applyRecurringExpenseChangeToData(
        data,
        recurring.id,
        change,
        effectiveDate,
        {
          referenceDate,
          expectedPrecondition: preview.precondition,
        },
      );
      expect(result).toMatchObject({ status: "blocked", reason: "manual_review" });
      expect(result.data).toBe(data);
    },
  );

  it("sincroniza solo el tramo cambiado y no materializa reglas ajenas", () => {
    const recurring = template({
      id: "objetivo",
      frequency: "monthly",
      startDate: "2026-01-01",
    });
    const unrelated = template({
      id: "ajena",
      frequency: "monthly",
      startDate: "2026-01-01",
    });
    const data = {
      ...EMPTY_DATA,
      recurringExpenses: [recurring, unrelated],
    };
    const change = draft(recurring, { amount: 350 });
    const preview = previewRecurringExpenseChangeToData(
      data,
      recurring.id,
      change,
      "2026-02-01",
      { referenceDate: "2026-02-28" },
    );
    const result = applyRecurringExpenseChangeToData(
      data,
      recurring.id,
      change,
      "2026-02-01",
      {
        now: "2026-02-01T10:00:00.000Z",
        newId: () => "objetivo-v2",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    expect(result.data.expenses).toHaveLength(1);
    expect(result.data.expenses[0]?.recurringOccurrenceKey).toBe(
      "objetivo-v2:2026-02-28",
    );
    expect(
      result.data.expenses.some(
        (expense) => expense.recurringExpenseId === unrelated.id,
      ),
    ).toBe(false);
  });

  it("falla cerrado si la preview queda obsoleta y la segunda aplicación", () => {
    const recurring = template({
      id: "futuro",
      frequency: "monthly",
      startDate: "2027-01-01",
    });
    const data = { ...EMPTY_DATA, recurringExpenses: [recurring] };
    const change = draft(recurring, { amount: 350 });
    const preview = previewRecurringExpenseChangeToData(
      data,
      recurring.id,
      change,
      "2027-01-01",
      { referenceDate: "2026-12-31" },
    );
    const changedData = {
      ...data,
      recurringExpenses: [
        { ...recurring, updatedAt: "2026-12-01T10:00:00.000Z" },
      ],
    };
    const stale = applyRecurringExpenseChangeToData(
      changedData,
      recurring.id,
      change,
      "2027-01-01",
      {
        now: "2026-12-02T10:00:00.000Z",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(stale).toMatchObject({ status: "blocked", reason: "stale_preview" });
    expect(stale.data).toBe(changedData);

    const applied = applyRecurringExpenseChangeToData(
      data,
      recurring.id,
      change,
      "2027-01-01",
      {
        now: "2026-12-02T10:00:00.000Z",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const repeated = applyRecurringExpenseChangeToData(
      applied.data,
      recurring.id,
      change,
      "2027-01-01",
      {
        now: "2026-12-02T10:00:00.000Z",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(repeated).toMatchObject({
      status: "blocked",
      reason: "stale_preview",
    });
    expect(repeated.data).toBe(applied.data);
  });
});
