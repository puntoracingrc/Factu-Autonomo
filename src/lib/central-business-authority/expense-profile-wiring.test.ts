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

  it("waits for the central profile result before showing success", () => {
    const page = source("../../app/configuracion/page.tsx");

    expect(page).toContain("useCentralProfileMutation");
    expect(page).toContain("const result = await updateProfile(");
    expect(page).toContain("if (!result.ok)");
    expect(page).toContain("setSaved(true)");
  });
});
