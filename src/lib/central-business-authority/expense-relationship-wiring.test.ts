import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("central expense relationship wiring", () => {
  it("persists invoice expense relationships before updating their UI state", () => {
    const workspace = source(
      "../../components/documents/InvoiceRelationshipWorkspace.tsx",
    );

    expect(workspace).toContain("useCentralExpenseMutations");
    expect(workspace).toContain("const result = await updateExpense(expense)");
    expect(workspace).toContain(
      "if (!(await saveExpenseUpdate(updated))) return;",
    );
    expect(workspace).not.toContain(
      "const { data, updateDocumentLink, updateExpense } = useAppStore();",
    );
  });

  it("persists profitability links through the central expense authority", () => {
    const panel = source(
      "../../components/rentabilidad-real/calculadora/WorkExpenseLinkingPanel.tsx",
    );

    expect(panel).toContain("useCentralExpenseMutations");
    expect(panel).toContain("const result = await updateExpense(expense)");
    expect(panel).toContain("if (!(await saveExpenseUpdate(updated))) return;");
    expect(panel).not.toContain(
      "const { data, updateExpense } = useAppStore();",
    );
  });
});
