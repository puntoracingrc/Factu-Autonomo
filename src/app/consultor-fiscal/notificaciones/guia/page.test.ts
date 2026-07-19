import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("FiscalNotificationGuidePage", () => {
  it("aloja la guía buscable fuera del escáner de documentos", () => {
    expect(source).toContain("<FiscalNotificationGuideView selection={guideSelection} />");
    expect(source).toContain(
      "resolveFiscalNotificationGuideSelectionV1(requestedGuideFamily)",
    );
    expect(source).toContain("const requestedGuideFamily = resolvedSearchParams.guia");
    expect(source).toContain('id="guia-notificaciones"');
    expect(source).not.toContain("FiscalNotificationIntakeView");
  });

  it("mantiene la ruta dinámica, privada e indexación desactivada", () => {
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain(
      "robots: { index: false, follow: false, noarchive: true }",
    );
    expect(source).not.toContain("isConsultorFiscalEnabled");
    expect(source).not.toContain("notFound");
  });
});
