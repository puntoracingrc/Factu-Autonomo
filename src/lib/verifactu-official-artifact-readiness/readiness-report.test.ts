import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeLocalArtifactSha256 } from "./local-xsd-checksum";
import { buildOfficialArtifactReadinessReport } from "./readiness-report";
import type { LocalOfficialArtifactCandidate } from "./types";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "phase2b7s-report-"));
}

function writeSyntheticArtifactSet(directory: string): readonly LocalOfficialArtifactCandidate[] {
  const root = path.join(directory, "Root.xsd");
  const common = path.join(directory, "Common.xsd");
  fs.writeFileSync(root, "<xs:include schemaLocation=\"Common.xsd\" />", "utf8");
  fs.writeFileSync(common, "<xs:schema xmlns:xs=\"urn:test\" />", "utf8");
  const rootSha = computeLocalArtifactSha256({ filePath: root });
  const commonSha = computeLocalArtifactSha256({ filePath: common });
  if (rootSha.status !== "ready" || commonSha.status !== "ready") {
    throw new Error("Expected synthetic checksums to be ready.");
  }

  return [
    {
      artifactId: "LOCAL_SYNTHETIC_ROOT_XSD",
      expectedFileName: "Root.xsd",
      expectedSha256: rootSha.sha256,
      requiredExtension: ".xsd",
    },
    {
      artifactId: "LOCAL_SYNTHETIC_COMMON_XSD",
      expectedFileName: "Common.xsd",
      expectedSha256: commonSha.sha256,
      requiredExtension: ".xsd",
    },
  ];
}

describe("buildOfficialArtifactReadinessReport", () => {
  it("bloquea sin directorio de artefactos", () => {
    const report = buildOfficialArtifactReadinessReport({
      generatedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.status).toBe("blocked");
    expect(report.blockers).toContain(
      "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED",
    );
    expect(report.checksumStatus).toBe("not_checked");
    expect(report.importGraphStatus).toBe("not_checked");
  });

  it("detecta checksum incorrecto", () => {
    const directory = makeTempDir();
    const requiredArtifacts = writeSyntheticArtifactSet(directory).map((artifact) =>
      artifact.artifactId === "LOCAL_SYNTHETIC_ROOT_XSD"
        ? { ...artifact, expectedSha256: "0".repeat(64) }
        : artifact,
    );

    const report = buildOfficialArtifactReadinessReport({
      baseDirectory: directory,
      requiredArtifacts,
    });

    expect(report.status).toBe("blocked");
    expect(report.checksumStatus).toBe("blocked");
    expect(report.blockers).toContain("BLOCKED_LOCAL_ARTIFACT_CHECKSUM_MISMATCH");
  });

  it("acepta checksum y grafo sintetico local pero mantiene bloqueo global", () => {
    const directory = makeTempDir();
    const requiredArtifacts = writeSyntheticArtifactSet(directory);

    const report = buildOfficialArtifactReadinessReport({
      baseDirectory: directory,
      requiredArtifacts,
    });

    expect(report.status).toBe("blocked");
    expect(report.checksumStatus).toBe("ready");
    expect(report.importGraphStatus).toBe("ready");
    expect(report.validatorStatus).toBe("blocked");
    expect(report.syntheticDataStatus).toBe("blocked");
    expect(report.blockers).toContain("BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR");
    expect(report.blockers).toContain(
      "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
    );
  });

  it("no contiene contenido XSD ni secretos", () => {
    const directory = makeTempDir();
    const requiredArtifacts = writeSyntheticArtifactSet(directory);
    const report = buildOfficialArtifactReadinessReport({
      baseDirectory: directory,
      requiredArtifacts,
    });
    const serialized = JSON.stringify(report);

    expect(report.containsXmlOrXsdContent).toBe(false);
    expect(report.containsSecrets).toBe(false);
    expect(serialized).not.toContain("<xs:");
    expect(serialized).not.toMatch(/password|BEGIN CERTIFICATE|PRIVATE KEY/i);
  });
});
