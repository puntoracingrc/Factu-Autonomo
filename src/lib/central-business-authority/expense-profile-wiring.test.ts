import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("central expense and profile UI wiring", () => {
  it("routes manual expense writes through the central hook", () => {
    const page = source("../../app/gastos/nuevo/page.tsx");

    expect(page).toContain("useCentralExpenseMutations");
    expect(page).toContain("await createExpense(payload)");
    expect(page).toContain("await updateCentralExpense({");
    expect(page).toContain("updateExpenseFallback({");
  });

  it("routes list deletion through the central hook", () => {
    const page = source("../../app/gastos/page.tsx");

    expect(page).toContain("useCentralExpenseMutations");
    expect(page).toContain("await deleteExpense(expense.id)");
  });

  it("routes scanned and fixed bundles through the atomic central canary", () => {
    const page = source("../../app/gastos/nuevo/page.tsx");
    const hook = source("../../hooks/useCentralExpenseMutations.ts");
    const store = source("../../context/AppStore.tsx");

    expect(hook).toContain("saveCentralExpenseBundleWithCanary");
    expect(hook).toContain("prepareCentralScannedExpenseBundle");
    expect(hook).toContain("prepareCentralFixedExpenseBundle");
    expect(page).toContain("await saveScannedExpenseDurably(durableExpense");
    expect(page).toContain("await saveFixedExpenseWithRecurringTemplate(");
    expect(page).toContain("centralResult.localFailure");
    expect(store).toContain("now: options.now ?? new Date().toISOString()");
  });

  it("waits for the central profile result before showing success", () => {
    const page = source("../../app/configuracion/page.tsx");

    expect(page).toContain("useCentralProfileMutation");
    expect(page).toContain("const result = await updateProfile(");
    expect(page).toContain("if (!result.ok)");
    expect(page).toContain("setSaved(true)");
  });
});
