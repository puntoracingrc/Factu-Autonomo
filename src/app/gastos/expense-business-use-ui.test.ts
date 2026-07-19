import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const expenseForm = readFileSync(
  new URL("./nuevo/page.tsx", import.meta.url),
  "utf8",
);
const recurringForm = readFileSync(
  new URL("./fijos/page.tsx", import.meta.url),
  "utf8",
);

describe("expense business use UI", () => {
  it.each([expenseForm, recurringForm])(
    "offers one coherent treatment instead of independent checkboxes",
    (source) => {
      expect(source).toContain("Empresa y deducible");
      expect(source).toContain("Empresa, no deducible");
      expect(source).toContain("Personal / no empresarial");
      expect(source).toContain('value: "personal"');
    },
  );

  it("persists the treatment on every newly saved expense", () => {
    expect(expenseForm).toContain("deductibility: fixedDeductibility");
    expect(expenseForm).toContain('title="Uso del gasto"');
  });
});
