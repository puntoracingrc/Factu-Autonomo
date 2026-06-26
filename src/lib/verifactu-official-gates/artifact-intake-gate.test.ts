import { describe, expect, it } from "vitest";
import { OFFICIAL_ARTIFACT_MANIFEST } from "../verifactu-official-alignment";
import {
  DEFAULT_OFFICIAL_ARTIFACT_REQUIREMENTS,
  evaluateOfficialArtifactIntakeGate,
} from "./artifact-intake-gate";

describe("evaluateOfficialArtifactIntakeGate", () => {
  it("devuelve blocked con los XSD oficiales no commiteados", () => {
    const result = evaluateOfficialArtifactIntakeGate();

    expect(result.status).toBe("blocked");
    expect(result.canUseOfflineXsdFixtures).toBe(false);
    expect(result.canVerifyLocalChecksums).toBe(false);
    expect(result.canTrustImportGraphOffline).toBe(false);
    expect(result.networkUsed).toBe(false);
    expect(result.certificatesUsed).toBe(false);
    expect(result.pdfsOrXlsxCommitted).toBe(false);
    expect(result.blockers).toEqual([
      "BLOCKED_XSD_NOT_COMMITTED",
      "BLOCKED_XSD_CHECKSUM_NOT_VERIFIABLE",
      "BLOCKED_XSD_IMPORT_GRAPH_NOT_VERIFIED",
    ]);
  });

  it("declara que no usa red si no hay fichero local", () => {
    const result = evaluateOfficialArtifactIntakeGate();

    expect(result.status).toBe("blocked");
    expect(result.networkUsed).toBe(false);
  });

  it("rechaza rutas fuera del directorio permitido de fixtures", () => {
    const manifest = OFFICIAL_ARTIFACT_MANIFEST.map((artifact) =>
      artifact.artifactId === "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0"
        ? { ...artifact, localFixturePath: "/tmp/SuministroLR.xsd" }
        : artifact,
    );

    const result = evaluateOfficialArtifactIntakeGate({ manifest });

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain(
      "BLOCKED_XSD_FIXTURE_PATH_OUTSIDE_ALLOWED_DIR",
    );
  });

  it("rechaza extensiones prohibidas para artefactos ejecutables", () => {
    const manifest = OFFICIAL_ARTIFACT_MANIFEST.map((artifact) =>
      artifact.artifactId === "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0"
        ? {
            ...artifact,
            localFixturePath:
              "test/fixtures/verifactu-official-artifacts/xsd/SuministroLR.pdf",
          }
        : artifact,
    );

    const result = evaluateOfficialArtifactIntakeGate({ manifest });

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("BLOCKED_XSD_FIXTURE_EXTENSION_FORBIDDEN");
  });

  it("no expone URLs completas ni secretos en el resumen seguro", () => {
    const result = evaluateOfficialArtifactIntakeGate();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("https://");
    expect(serialized).not.toMatch(/token|secret|password|BEGIN CERTIFICATE/i);
    expect(result.safeArtifactSummary).toHaveLength(
      DEFAULT_OFFICIAL_ARTIFACT_REQUIREMENTS.length,
    );
  });
});
