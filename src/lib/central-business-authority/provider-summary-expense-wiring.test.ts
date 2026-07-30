import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("provider summary expense central wiring", () => {
  it("routes the provider and all selected expenses through the atomic bundle", () => {
    const page = readFileSync(
      path.join(root, "src/app/gastos/page.tsx"),
      "utf8",
    );
    const hook = readFileSync(
      path.join(root, "src/hooks/useCentralExpenseMutations.ts"),
      "utf8",
    );

    expect(page).toContain("saveProviderSummaryExpenses");
    expect(page).toContain("summaryImportInFlightRef.current");
    expect(page).toContain(
      "summaryImportBusy || selectedSummaryRows.length === 0",
    );
    expect(page).not.toContain(
      "plan.expenses.forEach((expense) => addExpense(expense))",
    );
    expect(page).not.toContain(
      "const created = addSupplier(summaryPreview.providerToCreate)",
    );
    expect(hook).toContain("prepareCentralProviderSummaryExpenseBundle");
    expect(hook).toContain("commitPreparedAppDataDurably");
    expect(hook).toContain("saveCentralExpenseBundleWithCanary");
  });
});
