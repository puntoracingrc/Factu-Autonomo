import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("central recurring expense canary wiring", () => {
  it("routes every fixed-expense form mutation through the central hook", () => {
    const page = source("../../app/gastos/fijos/page.tsx");
    const hook = source("../../hooks/useCentralRecurringExpenseMutations.ts");

    expect(page).toContain("useCentralRecurringExpenseMutations");
    expect(page).toMatch(
      /whileSaving\(\(\) =>\s*createRecurringExpense\(payload\)/,
    );
    expect(page).toMatch(
      /whileSaving\(\(\) =>\s*applyRecurringExpenseChange\(/,
    );
    expect(page).toMatch(
      /whileSaving\(\(\) =>\s*setRecurringExpenseEnabled\(/,
    );
    expect(page).toMatch(
      /whileSaving\(\(\) =>\s*deleteRecurringExpense\(item\.id\)/,
    );
    expect(hook).toContain("saveCentralExpenseBundleWithCanary");
    expect(hook).toContain("syncEventsBeforeWrite");
    expect(hook).toContain("commitPreparedAppDataDurably");
  });

  it("preserves the current durable fallback outside the exact canary", () => {
    const hook = source("../../hooks/useCentralRecurringExpenseMutations.ts");

    expect(hook).toContain("addRecurringExpenseFallback");
    expect(hook).toContain("applyRecurringExpenseChangeFallback");
    expect(hook).toContain("setRecurringExpenseEnabledFallback");
    expect(hook).toContain("deleteRecurringExpenseFallback");
  });
});
