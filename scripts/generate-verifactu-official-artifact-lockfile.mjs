import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MARKER = "PHASE2B7W_LOCAL_OFFICIAL_ARTIFACT_LOCKFILE_GENERATOR_V1";
const LOCKFILE_VERSION = "phase2b7v-official-artifact-lockfile-v1";
const REQUIRED_ARTIFACTS = [
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
    expectedFilename: "SuministroLR.xsd",
    officialUrl:
      "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd",
    officialDomain: "prewww2.aeat.es",
    version: "tikeV1.0",
  },
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0",
    expectedFilename: "SuministroInformacion.xsd",
    officialUrl:
      "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd",
    officialDomain: "prewww2.aeat.es",
    version: "tikeV1.0",
  },
];
const MAX_BYTES = 1024 * 1024;
const FORBIDDEN_REPO_SEGMENTS = new Set(["src", "docs", "public", "app", ".git"]);
const FORBIDDEN_EXTENSIONS = new Set([
  ".pfx",
  ".p12",
  ".pem",
  ".key",
  ".crt",
  ".cer",
  ".pdf",
  ".xlsx",
  ".xml",
]);
const SECRET_FILENAME_PATTERN =
  /(?:secret|private|password|token|credential|cert|certificate|clave|contrase)/i;
const REMOTE_REFERENCE_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;
const SCHEMA_LOCATION_REGEX =
  /<\s*(?:[A-Za-z_][\w.-]*:)?(include|import)\b[^>]*\bschemaLocation\s*=\s*["']([^"']+)["'][^>]*>/g;

function parseArgs(argv) {
  const args = {
    artifactDir: null,
    out: null,
    json: false,
    redacted: false,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--artifact-dir") {
      args.artifactDir = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--out") {
      args.out = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--redacted") {
      args.redacted = true;
    } else if (arg === "--strict") {
      args.strict = true;
    }
  }

  return args;
}

function unique(items) {
  return [...new Set(items)];
}

function error(code, message) {
  return { code, message };
}

function outputBlocked(errors) {
  return {
    marker: MARKER,
    status: "blocked",
    errors: unique(errors.map((entry) => JSON.stringify(entry))).map((entry) =>
      JSON.parse(entry),
    ),
    networkUsed: false,
    certificatesUsed: false,
    copiedArtifacts: false,
    containsXmlOrXsdContent: false,
    containsSecrets: false,
  };
}

function isInsideForbiddenRepoPath(targetPath) {
  const relative = path.relative(process.cwd(), path.resolve(targetPath));
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return false;
  }
  return relative
    .split(path.sep)
    .some((segment) => FORBIDDEN_REPO_SEGMENTS.has(segment));
}

function inspectDirectory(baseDirectory) {
  const errors = [];
  const fileNames = fs
    .readdirSync(baseDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  for (const fileName of fileNames) {
    const extension = path.extname(fileName).toLowerCase();
    if (SECRET_FILENAME_PATTERN.test(fileName)) {
      errors.push(error("LOCKFILE_GENERATOR_SECRET_FILENAME", "Secret-looking filename found."));
    }
    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      errors.push(error("LOCKFILE_GENERATOR_FORBIDDEN_EXTENSION", "Forbidden extension found."));
    } else if (extension !== ".xsd") {
      errors.push(error("LOCKFILE_GENERATOR_EXTENSION_NOT_ALLOWED", "Only .xsd files are allowed."));
    }
  }

  return errors;
}

function sha256File(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return { status: "blocked", errors: [error("LOCKFILE_GENERATOR_NOT_A_FILE", "Artifact is not a file.")] };
  }
  if (stat.size > MAX_BYTES) {
    return { status: "blocked", errors: [error("LOCKFILE_GENERATOR_FILE_TOO_LARGE", "Artifact is too large.")] };
  }
  return {
    status: "ready",
    sha256: createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"),
    byteLength: stat.size,
  };
}

