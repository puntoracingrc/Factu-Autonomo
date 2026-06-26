import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MARKER = "PHASE2B7X_OPT_IN_OFFICIAL_ARTIFACT_VERIFICATION_V1";
const LOCKFILE_VERSION = "phase2b7v-official-artifact-lockfile-v1";
const KNOWN_ARTIFACTS = new Map([
  [
    "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
    {
      officialUrl:
        "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd",
      officialDomain: "prewww2.aeat.es",
    },
  ],
  [
    "AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0",
    {
      officialUrl:
        "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd",
      officialDomain: "prewww2.aeat.es",
    },
  ],
]);
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
const SHA256_REGEX = /^[a-f0-9]{64}$/;
const UNSAFE_CONTENT_REGEX =
  /<\?xml|<xs:|<RegFactu|BEGIN CERTIFICATE|PRIVATE KEY|password\s*[:=]|token\s*[:=]/i;
const REMOTE_REFERENCE_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;
const SCHEMA_LOCATION_REGEX =
  /<\s*(?:[A-Za-z_][\w.-]*:)?(include|import)\b[^>]*\bschemaLocation\s*=\s*["']([^"']+)["'][^>]*>/g;

function parseArgs(argv) {
  const args = {
    artifactDir: null,
    lockfile: null,
    json: false,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--artifact-dir") {
      args.artifactDir = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--lockfile") {
      args.lockfile = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--strict") {
      args.strict = true;
    }
  }

  return args;
}

function unique(items) {
  return [...new Set(items)];
}

function issue(code, message, artifactId) {
  return { code, message, ...(artifactId ? { artifactId } : {}) };
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

function isInsideBase(filePath, baseDirectory) {
  const relative = path.relative(baseDirectory, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function hasUnsafeContent(value) {
  if (typeof value === "string") return UNSAFE_CONTENT_REGEX.test(value);
  if (Array.isArray(value)) return value.some((item) => hasUnsafeContent(item));
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, item]) => key === "localPath" || hasUnsafeContent(item),
    );
  }
  return false;
}

function validateLockfileShape(lockfile) {
  const errors = [];
  if (!lockfile || typeof lockfile !== "object" || Array.isArray(lockfile)) {
    return [issue("LOCKFILE_VERIFY_INVALID_JSON", "Lockfile must be a JSON object.")];
  }
  if (hasUnsafeContent(lockfile)) {
    errors.push(issue("LOCKFILE_VERIFY_UNSAFE_CONTENT", "Lockfile contains unsafe content."));
  }
  if (lockfile.lockfileVersion !== LOCKFILE_VERSION) {
    errors.push(issue("LOCKFILE_VERIFY_INVALID_VERSION", "Unsupported lockfile version."));
  }
  if (lockfile.source !== "manual_local_intake") {
    errors.push(issue("LOCKFILE_VERIFY_INVALID_SOURCE", "Unsupported lockfile source."));
  }
  if (!Array.isArray(lockfile.artifacts) || lockfile.artifacts.length === 0) {
    errors.push(issue("LOCKFILE_VERIFY_ARTIFACTS_MISSING", "Lockfile artifacts are missing."));
    return errors;
  }

  for (const artifact of lockfile.artifacts) {
    const known = KNOWN_ARTIFACTS.get(artifact.artifactId);
    if (!known) {
      errors.push(issue("LOCKFILE_VERIFY_UNKNOWN_ARTIFACT", "Unknown artifact id.", artifact.artifactId));
      continue;
    }
    if (artifact.officialDomain !== known.officialDomain) {
      errors.push(issue("LOCKFILE_VERIFY_NON_OFFICIAL_DOMAIN", "Official domain mismatch.", artifact.artifactId));
    }
    if (artifact.officialUrl !== known.officialUrl) {
      errors.push(issue("LOCKFILE_VERIFY_NON_OFFICIAL_URL", "Official URL mismatch.", artifact.artifactId));
    }
    if (typeof artifact.sha256 !== "string" || !SHA256_REGEX.test(artifact.sha256)) {
      errors.push(issue("LOCKFILE_VERIFY_INVALID_SHA256", "Invalid SHA-256.", artifact.artifactId));
    }
    for (const filename of [artifact.expectedFilename, artifact.localFilename]) {
      const extension = path.extname(String(filename ?? "")).toLowerCase();
      if (FORBIDDEN_EXTENSIONS.has(extension)) {
        errors.push(issue("LOCKFILE_VERIFY_FORBIDDEN_EXTENSION", "Forbidden extension.", artifact.artifactId));
      } else if (extension !== ".xsd") {
        errors.push(issue("LOCKFILE_VERIFY_EXTENSION_NOT_ALLOWED", "Only .xsd files are allowed.", artifact.artifactId));
      }
    }
    if (artifact.importGraphComplete !== true) {
      errors.push(issue("LOCKFILE_VERIFY_GRAPH_INCOMPLETE", "Import graph is not complete.", artifact.artifactId));
    }
  }
  return errors;
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function inspectGraph(filePath, baseDirectory, artifactId) {
  const errors = [];
  const body = fs.readFileSync(filePath, "utf8");
  for (const match of body.matchAll(SCHEMA_LOCATION_REGEX)) {
    const schemaLocation = match[2] ?? "";
    if (REMOTE_REFERENCE_REGEX.test(schemaLocation)) {
      errors.push(issue("LOCKFILE_VERIFY_REMOTE_REFERENCE", "Remote XSD reference blocked.", artifactId));
      continue;
    }
    if (path.isAbsolute(schemaLocation)) {
      errors.push(issue("LOCKFILE_VERIFY_TRAVERSAL_REFERENCE", "Absolute XSD reference blocked.", artifactId));
      continue;
    }
    const resolved = path.resolve(path.dirname(filePath), schemaLocation);
    if (!isInsideBase(resolved, baseDirectory)) {
      errors.push(issue("LOCKFILE_VERIFY_TRAVERSAL_REFERENCE", "XSD traversal reference blocked.", artifactId));
      continue;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      errors.push(issue("LOCKFILE_VERIFY_MISSING_DEPENDENCY", "Local XSD dependency is missing.", artifactId));
    }
  }
  return errors;
}

function verifyLocalArtifacts(lockfile, baseDirectory) {
  const errors = [];
  for (const artifact of lockfile.artifacts) {
    const filePath = path.join(baseDirectory, artifact.localFilename);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      errors.push(issue("LOCKFILE_VERIFY_LOCAL_ARTIFACT_MISSING", "Local artifact missing.", artifact.artifactId));
      continue;
    }
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".xsd") {
      errors.push(issue("LOCKFILE_VERIFY_EXTENSION_NOT_ALLOWED", "Only .xsd files are allowed.", artifact.artifactId));
      continue;
    }
    const actualSha = sha256File(filePath);
    if (actualSha !== artifact.sha256) {
      errors.push(issue("LOCKFILE_VERIFY_CHECKSUM_MISMATCH", "Local artifact checksum mismatch.", artifact.artifactId));
    }
    errors.push(...inspectGraph(filePath, baseDirectory, artifact.artifactId));
  }
  return errors;
}

