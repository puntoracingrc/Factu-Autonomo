import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./AdvisoryScopeToggle.tsx", import.meta.url),
  "utf8",
);

describe("AdvisoryScopeToggle", () => {
  it("exposes the same accessible segmented pattern for advisory catalogs", () => {
    expect(source).toContain('role="group"');
    expect(source).toContain("groupLabel: string");
    expect(source).toContain("aria-label={groupLabel}");
    expect(source).toContain('aria-pressed={value === "MINE"}');
    expect(source).toContain('aria-pressed={value === "ALL"}');
    expect(source).toContain("aria-disabled={mineDisabled}");
    expect(source).toContain("disabled={mineDisabled}");
    expect(source).toContain("mineLabel");
    expect(source).toContain("Todos");
  });
});
