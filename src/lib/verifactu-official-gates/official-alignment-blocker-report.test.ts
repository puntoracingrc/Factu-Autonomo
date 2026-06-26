import { describe, expect, it } from "vitest";
import { buildOfficialAlignmentBlockerReport } from "./official-alignment-blocker-report";

describe("buildOfficialAlignmentBlockerReport", () => {
  it("construye un reporte bloqueado y serializable", () => {
    const report = buildOfficialAlignmentBlockerReport({
      generatedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.status).toBe("blocked");
    expect(report.generatedAt).toBe("2026-06-26T00:00:00.000Z");
    expect(() => JSON.stringify(report)).not.toThrow();
    expect(report.finality).toBe("internal_blocker_report");
  });

  it("incluye blockers y resumen seguro de artefactos", () => {
    const report = buildOfficialAlignmentBlockerReport();

    expect(report.blockers).toContain("BLOCKED_XSD_NOT_COMMITTED");
    expect(report.blockers).toContain("BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR");
    expect(report.blockers).toContain(
      "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
    );
    expect(report.safeArtifactSummary.length).toBeGreaterThan(0);
    expect(report.safeArtifactSummary[0]).not.toHaveProperty("url");
  });

  it("mantiene todos los flags de avance a false", () => {
    const report = buildOfficialAlignmentBlockerReport();

    expect(report.canProceed).toEqual({
      officialAlignedXml: false,
      offlineXsdValidation: false,
      qr: false,
      signature: false,
      transport: false,
      production: false,
    });
  });

  it("no contiene XML, credenciales ni certificados", () => {
    const report = buildOfficialAlignmentBlockerReport();
    const serialized = JSON.stringify(report);

    expect(report.containsXml).toBe(false);
    expect(report.containsSecrets).toBe(false);
    expect(report.containsRealData).toBe(false);
    expect(serialized).not.toContain("<");
    expect(serialized).not.toMatch(/BEGIN CERTIFICATE|PRIVATE KEY|password|token/i);
  });
});
