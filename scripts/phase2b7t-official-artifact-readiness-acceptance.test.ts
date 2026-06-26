import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS,
  inspectLocalOfficialArtifactSet,
  inspectLocalXsdImportGraph,
} from "../src/lib/verifactu-official-artifact-readiness";

const cliPath = path.join(
  process.cwd(),
  "scripts/check-verifactu-official-artifact-readiness.mjs",
);

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "phase2b7t-readiness-"));
}

function sha256(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

function writeArtifactSet(
  directory: string,
  options: {
    readonly rootBody?: string;
    readonly commonBody?: string;
  } = {},
): { readonly rootSha: string; readonly commonSha: string } {
  const rootBody =
    options.rootBody ?? '<xs:include schemaLocation="SuministroInformacion.xsd" />';
  const commonBody =
    options.commonBody ?? '<xs:schema xmlns:xs="urn:phase2b7t-test" />';

  fs.writeFileSync(path.join(directory, "SuministroLR.xsd"), rootBody, "utf8");
  fs.writeFileSync(
    path.join(directory, "SuministroInformacion.xsd"),
    commonBody,
    "utf8",
  );

  return {
    rootSha: sha256(rootBody),
    commonSha: sha256(commonBody),
  };
}

function runCli(args: readonly string[]): {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
} {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function runCliJson(args: readonly string[]): {
  readonly status: number | null;
  readonly report: Record<string, unknown>;
  readonly raw: string;
} {
  const result = runCli([...args, "--json"]);
  return {
    status: result.status,
    report: JSON.parse(result.stdout) as Record<string, unknown>,
    raw: result.stdout,
  };
}

function expectedShaArgs(rootSha: string, commonSha: string): readonly string[] {
  return [
    "--expected-sha256",
    `${DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS[0].artifactId}=${rootSha}`,
    "--expected-sha256",
    `${DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS[1].artifactId}=${commonSha}`,
  ];
}

describe("PHASE2B7T official artifact readiness acceptance", () => {
  it("mantiene bloqueado el repo actual sin artefactos oficiales locales", () => {
    const result = inspectLocalOfficialArtifactSet({
      baseDirectory: process.cwd(),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("BLOCKED_REQUIRED_XSD_FILE_MISSING");
    expect(result.networkUsed).toBe(false);
  });

  it("devuelve blocked cuando el CLI no recibe artifact-dir", () => {
    const { status, report } = runCliJson([]);

    expect(status).toBe(0);
    expect(report.status).toBe("blocked");
    expect(report.blockers).toContain(
      "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED",
    );
  });

  it("devuelve exit code distinto de cero en strict sin artifact-dir", () => {
    const result = runCli(["--strict", "--json"]);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain(
      "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED",
    );
  });

  it("inspecciona un directorio temporal con XSD sinteticos simples", () => {
    const directory = makeTempDir();
    writeArtifactSet(directory);

    const result = inspectLocalOfficialArtifactSet({ baseDirectory: directory });

    expect(result.status).toBe("ready");
    expect(result.safeSummaries.every((summary) => summary.exists)).toBe(true);
    expect(result.copiedFilesToRepo).toBe(false);
  });

  it("bloquea checksum esperado incorrecto", () => {
    const directory = makeTempDir();
    const { rootSha, commonSha } = writeArtifactSet(directory);
    const { report } = runCliJson([
      "--artifact-dir",
      directory,
      "--expected-sha256",
      `${DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS[0].artifactId}=${"0".repeat(64)}`,
      "--expected-sha256",
      `${DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS[1].artifactId}=${commonSha}`,
    ]);

    expect(rootSha).not.toBe("0".repeat(64));
    expect(report.status).toBe("blocked");
    expect(report.checksumStatus).toBe("blocked");
    expect(report.blockers).toContain("BLOCKED_LOCAL_ARTIFACT_CHECKSUM_MISMATCH");
  });

  it("bloquea imports remotos en XSD sintetico", () => {
    const directory = makeTempDir();
    const { rootSha, commonSha } = writeArtifactSet(directory, {
      rootBody: '<xs:import schemaLocation="https://example.invalid/Remote.xsd" />',
    });
    const { report } = runCliJson([
      "--artifact-dir",
      directory,
      ...expectedShaArgs(rootSha, commonSha),
    ]);

    expect(report.importGraphStatus).toBe("blocked");
    expect(report.blockers).toContain("BLOCKED_LOCAL_XSD_REMOTE_REFERENCE");
  });

  it("bloquea imports locales faltantes", () => {
    const directory = makeTempDir();
    const { rootSha, commonSha } = writeArtifactSet(directory, {
      rootBody: '<xs:include schemaLocation="Missing.xsd" />',
    });
    const { report } = runCliJson([
      "--artifact-dir",
      directory,
      ...expectedShaArgs(rootSha, commonSha),
    ]);

    expect(report.importGraphStatus).toBe("blocked");
    expect(report.blockers).toContain("BLOCKED_LOCAL_XSD_DEPENDENCY_MISSING");
  });

  it("marca ready el grafo local completo", () => {
    const directory = makeTempDir();
    writeArtifactSet(directory);
    const result = inspectLocalXsdImportGraph({
      filePath: path.join(directory, "SuministroLR.xsd"),
      baseDirectory: directory,
    });

    expect(result.status).toBe("ready");
    expect(result.dependencies).toHaveLength(1);
    expect(result.missingDependencies).toEqual([]);
  });

  it("mantiene readiness global blocked aunque checksum y grafo esten listos", () => {
    const directory = makeTempDir();
    const { rootSha, commonSha } = writeArtifactSet(directory);
    const { report } = runCliJson([
      "--artifact-dir",
      directory,
      ...expectedShaArgs(rootSha, commonSha),
    ]);

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

  it("no imprime XML/XSD completo en reportes", () => {
    const directory = makeTempDir();
    const { rootSha, commonSha } = writeArtifactSet(directory);
    const { raw, report } = runCliJson([
      "--artifact-dir",
      directory,
      ...expectedShaArgs(rootSha, commonSha),
    ]);

    expect(report.containsXmlOrXsdContent).toBe(false);
    expect(raw).not.toContain("<xs:");
    expect(raw).not.toContain("urn:phase2b7t-test");
  });

  it("no imprime secretos ni nombres sensibles detectados", () => {
    const directory = makeTempDir();
    const { rootSha, commonSha } = writeArtifactSet(directory);
    fs.writeFileSync(path.join(directory, "private-secret.xsd"), "never-print", "utf8");
    const { raw, report } = runCliJson([
      "--artifact-dir",
      directory,
      ...expectedShaArgs(rootSha, commonSha),
    ]);

    expect(report.containsSecrets).toBe(false);
    expect(report.blockers).toContain(
      "BLOCKED_LOCAL_ARTIFACT_SECRET_FILENAME_DETECTED",
    );
    expect(raw).not.toContain("private-secret.xsd");
    expect(raw).not.toContain("never-print");
  });

  it("no usa red durante el flujo de aceptacion", () => {
    const directory = makeTempDir();
    const { rootSha, commonSha } = writeArtifactSet(directory);
    const { report } = runCliJson([
      "--artifact-dir",
      directory,
      ...expectedShaArgs(rootSha, commonSha),
    ]);

    expect(report.networkUsed).toBe(false);
    expect(report.certificatesUsed).toBe(false);
  });
});
