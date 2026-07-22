import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("route loading fallback", () => {
  it("renders a non-interactive accessible skeleton", () => {
    const source = readFileSync(new URL("./loading.tsx", import.meta.url), "utf8");

    expect(source).toContain('aria-busy="true"');
    expect(source).toContain('role="status"');
    expect(source).toContain("Cargando sección…");
    expect(source).not.toMatch(/<(?:a|button|input|select|textarea)\b/);
  });
});
