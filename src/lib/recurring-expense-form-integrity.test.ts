import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("recurring expense form integrity", () => {
  it("normaliza la duración por ocurrencias al cargar y guardar desde Gastos", () => {
    const expenseForm = source("../app/gastos/nuevo/page.tsx");

    expect(expenseForm).toMatch(
      /normalizeRecurringOccurrenceCount\(\s*recurringTemplate\.duration\.count,?\s*\)\s*\?\?\s*1/,
    );
    expect(expenseForm).toMatch(
      /normalizeRecurringOccurrenceCount\(Number\(fixedOccurrenceCount\)\)\s*\?\?\s*1/,
    );
    expect(expenseForm).not.toContain(
      "count: Math.max(1, Number(fixedOccurrenceCount) || 1)",
    );
  });

  it("usa la vigencia compartida en el resumen y estado de Gastos fijos", () => {
    const fixedExpenseForm = source("../app/gastos/fijos/page.tsx");

    expect(fixedExpenseForm).toMatch(
      /isRecurringExpenseApplicableOn\(item, today\)/,
    );
    expect(fixedExpenseForm).toMatch(
      /recurringExpenseStatusOn\(item, today\)/,
    );
  });

  it("permite guardar todas las reglas anuales que ofrece el formulario", () => {
    const fixedExpenseForm = source("../app/gastos/fijos/page.tsx");
    const newExpenseForm = source("../app/gastos/nuevo/page.tsx");

    for (const formSource of [fixedExpenseForm, newExpenseForm]) {
      expect(formSource).not.toMatch(
        /frequency === "annual"\s*&&\s*[^\n]+DueKind === "end_of_month"/,
      );
      expect(formSource).toContain("Día 1 del mes de vencimiento");
      expect(formSource).toContain("Día 15 del mes de vencimiento");
      expect(formSource).toContain("Último día del mes de vencimiento");
      expect(formSource).toContain("Día concreto del mes de vencimiento");
    }
    expect(newExpenseForm).not.toMatch(
      /fixedFrequency === "annual"\s*&&\s*fixedDueKind === "end_of_month"/,
    );
    expect(newExpenseForm).not.toMatch(
      /nextFrequency === "annual"[\s\S]{0,180}setFixedDueKind\("day_of_month"\)/,
    );
    expect(newExpenseForm).toContain('fixedFrequency === "annual" && (');
    expect(newExpenseForm).toContain('fixedDueKind === "day_of_month" && (');
    expect(newExpenseForm).not.toContain('"Mes y día"');
    expect(fixedExpenseForm).toContain(
      "dueMonth: String(recurringAnnualDueMonth(item))",
    );
    expect(newExpenseForm).toContain(
      "setFixedDueMonth(String(recurringAnnualDueMonth(recurringTemplate)))",
    );
  });

  it("previsualiza y bloquea cambios sobre ocurrencias ya materializadas", () => {
    const fixedExpenseForm = source("../app/gastos/fijos/page.tsx");
    const appStore = source("../context/AppStore.tsx");

    expect(fixedExpenseForm).toContain("previewRecurringExpenseChangeToData");
    expect(fixedExpenseForm).toContain('preview.status === "manual_review"');
    expect(fixedExpenseForm).toContain("Vista previa bloqueada");
    expect(fixedExpenseForm).toContain("ningún gasto creado se borra");
    expect(fixedExpenseForm).toContain("precondition: preview.precondition");
    expect(fixedExpenseForm).toContain('result.reason === "stale_preview"');
    expect(fixedExpenseForm).toContain("setRecurringExpenseEnabled");
    expect(fixedExpenseForm).not.toContain("updateRecurringExpense");
    expect(appStore).toContain("expectedPrecondition: approval.precondition");
    expect(appStore).toContain("return result.data");
    expect(appStore).toContain(
      "setRecurringExpenseEnabled: (id: string, enabled: boolean)",
    );
    expect(appStore).not.toContain(
      "updateRecurringExpense: (item: RecurringExpense)",
    );
  });

  it("identifica como no desgravable cualquier estado fiscal no reconocido", () => {
    const fixedExpenseForm = source("../app/gastos/fijos/page.tsx");

    expect(fixedExpenseForm).toContain("isExpenseFiscalDeductible");
    expect(fixedExpenseForm).toContain("!isExpenseFiscalDeductible(item)");
    expect(fixedExpenseForm).not.toContain(
      'item.deductibility === "non_deductible"',
    );
  });
});
