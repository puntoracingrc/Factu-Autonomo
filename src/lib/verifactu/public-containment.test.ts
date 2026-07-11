import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("public VeriFactu containment", () => {
  it("mantiene la declaración pública como estado noindex sin PII ni afirmación", () => {
    const page = source("../../app/legal/declaracion-responsable/page.tsx");

    expect(page).toContain("index: false");
    expect(page).toContain("follow: false");
    expect(page).toContain("Borrador técnico");
    expect(page).toContain("No constituye una declaración responsable válida");
    expect(page).toContain('href="/legal/verifactu"');
    expect(page).not.toMatch(
      /buildDeclaration|VERIFACTU_SOFTWARE|producerNif|producerPostalAddress|complianceStatement|NEXT_PUBLIC_VERIFACTU/i,
    );
  });

  it("impide que las APIs públicas importen el borrador o campos sensibles", () => {
    const declarationRoute = source(
      "../../app/api/verifactu/declaration/route.ts",
    );
    const statusRoute = source("../../app/api/verifactu/status/route.ts");

    expect(declarationRoute).not.toMatch(
      /buildDeclaration|verifactu\/declaration|AeatSubmit|ServerVerifactuEnvironment/i,
    );
    expect(statusRoute).toContain("getUserFromBearer");
    expect(statusRoute).toContain('submissionMode: "disabled"');
    expect(statusRoute).not.toMatch(
      /VERIFACTU_SOFTWARE|getVerifactuCertificateConfig|getProducerConfigStatus|getServerVerifactuEnvironment|isAeatSubmitConfigured|VERIFACTU_ENVIRONMENT|qrHosts|certificateConfigured|certificateChannel/i,
    );
  });

  it("no convierte carga ni errores de estado en modo simulado", () => {
    const settingsCard = source(
      "../../components/verifactu/VerifactuSettingsCard.tsx",
    );
    const runtimeStatus = source("./runtime-status.ts");

    expect(settingsCard).toContain("loadVerifactuRuntimeState");
    expect(runtimeStatus).toContain('phase: "loading"');
    expect(runtimeStatus).toContain('phase: "disabled"');
    expect(runtimeStatus).toContain('phase: "unavailable"');
    expect(runtimeStatus).toContain("Estado no verificado");
    expect(runtimeStatus).toContain("Estado no disponible");
    expect(`${settingsCard}\n${runtimeStatus}`).not.toContain("Modo simulado");
    expect(settingsCard).toContain(
      "Fecha general de adaptación al RRSIF para contribuyentes",
    );
    expect(settingsCard).toContain("según ámbito");
    expect(settingsCard).toContain("y excepciones");
    expect(settingsCard).toContain('href="/legal/verifactu"');
    expect(settingsCard).toContain("Registro Veri*Factu no disponible");
    expect(settingsCard).not.toContain("Activar Veri*Factu");
    expect(settingsCard).not.toContain("Obligatorio para autónomos");
  });

  it("marca el generador como borrador interno de revisión", () => {
    const draftBuilder = source("./declaration.ts");

    expect(draftBuilder).toContain("buildDeclarationReviewDraft");
    expect(draftBuilder).toContain('publicationStatus: "draft_not_valid"');
    expect(draftBuilder).toContain("BORRADOR TÉCNICO — NO VÁLIDO");
  });

  it("cualifica los claims junto a los CTA y enlaza la explicación", () => {
    const landing = source("../../components/marketing/PublicLanding.tsx");
    const pricing = source("../../app/precios/page.tsx");
    const metadata = source("../../app/inicio/layout.tsx");

    for (const publicSurface of [landing, pricing]) {
      expect(publicSurface).toContain("VeriFactu/SIF");
      expect(publicSurface).toMatch(/registro[^\n]*desactivad/i);
      expect(publicSurface).toMatch(/QR[^\n]*desactivad/i);
      expect(publicSurface).toContain(
        "No afirmamos que la AEAT haya homologado, validado o revisado",
      );
      expect(publicSurface).toContain('href="/legal/verifactu"');
      expect(publicSurface).not.toMatch(/VeriFactu incluido/i);
      expect(publicSurface).not.toMatch(/modo simulado/i);
    }

    expect(metadata).toContain(
      "información VeriFactu/SIF con registro y QR desactivados",
    );
    expect(metadata).not.toContain("VeriFactu desde el plan Gratis");
    expect(metadata).not.toMatch(/modo simulado/i);
  });

  it("hace visible el estado desactivado en la explicación enlazada", () => {
    const legalInfo = source("../../app/legal/verifactu/page.tsx");

    expect(legalInfo).toContain(
      "Estado actual: registro VeriFactu, envío a AEAT y QR tributario",
    );
    expect(legalInfo).toContain("desactivados");
    expect(legalInfo).not.toMatch(/modo simulado/i);
    expect(legalInfo).toContain(
      "borrador técnico y no constituye una declaración válida",
    );
    expect(legalInfo).toContain('href="/legal/declaracion-responsable"');
  });
});
