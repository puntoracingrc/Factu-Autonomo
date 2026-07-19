import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("FiscalNotificationsPage", () => {
  it("mantiene el escáner y enlaza la guía sin incrustarla en la misma página", () => {
    expect(source).toContain("return <FiscalNotificationIntakeView />");
    expect(source).toContain("<FiscalNotificationAnalyzerSection />");
    expect(source).toContain("<FiscalNotificationGuideLinkSection />");
    expect(source).toContain(
      'href="/consultor-fiscal/notificaciones/guia"',
    );
    expect(source).toContain('id="analizar-documento"');
    expect(source).not.toContain("<FiscalNotificationGuideView");
    expect(source).not.toContain("resolveFiscalNotificationGuideSelectionV1");
    expect(source).not.toContain("/consultor-fiscal/notificaciones/[familyId]");
    expect(source).toContain("resolvedSearchParams.documento");
    expect(source).toContain(
      "<FiscalNotificationIntakeView selectedDocumentId={selectedDocumentId} />",
    );
    expect(source).not.toContain(
      "/consultor-fiscal/notificaciones/documentos/",
    );
  });

  it("mantiene metadatos privados y no depende del flag fiscal", () => {
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain(
      "robots: { index: false, follow: false, noarchive: true }",
    );
    expect(source).not.toContain("isConsultorFiscalEnabled");
    expect(source).not.toContain("notFound");
  });
});