function isInsideBase(filePath, baseDirectory) {
  const relative = path.relative(baseDirectory, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function inspectGraph(filePath, baseDirectory) {
  const errors = [];
  const imports = [];
  const includes = [];
  const body = fs.readFileSync(filePath, "utf8");

  for (const match of body.matchAll(SCHEMA_LOCATION_REGEX)) {
    const kind = match[1] === "include" ? "include" : "import";
    const schemaLocation = match[2] ?? "";

    if (kind === "include") includes.push(schemaLocation);
    else imports.push(schemaLocation);

    if (REMOTE_REFERENCE_REGEX.test(schemaLocation)) {
      errors.push(error("LOCKFILE_GENERATOR_REMOTE_REFERENCE", "Remote XSD reference blocked."));
      continue;
    }
    if (path.isAbsolute(schemaLocation)) {
      errors.push(error("LOCKFILE_GENERATOR_TRAVERSAL_REFERENCE", "Absolute XSD reference blocked."));
      continue;
    }
    const resolved = path.resolve(path.dirname(filePath), schemaLocation);
    if (!isInsideBase(resolved, baseDirectory)) {
      errors.push(error("LOCKFILE_GENERATOR_TRAVERSAL_REFERENCE", "XSD reference outside base directory blocked."));
      continue;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      errors.push(error("LOCKFILE_GENERATOR_MISSING_DEPENDENCY", "Local XSD dependency is missing."));
    }
  }

  return { imports, includes, importGraphComplete: errors.length === 0, errors };
}

function buildLockfile(baseDirectory) {
  const errors = inspectDirectory(baseDirectory);
  const entries = [];

  for (const artifact of REQUIRED_ARTIFACTS) {
    const filePath = path.join(baseDirectory, artifact.expectedFilename);
    if (!fs.existsSync(filePath)) {
      errors.push(error("LOCKFILE_GENERATOR_REQUIRED_XSD_MISSING", "Required XSD file is missing."));
      continue;
    }

    const checksum = sha256File(filePath);
    if (checksum.status !== "ready") {
      errors.push(...checksum.errors);
      continue;
    }

    const graph = inspectGraph(filePath, baseDirectory);
    errors.push(...graph.errors);
    entries.push({
      artifactId: artifact.artifactId,
      expectedFilename: artifact.expectedFilename,
      localFilename: path.basename(filePath),
      officialUrl: artifact.officialUrl,
      officialDomain: artifact.officialDomain,
      version: artifact.version,
      sha256: checksum.sha256,
      byteLength: checksum.byteLength,
      contentTypeCandidate: "application/xml+schema",
      importedBy: [],
      imports: graph.imports,
      includes: graph.includes,
      importGraphComplete: graph.importGraphComplete,
      safeForOfflineTests: false,
      notes: "Generated from manual local intake; artifact content omitted.",
    });
  }

  const importedByByFileName = new Map();
  for (const entry of entries) {
    for (const dependency of [...entry.imports, ...entry.includes]) {
      const dependencyFileName = path.basename(dependency);
      importedByByFileName.set(dependencyFileName, [
        ...(importedByByFileName.get(dependencyFileName) ?? []),
        entry.artifactId,
      ]);
    }
  }

  return {
    errors,
    lockfile: {
      lockfileVersion: LOCKFILE_VERSION,
      generatedAt: new Date().toISOString(),
      generatedBy: "phase2b7w-local-lockfile-generator",
      source: "manual_local_intake",
      artifacts: entries.map((entry) => ({
        ...entry,
        importedBy: unique(importedByByFileName.get(entry.localFilename) ?? []),
      })),
    },
  };
}

function assertOutputPathAllowed(outPath) {
  if (!outPath) {
    return [error("LOCKFILE_GENERATOR_OUTPUT_PATH_MISSING", "Output path is required.")];
  }
  if (path.extname(outPath).toLowerCase() !== ".json") {
    return [error("LOCKFILE_GENERATOR_OUTPUT_EXTENSION", "Output path must be .json.")];
  }
  if (isInsideForbiddenRepoPath(outPath)) {
    return [error("LOCKFILE_GENERATOR_OUTPUT_FORBIDDEN", "Output path is inside a forbidden repo directory.")];
  }
  return [];
}

const args = parseArgs(process.argv.slice(2));
const errors = [];

if (!args.artifactDir) {
  errors.push(error("LOCKFILE_GENERATOR_ARTIFACT_DIR_REQUIRED", "--artifact-dir is required."));
}

const baseDirectory = args.artifactDir ? path.resolve(args.artifactDir) : null;
if (baseDirectory) {
  if (!fs.existsSync(baseDirectory) || !fs.statSync(baseDirectory).isDirectory()) {
    errors.push(error("LOCKFILE_GENERATOR_ARTIFACT_DIR_NOT_FOUND", "Artifact directory was not found."));
  } else if (isInsideForbiddenRepoPath(baseDirectory)) {
    errors.push(error("LOCKFILE_GENERATOR_ARTIFACT_DIR_FORBIDDEN", "Artifact directory is inside a forbidden repo directory."));
  }
}

if (errors.length === 0 && baseDirectory) {
  const result = buildLockfile(baseDirectory);
  errors.push(...result.errors);
  if (errors.length === 0) {
    const lockfile = result.lockfile;
    if (args.out) {
      const outputErrors = assertOutputPathAllowed(args.out);
      errors.push(...outputErrors);
      if (errors.length === 0) {
        fs.writeFileSync(path.resolve(args.out), `${JSON.stringify(lockfile, null, 2)}${os.EOL}`, "utf8");
      }
    }
    if (errors.length === 0) {
      process.stdout.write(`${JSON.stringify(lockfile, null, 2)}${os.EOL}`);
      process.exit(0);
    }
  }
}

const blocked = outputBlocked(errors);
process.stdout.write(`${JSON.stringify(blocked, null, 2)}${os.EOL}`);
process.exit(1);
