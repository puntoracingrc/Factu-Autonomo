import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { quickAccessScreen } from "./access-screen";

describe("quick access recovery without repeated Google sessions", () => {
  it("retries a transient bootstrap failure without starting OAuth again", () => {
    const html = quickAccessScreen("La sesión anterior tarda en liberarse.", "retry");
    expect(html).toContain('data-action="retry-access"');
    expect(html).toContain("Reintentar acceso");
    expect(html).not.toContain("Entrar con Google");
  });
  it("offers Google only when authentication is actually required", () => {
    expect(quickAccessScreen("Inicia sesión.", "login")).toContain('data-action="login"');
    expect(quickAccessScreen("Inicia sesión.", "login")).not.toContain("retry-access");
  });
  it("renders access errors as text, never executable markup", () => {
    expect(quickAccessScreen('<img src=x onerror="alert(1)">', "retry"))
      .toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
  it("reuses its auth client and retries before requiring a loaded workspace", () => {
    const app = readFileSync(new URL("./app.ts", import.meta.url), "utf8");
    expect(app).toContain("if (!auth) {");
    expect(app).toContain('error.status === 401 || error.code === "PILOT_ONLY"');
    expect(app.indexOf('action === "retry-access"')).toBeLessThan(app.indexOf("if (!bootstrap || busy)"));
  });
});
