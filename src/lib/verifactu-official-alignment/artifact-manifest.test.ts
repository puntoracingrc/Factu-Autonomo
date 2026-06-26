import { describe, expect, it } from "vitest";
import {
  OFFICIAL_ARTIFACT_GATE,
  OFFICIAL_ARTIFACT_MANIFEST,
  OFFICIAL_OFFLINE_XSD_FIXTURE_GATE,
  findOfficialArtifact,
} from "./artifact-manifest";

const SHA256_REGEX = /^[a-f0-9]{64}$/;

describe("OFFICIAL_ARTIFACT_MANIFEST", () => {
  it("registra los artefactos oficiales minimos de la puerta 2B.7", () => {
    expect(OFFICIAL_ARTIFACT_MANIFEST.map((entry) => entry.artifactId)).toEqual([
      "AEAT_VERIFACTU_RECORD_DESIGN_XLSX_V1_0",
      "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
      "AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0",
      "AEAT_VERIFACTU_HASH_SPEC_PDF_V0_1_2",
      "AEAT_VERIFACTU_VALIDATIONS_ERRORS_PDF_V1_2_2",
      "AEAT_VERIFACTU_SERVICE_SPEC_PDF_V1_0_3",
    ]);
  });

  it("usa solo dominios oficiales de Agencia Tributaria o sede", () => {
    for (const artifact of OFFICIAL_ARTIFACT_MANIFEST) {
      expect(
        [
          "www.agenciatributaria.es",
          "sede.agenciatributaria.gob.es",
          "prewww2.aeat.es",
        ],
        artifact.artifactId,
      ).toContain(artifact.domain);
      expect(artifact.url).toContain(artifact.domain);
    }
  });

  it("registra version, fecha de consulta, content type y checksum", () => {
    for (const artifact of OFFICIAL_ARTIFACT_MANIFEST) {
      expect(artifact.version, artifact.artifactId).toBeTruthy();
      expect(artifact.consultedAt, artifact.artifactId).toBe("2026-06-26");
      expect(artifact.contentType, artifact.artifactId).toBeTruthy();
      expect(artifact.sha256, artifact.artifactId).toMatch(SHA256_REGEX);
    }
  });

  it("no declara artefactos descargados como fixtures offline", () => {
    for (const artifact of OFFICIAL_ARTIFACT_MANIFEST) {
      expect(artifact.localFixturePath, artifact.artifactId).toBeNull();
    }
    expect(OFFICIAL_ARTIFACT_GATE.artifactsCommitted).toBe(false);
  });

  it("identifica XSD y namespace pero bloquea validacion offline segura", () => {
    expect(OFFICIAL_ARTIFACT_GATE).toMatchObject({
      xsdFound: true,
      exactNamespaceFound: true,
      artifactVersionsFound: true,
      safeOfflineXsdValidatorFound: false,
      status: "blocked",
      blocker: "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
    });
  });

  it("permite buscar artefactos por id sin red", () => {
    expect(
      findOfficialArtifact("AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0"),
    ).toMatchObject({
      version: "tikeV1.0",
      sha256:
        "cbdac8d427cc5ab5d77ca48974cab0f35d6bb819c4c66db361681e3710aeba36",
    });
  });

  it("bloquea la puerta 2B.7F-K sin fixture XSD offline ni validador seguro", () => {
    expect(OFFICIAL_OFFLINE_XSD_FIXTURE_GATE).toMatchObject({
      xsdFound: true,
      exactNamespaceFound: true,
      exactRootFound: true,
      xsdFixturesCommitted: false,
      xsdDownloadWithoutClientCertificateVerified: false,
      safeOfflineXsdValidatorSelected: false,
      safeOfficialSyntheticDataAvailable: false,
      status: "blocked",
    });
    expect(OFFICIAL_OFFLINE_XSD_FIXTURE_GATE.blockers).toEqual([
      "BLOCKED_XSD_NOT_COMMITTED",
      "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
      "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
    ]);
  });
});
