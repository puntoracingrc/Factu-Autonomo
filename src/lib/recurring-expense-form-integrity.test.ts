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
});
