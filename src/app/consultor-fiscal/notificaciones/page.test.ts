import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("FiscalNotificationsPage", () => {
  it("mantiene disponible la revisión local sin abrir el analizador de gastos", () => {
    expect(source).toContain("return <FiscalNotificationIntakeView />");
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain(
      "robots: { index: false, follow: false, noarchive: true }",
    );
    expect(source).not.toContain("isConsultorFiscalEnabled");
    expect(source).not.toContain("notFound");
  });
});
