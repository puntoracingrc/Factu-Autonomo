import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MARKER = "PHASE2B7S_OFFICIAL_ARTIFACT_READINESS_REPORT_CLI_V1";
const DEFAULT_REQUIRED_ARTIFACTS = [
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
    expectedFileName: "SuministroLR.xsd",
    expectedSha256:
      "cbdac8d427cc5ab5d77ca48974cab0f35d6bb819c4c66db361681e3710aeba36",
  },
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0",
    expectedFileName: "SuministroInformacion.xsd",
    expectedSha256:
      "ee4c1655175644de44c4c25055ffeb8e5f4bb4bc3834ce8254d4222ef18c8aa1",
  },
];
const MAX_BYTES = 1024 * 1024;
const FORBIDDEN_DIRECTORY_SEGMENTS = new Set(["src", "docs", "public", "app", ".git"]);
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
    json: false,
    strict: false,
    expectedSha256ByArtifactId: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--artifact-dir") {
      args.artifactDir = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--strict") {
      args.strict = true;
    } else if (arg === "--expected-sha256") {
      const [artifactId, sha256] = (argv[index + 1] ?? "").split("=");
      if (artifactId && /^[a-f0-9]{64}$/.test(sha256 ?? "")) {
        args.expectedSha256ByArtifactId[artifactId] = sha256;
      }
      index += 1;
    }
  }

  return args;
}

function unique(items) {
  return [...new Set(items)];
}

function isInsideForbiddenRepoPath(directory) {
  const relative = path.relative(process.cwd(), directory);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return false;
  }
  return relative
    .split(path.sep)
    .some((segment) => FORBIDDEN_DIRECTORY_SEGMENTS.has(segment));
}

function safeDirectoryFileNames(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

function inspectDirectoryFileNames(fileNames) {
  const blockers = [];
  for (const fileName of fileNames) {
    const extension = path.extname(fileName).toLowerCase();
    if (SECRET_FILENAME_PATTERN.test(fileName)) {
      blockers.push("BLOCKED_LOCAL_ARTIFACT_SECRET_FILENAME_DETECTED");
    }
    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      blockers.push("BLOCKED_FORBIDDEN_ARTIFACT_EXTENSION");
    } else if (extension !== ".xsd") {
      blockers.push("BLOCKED_LOCAL_ARTIFACT_EXTENSION_NOT_ALLOWED");
    }
  }
  return unique(blockers);
}

function fileSha256(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return { status: "blocked", blockers: ["BLOCKED_LOCAL_ARTIFACT_NOT_A_FILE"] };
  if (stat.size > MAX_BYTES) return { status: "blocked", blockers: ["BLOCKED_LOCAL_ARTIFACT_TOO_LARGE"] };
  return {
    status: "ready",
    sha256: createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"),
  };
}

function isInsideBase(filePath, baseDirectory) {
  const relative = path.relative(baseDirectory, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function inspectGraph(filePath, baseDirectory) {
  const blockers = [];
  if (!fs.existsSync(filePath)) {
    return { status: "blocked", blockers: ["BLOCKED_REQUIRED_XSD_FILE_MISSING"] };
  }
  const body = fs.readFileSync(filePath, "utf8");
  for (const match of body.matchAll(SCHEMA_LOCATION_REGEX)) {
    const schemaLocation = match[2] ?? "";
    if (REMOTE_REFERENCE_REGEX.test(schemaLocation)) {
      blockers.push("BLOCKED_LOCAL_XSD_REMOTE_REFERENCE");
      continue;
    }
    if (path.isAbsolute(schemaLocation)) {
      blockers.push("BLOCKED_LOCAL_XSD_TRAVERSAL_REFERENCE");
      continue;
    }
    const resolved = path.resolve(path.dirname(filePath), schemaLocation);
    if (!isInsideBase(resolved, baseDirectory)) {
      blockers.push("BLOCKED_LOCAL_XSD_TRAVERSAL_REFERENCE");
      continue;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      blockers.push("BLOCKED_LOCAL_XSD_DEPENDENCY_MISSING");
    }
  }

  return { status: blockers.length > 0 ? "blocked" : "ready", blockers: unique(blockers) };
}

function buildReport(args) {
  const blockers = [];
  let checksumStatus = "not_checked";
  let importGraphStatus = "not_checked";
  const artifactSummaries = DEFAULT_REQUIRED_ARTIFACTS.map((artifact) => ({
    artifactId: artifact.artifactId,
    expectedFileName: artifact.expectedFileName,
    exists: false,
    extensionAllowed: true,
    checksumExpected: true,
  }));

  if (!args.artifactDir) {
    blockers.push("BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED");
  } else {
    const baseDirectory = path.resolve(args.artifactDir);
    if (!fs.existsSync(baseDirectory) || !fs.statSync(baseDirectory).isDirectory()) {
      blockers.push("BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_FOUND");
    } else {
      if (isInsideForbiddenRepoPath(baseDirectory)) {
        blockers.push("BLOCKED_LOCAL_ARTIFACT_DIRECTORY_INSIDE_REPO_SOURCE");
      }
      blockers.push(...inspectDirectoryFileNames(safeDirectoryFileNames(baseDirectory)));
      checksumStatus = "ready";
      importGraphStatus = "ready";
      for (const summary of artifactSummaries) {
        const artifact = DEFAULT_REQUIRED_ARTIFACTS.find(
          (entry) => entry.artifactId === summary.artifactId,
        );
        const filePath = path.join(baseDirectory, summary.expectedFileName);
        summary.exists = fs.existsSync(filePath);
        if (!summary.exists) {
          blockers.push("BLOCKED_REQUIRED_XSD_FILE_MISSING");
          checksumStatus = "blocked";
          importGraphStatus = "blocked";
          continue;
        }
        const checksum = fileSha256(filePath);
        if (checksum.status !== "ready") {
          blockers.push(...checksum.blockers);
          checksumStatus = "blocked";
        } else {
          const expected =
            args.expectedSha256ByArtifactId[summary.artifactId] ??
            artifact?.expectedSha256;
          if (expected && checksum.sha256 !== expected) {
            blockers.push("BLOCKED_LOCAL_ARTIFACT_CHECKSUM_MISMATCH");
            checksumStatus = "blocked";
          }
        }
        const graph = inspectGraph(filePath, baseDirectory);
        if (graph.status !== "ready") {
          blockers.push(...graph.blockers, "BLOCKED_LOCAL_XSD_GRAPH_NOT_READY");
          importGraphStatus = "blocked";
        }
      }
    }
  }

  blockers.push(
    "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
    "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
  );

  return {
    marker: MARKER,
    generatedAt: new Date().toISOString(),
    status: "blocked",
    blockers: unique(blockers),
    artifactSummaries,
    checksumStatus,
    importGraphStatus,
    validatorStatus: "blocked",
    syntheticDataStatus: "blocked",
    nextRequiredDecisions: [
      "Obtain official XSD files through a safe manual/offline process.",
      "Decide whether official XSD files can be committed as test fixtures.",
      "Select a reproducible offline XSD validator.",
      "Define a safe official synthetic data strategy.",
    ],
    containsXmlOrXsdContent: false,
    containsSecrets: false,
    networkUsed: false,
    certificatesUsed: false,
  };
}

const args = parseArgs(process.argv.slice(2));
const report = buildReport(args);
if (args.json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}${os.EOL}`);
} else {
  process.stdout.write(
    `VeriFactu official artifact readiness: ${report.status}${os.EOL}` +
      `Blockers: ${report.blockers.join(", ")}${os.EOL}`,
  );
}

if (args.strict && report.status !== "ready") {
  process.exit(1);
}