function safeReport(status, payload = {}) {
  return {
    marker: MARKER,
    status,
    ...payload,
    alignmentStatus: "blocked",
    pendingBlockers: [
      "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
      "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
      "BLOCKED_HUMAN_APPROVAL_REQUIRED_FOR_OFFICIAL_ARTIFACT_FIXTURES",
    ],
    networkUsed: false,
    certificatesUsed: false,
    xsdValidationPerformed: false,
    readyForOfficialXml: false,
    containsXmlOrXsdContent: false,
    containsSecrets: false,
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.artifactDir || !args.lockfile) {
  const report = safeReport("blocked_missing_arguments", {
    errors: [
      issue(
        "LOCKFILE_VERIFY_ARGUMENTS_REQUIRED",
        "--artifact-dir and --lockfile are required for opt-in verification.",
      ),
    ],
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}${os.EOL}`);
  process.exit(args.strict ? 1 : 0);
}

const artifactDir = path.resolve(args.artifactDir);
const lockfilePath = path.resolve(args.lockfile);
const errors = [];

if (!fs.existsSync(artifactDir) || !fs.statSync(artifactDir).isDirectory()) {
  errors.push(issue("LOCKFILE_VERIFY_ARTIFACT_DIR_NOT_FOUND", "Artifact directory was not found."));
} else if (isInsideForbiddenRepoPath(artifactDir)) {
  errors.push(issue("LOCKFILE_VERIFY_ARTIFACT_DIR_FORBIDDEN", "Artifact directory is inside a forbidden repo directory."));
}
if (!fs.existsSync(lockfilePath) || !fs.statSync(lockfilePath).isFile()) {
  errors.push(issue("LOCKFILE_VERIFY_LOCKFILE_NOT_FOUND", "Lockfile was not found."));
}

let lockfile = null;
if (errors.length === 0) {
  try {
    lockfile = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));
  } catch {
    errors.push(issue("LOCKFILE_VERIFY_INVALID_JSON", "Lockfile JSON could not be parsed."));
  }
}
if (lockfile) {
  errors.push(...validateLockfileShape(lockfile));
  if (errors.length === 0) {
    errors.push(...verifyLocalArtifacts(lockfile, artifactDir));
  }
}

if (errors.length > 0) {
  const report = safeReport("lockfile_invalid", { errors: unique(errors.map(JSON.stringify)).map(JSON.parse) });
  process.stdout.write(`${JSON.stringify(report, null, 2)}${os.EOL}`);
  process.exit(1);
}

const report = safeReport("lockfile_valid_but_alignment_still_blocked", {
  lockfileStatus: "valid",
  artifactCount: lockfile.artifacts.length,
});
process.stdout.write(`${JSON.stringify(report, null, 2)}${os.EOL}`);
process.exit(0);
