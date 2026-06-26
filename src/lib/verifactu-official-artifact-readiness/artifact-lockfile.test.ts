import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildOfficialArtifactLockfile,
  redactOfficialArtifactLockfile,
  validateOfficialArtifactLockfile,
} from "./artifact-lockfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "phase2b7v-lockfile-"));
}

function sha256(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

function writeSyntheticArtifactSet(directory: string): void {
  fs.writeFileSync(
    path.join(directory, "SuministroLR.xsd"),
    '<xs:include schemaLocation="SuministroInformacion.xsd" />',
    "utf8",
  );
  fs.writeFileSync(
    path.join(directory, "SuministroInformacion.xsd"),
    '<xs:schema xmlns:xs="urn:phase2b7v-test" />',
    "utf8",
  );
}

function runGenerator(args: readonly string[]) {
  return spawnSync(
    process.execPath,
    [path.join(process.cwd(), "scripts/generate-verifactu-official-artifact-lockfile.mjs"), ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
}

function runVerifier(args: readonly string[]) {
  return spawnSync(
    process.execPath,
    [path.join(process.cwd(), "scripts/verify-verifactu-official-artifact-lockfile.mjs"), ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
}

function writeGeneratedLockfile(directory: string): string {
  const outputPath = path.join(makeTempDir(), "lockfile.json");
  const result = runGenerator(["--artifact-dir", directory, "--out", outputPath, "--json"]);
  if (result.status !== 0) {
    throw new Error(`Expected generator to pass: ${result.stdout}`);
  }
  return outputPath;
}

function buildReadyLockfile() {
  const directory = makeTempDir();
  writeSyntheticArtifactSet(directory);
  const result = buildOfficialArtifactLockfile({
    baseDirectory: directory,
    generatedAt: "2026-06-26T00:00:00.000Z",
    generatedBy: "phase2b7v-test",
  });

  if (result.status !== "ready") {
    throw new Error(`Expected lockfile to be ready: ${JSON.stringify(result.errors)}`);
  }

  return result.lockfile;
}

describe("PHASE2B7V official artifact lockfile contract", () => {
  it("construye y valida un lockfile seguro con XSD sinteticos temporales", () => {
    const lockfile = buildReadyLockfile();
    const validation = validateOfficialArtifactLockfile(lockfile);
    const serialized = JSON.stringify(lockfile);

    expect(validation.status).toBe("valid");
    expect(lockfile.source).toBe("manual_local_intake");
    expect(lockfile.artifacts).toHaveLength(2);
    expect(lockfile.artifacts[0].includes).toEqual(["SuministroInformacion.xsd"]);
    expect(lockfile.artifacts[1].importedBy).toEqual([
      "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
    ]);
    expect(serialized).not.toContain("<xs:");
    expect(serialized).not.toContain("urn:phase2b7v-test");
    expect(serialized).not.toMatch(/BEGIN CERTIFICATE|PRIVATE KEY|password\s*[:=]/i);
  });

  it("rechaza contenido XSD incluido en campos del lockfile", () => {
    const lockfile = buildReadyLockfile();
    const unsafe = {
      ...lockfile,
      artifacts: [
        {
          ...lockfile.artifacts[0],
          notes: '<xs:schema xmlns:xs="urn:should-not-appear" />',
        },
      ],
    };

    const validation = validateOfficialArtifactLockfile(unsafe);

    expect(validation.status).toBe("blocked");
    if (validation.status === "blocked") {
      expect(validation.errors.map((error) => error.code)).toContain(
        "LOCKFILE_UNSAFE_CONTENT",
      );
    }
  });

  it("rechaza paths absolutos en salida publica", () => {
    const lockfile = buildReadyLockfile();
    const withPath = {
      ...lockfile,
      artifacts: [
        {
          ...lockfile.artifacts[0],
          localPath: path.join(os.tmpdir(), "SuministroLR.xsd"),
        },
      ],
    };

    const validation = validateOfficialArtifactLockfile(withPath);

    expect(validation.status).toBe("blocked");
    if (validation.status === "blocked") {
      const codes = validation.errors.map((error) => error.code);
      expect(codes).toContain("LOCKFILE_LOCAL_PATH_EXPOSED");
      expect(codes).toContain("LOCKFILE_ABSOLUTE_PATH_EXPOSED");
    }
  });

  it("rechaza dominios no oficiales", () => {
    const lockfile = buildReadyLockfile();
    const invalid = {
      ...lockfile,
      artifacts: [
        {
          ...lockfile.artifacts[0],
          officialDomain: "example.invalid",
        },
      ],
    };

    const validation = validateOfficialArtifactLockfile(invalid);

    expect(validation.status).toBe("blocked");
    if (validation.status === "blocked") {
      expect(validation.errors.map((error) => error.code)).toContain(
        "LOCKFILE_OFFICIAL_DOMAIN_INVALID",
      );
    }
  });

  it("rechaza SHA-256 invalidos", () => {
    const lockfile = buildReadyLockfile();
    const invalid = {
      ...lockfile,
      artifacts: [
        {
          ...lockfile.artifacts[0],
          sha256: "not-a-sha",
        },
      ],
    };

    const validation = validateOfficialArtifactLockfile(invalid);

    expect(validation.status).toBe("blocked");
    if (validation.status === "blocked") {
      expect(validation.errors.map((error) => error.code)).toContain(
        "LOCKFILE_SHA256_INVALID",
      );
    }
  });

  it("rechaza extensiones prohibidas", () => {
    const lockfile = buildReadyLockfile();
    const invalid = {
      ...lockfile,
      artifacts: [
        {
          ...lockfile.artifacts[0],
          localFilename: "SuministroLR.xml",
        },
      ],
    };

    const validation = validateOfficialArtifactLockfile(invalid);

    expect(validation.status).toBe("blocked");
    if (validation.status === "blocked") {
      expect(validation.errors.map((error) => error.code)).toContain(
        "LOCKFILE_FORBIDDEN_EXTENSION",
      );
    }
  });

  it("redacta rutas locales antes de exportar", () => {
    const directory = makeTempDir();
    writeSyntheticArtifactSet(directory);
    const result = buildOfficialArtifactLockfile({
      baseDirectory: directory,
      includeLocalPaths: true,
    });

    if (result.status !== "ready") {
      throw new Error("Expected internal lockfile to be ready.");
    }
    expect(result.lockfile.artifacts[0]).toHaveProperty("localPath");

    const redacted = redactOfficialArtifactLockfile(result.lockfile);
    const serialized = JSON.stringify(redacted);

    expect(redacted.artifacts[0]).not.toHaveProperty("localPath");
    expect(validateOfficialArtifactLockfile(redacted).status).toBe("valid");
    expect(serialized).not.toContain(directory);
  });

  it("generator bloquea sin artifact-dir", () => {
    const result = runGenerator(["--json"]);
    const report = JSON.parse(result.stdout) as { status: string; errors: { code: string }[] };

    expect(result.status).not.toBe(0);
    expect(report.status).toBe("blocked");
    expect(report.errors.map((error) => error.code)).toContain(
      "LOCKFILE_GENERATOR_ARTIFACT_DIR_REQUIRED",
    );
  });

  it("generator bloquea directorios inexistentes", () => {
    const result = runGenerator(["--artifact-dir", path.join(os.tmpdir(), "missing-b7w")]);
    const report = JSON.parse(result.stdout) as { status: string; errors: { code: string }[] };

    expect(result.status).not.toBe(0);
    expect(report.status).toBe("blocked");
    expect(report.errors.map((error) => error.code)).toContain(
      "LOCKFILE_GENERATOR_ARTIFACT_DIR_NOT_FOUND",
    );
  });

  it("generator produce JSON redactado con XSD sinteticos temporales", () => {
    const directory = makeTempDir();
    const rootBody = '<xs:include schemaLocation="SuministroInformacion.xsd" />';
    writeSyntheticArtifactSet(directory);

    const result = runGenerator(["--artifact-dir", directory, "--json", "--redacted"]);
    const lockfile = JSON.parse(result.stdout) as {
      artifacts: { sha256: string; includes: string[]; localPath?: string }[];
    };

    expect(result.status).toBe(0);
    expect(lockfile.artifacts[0].sha256).toBe(sha256(rootBody));
    expect(lockfile.artifacts[0].includes).toEqual(["SuministroInformacion.xsd"]);
    expect(lockfile.artifacts[0]).not.toHaveProperty("localPath");
    expect(result.stdout).not.toContain("<xs:");
    expect(result.stdout).not.toContain(directory);
  });

  it("generator escribe --out solo en ruta temporal permitida", () => {
    const directory = makeTempDir();
    writeSyntheticArtifactSet(directory);
    const outputPath = path.join(makeTempDir(), "lockfile.json");

    const result = runGenerator([
      "--artifact-dir",
      directory,
      "--out",
      outputPath,
      "--json",
    ]);
    const written = JSON.parse(fs.readFileSync(outputPath, "utf8")) as {
      lockfileVersion: string;
    };

    expect(result.status).toBe(0);
    expect(written.lockfileVersion).toBe("phase2b7v-official-artifact-lockfile-v1");
  });

  it("generator bloquea --out dentro de docs", () => {
    const directory = makeTempDir();
    writeSyntheticArtifactSet(directory);
    const outputPath = path.join(process.cwd(), "docs", "phase2b7w-lockfile.json");

    const result = runGenerator(["--artifact-dir", directory, "--out", outputPath, "--json"]);
    const report = JSON.parse(result.stdout) as { status: string; errors: { code: string }[] };

    expect(result.status).not.toBe(0);
    expect(report.status).toBe("blocked");
    expect(report.errors.map((error) => error.code)).toContain(
      "LOCKFILE_GENERATOR_OUTPUT_FORBIDDEN",
    );
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it("verifier sin argumentos devuelve no-op bloqueado seguro", () => {
    const result = runVerifier(["--json"]);
    const report = JSON.parse(result.stdout) as { status: string; errors: { code: string }[] };

    expect(result.status).toBe(0);
    expect(report.status).toBe("blocked_missing_arguments");
    expect(report.errors.map((error) => error.code)).toContain(
      "LOCKFILE_VERIFY_ARGUMENTS_REQUIRED",
    );
  });

  it("verifier acepta lockfile valido pero mantiene alineacion bloqueada", () => {
    const directory = makeTempDir();
    writeSyntheticArtifactSet(directory);
    const lockfilePath = writeGeneratedLockfile(directory);

    const result = runVerifier([
      "--artifact-dir",
      directory,
      "--lockfile",
      lockfilePath,
      "--json",
      "--strict",
    ]);
    const report = JSON.parse(result.stdout) as {
      status: string;
      alignmentStatus: string;
      readyForOfficialXml: boolean;
      pendingBlockers: string[];
    };

    expect(result.status).toBe(0);
    expect(report.status).toBe("lockfile_valid_but_alignment_still_blocked");
    expect(report.alignmentStatus).toBe("blocked");
    expect(report.readyForOfficialXml).toBe(false);
    expect(report.pendingBlockers).toContain("BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR");
  });

  it("verifier invalida checksum mismatch", () => {
    const directory = makeTempDir();
    writeSyntheticArtifactSet(directory);
    const lockfilePath = writeGeneratedLockfile(directory);
    const lockfile = JSON.parse(fs.readFileSync(lockfilePath, "utf8")) as {
      artifacts: { sha256: string }[];
    };
    lockfile.artifacts[0].sha256 = "0".repeat(64);
    fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2), "utf8");

    const result = runVerifier(["--artifact-dir", directory, "--lockfile", lockfilePath, "--json"]);
    const report = JSON.parse(result.stdout) as { status: string; errors: { code: string }[] };

    expect(result.status).not.toBe(0);
    expect(report.status).toBe("lockfile_invalid");
    expect(report.errors.map((error) => error.code)).toContain(
      "LOCKFILE_VERIFY_CHECKSUM_MISMATCH",
    );
  });

  it("verifier invalida dependencia local faltante", () => {
    const directory = makeTempDir();
    writeSyntheticArtifactSet(directory);
    const lockfilePath = writeGeneratedLockfile(directory);
    fs.unlinkSync(path.join(directory, "SuministroInformacion.xsd"));

    const result = runVerifier(["--artifact-dir", directory, "--lockfile", lockfilePath, "--json"]);
    const report = JSON.parse(result.stdout) as { status: string; errors: { code: string }[] };
    const codes = report.errors.map((error) => error.code);

    expect(result.status).not.toBe(0);
    expect(report.status).toBe("lockfile_invalid");
    expect(codes).toContain("LOCKFILE_VERIFY_MISSING_DEPENDENCY");
    expect(codes).toContain("LOCKFILE_VERIFY_LOCAL_ARTIFACT_MISSING");
  });

  it("verifier invalida import remoto aunque el checksum coincida", () => {
    const directory = makeTempDir();
    writeSyntheticArtifactSet(directory);
    const lockfilePath = writeGeneratedLockfile(directory);
    const remoteBody = '<xs:import schemaLocation="https://example.invalid/Remote.xsd" />';
    fs.writeFileSync(path.join(directory, "SuministroLR.xsd"), remoteBody, "utf8");
    const lockfile = JSON.parse(fs.readFileSync(lockfilePath, "utf8")) as {
      artifacts: { localFilename: string; sha256: string }[];
    };
    lockfile.artifacts[0].sha256 = sha256(remoteBody);
    fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2), "utf8");

    const result = runVerifier(["--artifact-dir", directory, "--lockfile", lockfilePath, "--json"]);
    const report = JSON.parse(result.stdout) as { status: string; errors: { code: string }[] };

    expect(result.status).not.toBe(0);
    expect(report.status).toBe("lockfile_invalid");
    expect(report.errors.map((error) => error.code)).toContain(
      "LOCKFILE_VERIFY_REMOTE_REFERENCE",
    );
  });

  it("verifier invalida lockfile con dominio no oficial", () => {
    const directory = makeTempDir();
    writeSyntheticArtifactSet(directory);
    const lockfilePath = writeGeneratedLockfile(directory);
    const lockfile = JSON.parse(fs.readFileSync(lockfilePath, "utf8")) as {
      artifacts: { officialDomain: string }[];
    };
    lockfile.artifacts[0].officialDomain = "example.invalid";
    fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2), "utf8");

    const result = runVerifier(["--artifact-dir", directory, "--lockfile", lockfilePath, "--json"]);
    const report = JSON.parse(result.stdout) as { status: string; errors: { code: string }[] };

    expect(result.status).not.toBe(0);
    expect(report.status).toBe("lockfile_invalid");
    expect(report.errors.map((error) => error.code)).toContain(
      "LOCKFILE_VERIFY_NON_OFFICIAL_DOMAIN",
    );
  });

  it("verifier no imprime contenido XSD ni usa red", () => {
    const directory = makeTempDir();
    writeSyntheticArtifactSet(directory);
    const lockfilePath = writeGeneratedLockfile(directory);

    const result = runVerifier(["--artifact-dir", directory, "--lockfile", lockfilePath, "--json"]);
    const report = JSON.parse(result.stdout) as {
      networkUsed: boolean;
      certificatesUsed: boolean;
      containsXmlOrXsdContent: boolean;
    };

    expect(result.status).toBe(0);
    expect(report.networkUsed).toBe(false);
    expect(report.certificatesUsed).toBe(false);
    expect(report.containsXmlOrXsdContent).toBe(false);
    expect(result.stdout).not.toContain("<xs:");
    expect(result.stdout).not.toContain("urn:phase2b7v-test");
  });
});
