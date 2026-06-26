import fs from "node:fs";
import path from "node:path";
import { OFFICIAL_ARTIFACT_MANIFEST } from "../verifactu-official-alignment";
import type { OfficialArtifactManifestEntry } from "../verifactu-official-alignment";
import type { LocalArtifactInspectionBlocker } from "./errors";
import type {
  LocalArtifactSafeSummary,
  LocalOfficialArtifactCandidate,
  LocalOfficialArtifactIntakeInput,
  LocalOfficialArtifactIntakeResult,
} from "./types";

export const PHASE2B7Q_LOCAL_ARTIFACT_INTAKE_MARKER =
  "PHASE2B7Q_LOCAL_OFFICIAL_ARTIFACT_INTAKE_PROTOCOL_V1";

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
const SECRET_FILENAME_PATTERN = /(?:secret|private|password|token|credential|cert|certificate|clave|contrase)/i;

export const DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS = [
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
    expectedFileName: "SuministroLR.xsd",
    expectedSha256:
      "cbdac8d427cc5ab5d77ca48974cab0f35d6bb819c4c66db361681e3710aeba36",
    requiredExtension: ".xsd",
  },
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0",
    expectedFileName: "SuministroInformacion.xsd",
    expectedSha256:
      "ee4c1655175644de44c4c25055ffeb8e5f4bb4bc3834ce8254d4222ef18c8aa1",
    requiredExtension: ".xsd",
  },
] as const satisfies readonly LocalOfficialArtifactCandidate[];

function uniqueBlockers(
  blockers: readonly LocalArtifactInspectionBlocker[],
): readonly LocalArtifactInspectionBlocker[] {
  return [...new Set(blockers)];
}

function requiredFromManifest(
  manifest: readonly OfficialArtifactManifestEntry[],
): readonly LocalOfficialArtifactCandidate[] {
  return DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS.map((required) => {
    const artifact = manifest.find((entry) => entry.artifactId === required.artifactId);
    return {
      ...required,
      expectedSha256: artifact?.sha256 ?? required.expectedSha256,
    };
  });
}

function isInsideForbiddenRepoPath(
  directory: string,
  repoRoot: string,
): boolean {
  const relative = path.relative(repoRoot, directory);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative === "") {
    return false;
  }
  return relative
    .split(path.sep)
    .some((segment) => FORBIDDEN_DIRECTORY_SEGMENTS.has(segment));
}

function safeDirectoryEntries(directory: string): readonly string[] {
  try {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function inspectDirectoryEntries(
  fileNames: readonly string[],
): readonly LocalArtifactInspectionBlocker[] {
  const blockers: LocalArtifactInspectionBlocker[] = [];

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

  return uniqueBlockers(blockers);
}

function buildSummaries(
  requiredArtifacts: readonly LocalOfficialArtifactCandidate[],
  fileNames: readonly string[],
): readonly LocalArtifactSafeSummary[] {
  const fileNameSet = new Set(fileNames);

  return requiredArtifacts.map((artifact) => ({
    artifactId: artifact.artifactId,
    expectedFileName: artifact.expectedFileName,
    exists: fileNameSet.has(artifact.expectedFileName),
    extensionAllowed: artifact.expectedFileName.endsWith(artifact.requiredExtension),
    checksumExpected: Boolean(artifact.expectedSha256),
  }));
}

export function inspectLocalOfficialArtifactSet(
  input: LocalOfficialArtifactIntakeInput = {},
): LocalOfficialArtifactIntakeResult {
  const repoRoot = path.resolve(input.repoRoot ?? process.cwd());
  const requiredArtifacts =
    input.requiredArtifacts ?? requiredFromManifest(input.manifest ?? OFFICIAL_ARTIFACT_MANIFEST);
  const blockers: LocalArtifactInspectionBlocker[] = [];

  if (!input.baseDirectory) {
    const summaries = buildSummaries(requiredArtifacts, []);
    return {
      marker: PHASE2B7Q_LOCAL_ARTIFACT_INTAKE_MARKER,
      status: "blocked",
      blockers: ["BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED"],
      baseDirectoryProvided: false,
      baseDirectoryAllowed: false,
      networkUsed: false,
      certificatesUsed: false,
      copiedFilesToRepo: false,
      printedContent: false,
      safeSummaries: summaries,
    };
  }

  const baseDirectory = path.resolve(input.baseDirectory);
  const directoryExists = fs.existsSync(baseDirectory);
  const directoryStat = directoryExists ? fs.statSync(baseDirectory) : null;
  if (!directoryExists || !directoryStat?.isDirectory()) {
    blockers.push("BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_FOUND");
  }
  if (isInsideForbiddenRepoPath(baseDirectory, repoRoot)) {
    blockers.push("BLOCKED_LOCAL_ARTIFACT_DIRECTORY_INSIDE_REPO_SOURCE");
  }

  const fileNames = directoryExists && directoryStat?.isDirectory()
    ? safeDirectoryEntries(baseDirectory)
    : [];
  blockers.push(...inspectDirectoryEntries(fileNames));

  const summaries = buildSummaries(requiredArtifacts, fileNames);
  if (summaries.some((summary) => !summary.exists)) {
    blockers.push("BLOCKED_REQUIRED_XSD_FILE_MISSING");
  }
  if (summaries.some((summary) => !summary.extensionAllowed)) {
    blockers.push("BLOCKED_LOCAL_ARTIFACT_EXTENSION_NOT_ALLOWED");
  }

  const unique = uniqueBlockers(blockers);

  return {
    marker: PHASE2B7Q_LOCAL_ARTIFACT_INTAKE_MARKER,
    status: unique.length > 0 ? "blocked" : "ready",
    blockers: unique,
    baseDirectoryProvided: true,
    baseDirectoryAllowed:
      directoryExists &&
      Boolean(directoryStat?.isDirectory()) &&
      !unique.includes("BLOCKED_LOCAL_ARTIFACT_DIRECTORY_INSIDE_REPO_SOURCE") &&
      !unique.includes("BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_FOUND"),
    networkUsed: false,
    certificatesUsed: false,
    copiedFilesToRepo: false,
    printedContent: false,
    safeSummaries: summaries,
  };
}
