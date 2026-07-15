import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("FiscalNotificationsPage", () => {
  it("separa analizador, biblioteca y guía sin abrir rutas anidadas", () => {
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
    expect(source).toContain("resolvedSearchParams.documento");
    expect(source).toContain(
      "<FiscalNotificationIntakeView selectedDocumentId={selectedDocumentId} />",
    );
    expect(source).not.toContain(
      "/consultor-fiscal/notificaciones/documentos/",
    );
  });

  it("resuelve ?guia de forma exacta y fail-closed", () => {
    expect(source).toContain(
      "const requestedGuideFamily = resolvedSearchParams.guia",
    );
    expect(source).toContain(
      "resolveFiscalNotificationGuideSelectionV1(requestedGuideFamily)",
    );
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain(
      "robots: { index: false, follow: false, noarchive: true }",
    );
    expect(source).not.toContain("isConsultorFiscalEnabled");
    expect(source).not.toContain("notFound");
  });
});
