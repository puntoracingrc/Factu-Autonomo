import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS,
  inspectLocalOfficialArtifactSet,
} from "./local-artifact-intake";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "phase2b7q-"));
}

function writeSyntheticXsd(filePath: string): void {
  fs.writeFileSync(filePath, "<xs:schema xmlns:xs=\"urn:test\" />", "utf8");
}

describe("inspectLocalOfficialArtifactSet", () => {
  it("bloquea cuando no se proporciona directorio", () => {
    const result = inspectLocalOfficialArtifactSet();

    expect(result.status).toBe("blocked");
    expect(result.blockers).toEqual([
      "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED",
    ]);
    expect(result.networkUsed).toBe(false);
    expect(result.copiedFilesToRepo).toBe(false);
  });

  it("bloquea cuando el directorio no existe", () => {
    const result = inspectLocalOfficialArtifactSet({
      baseDirectory: path.join(os.tmpdir(), "missing-phase2b7q-dir"),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_FOUND");
  });

  it("bloquea directorios dentro de rutas fuente del repo", () => {
    const result = inspectLocalOfficialArtifactSet({
      baseDirectory: path.join(process.cwd(), "src"),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain(
      "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_INSIDE_REPO_SOURCE",
    );
  });

  it("inspecciona un directorio temporal valido con XSD sinteticos", () => {
    const directory = makeTempDir();
    for (const artifact of DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS) {
      writeSyntheticXsd(path.join(directory, artifact.expectedFileName));
    }

    const result = inspectLocalOfficialArtifactSet({ baseDirectory: directory });

    expect(result.status).toBe("ready");
    expect(result.safeSummaries.every((summary) => summary.exists)).toBe(true);
    expect(result.certificatesUsed).toBe(false);
    expect(result.printedContent).toBe(false);
  });

  it("rechaza extensiones y nombres sensibles", () => {
    const directory = makeTempDir();
    fs.writeFileSync(path.join(directory, "private-cert.pem"), "redacted", "utf8");

    const result = inspectLocalOfficialArtifactSet({ baseDirectory: directory });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("BLOCKED_FORBIDDEN_ARTIFACT_EXTENSION");
    expect(result.blockers).toContain(
      "BLOCKED_LOCAL_ARTIFACT_SECRET_FILENAME_DETECTED",
    );
    expect(serialized).not.toContain("redacted");
    expect(serialized).not.toContain("private-cert.pem");
  });
});
