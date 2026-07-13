import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("FiscalNotificationsPage", () => {
  it("separa el analizador local y la guía buscable sin abrir rutas anidadas", () => {
    expect(source).toContain("return <FiscalNotificationIntakeView />");
    expect(source).toContain("<FiscalNotificationAnalyzerSection />");
    expect(source).toContain(
      "<FiscalNotificationGuideView selection={guideSelection} />",
    );
    expect(source).toContain('href="#analizar-documento"');
    expect(source).toContain('href="#guia-notificaciones"');
    expect(source).toContain('id="analizar-documento"');
    expect(source).toContain('id="guia-notificaciones"');
    expect(source).not.toContain("/consultor-fiscal/notificaciones/[familyId]");
  });

  it("resuelve ?guia de forma exacta y fail-closed", () => {
    expect(source).toContain("const requestedGuideFamily = (await searchParams).guia");
    expect(source).toContain(
      "resolveFiscalNotificationGuideSelectionV1(\n    requestedGuideFamily",
    );
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain(
      "robots: { index: false, follow: false, noarchive: true }",
    );
    expect(source).not.toContain("isConsultorFiscalEnabled");
    expect(source).not.toContain("notFound");
  });
});
