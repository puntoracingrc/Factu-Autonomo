import fs from "node:fs";
import path from "node:path";
import type { LocalArtifactInspectionBlocker } from "./errors";
import { computeLocalArtifactSha256, DEFAULT_LOCAL_ARTIFACT_MAX_BYTES } from "./local-xsd-checksum";
import type {
  LocalXsdDependencySummary,
  LocalXsdImportGraphInput,
  LocalXsdImportGraphResult,
} from "./types";

export const PHASE2B7R_LOCAL_XSD_GRAPH_MARKER =
  "PHASE2B7R_LOCAL_XSD_CHECKSUM_IMPORT_GRAPH_VERIFIER_V1";

const SCHEMA_LOCATION_REGEX =
  /<\s*(?:[A-Za-z_][\w.-]*:)?(include|import)\b[^>]*\bschemaLocation\s*=\s*["']([^"']+)["'][^>]*>/g;
const REMOTE_REFERENCE_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

function uniqueBlockers(
  blockers: readonly LocalArtifactInspectionBlocker[],
): readonly LocalArtifactInspectionBlocker[] {
  return [...new Set(blockers)];
}

function isInsideBaseDirectory(filePath: string, baseDirectory: string): boolean {
  const relative = path.relative(baseDirectory, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function inspectLocalXsdImportGraph(
  input: LocalXsdImportGraphInput,
): LocalXsdImportGraphResult {
  const filePath = path.resolve(input.filePath);
  const baseDirectory = path.resolve(input.baseDirectory);
  const maxBytes = input.maxBytes ?? DEFAULT_LOCAL_ARTIFACT_MAX_BYTES;
  const checksum = computeLocalArtifactSha256({ filePath, maxBytes });
  const blockers: LocalArtifactInspectionBlocker[] = [...checksum.blockers];
  const dependencies: LocalXsdDependencySummary[] = [];
  const missingDependencies: string[] = [];
  const blockedRemoteReferences: string[] = [];
  const blockedTraversalReferences: string[] = [];

  if (!isInsideBaseDirectory(filePath, baseDirectory)) {
    blockers.push("BLOCKED_LOCAL_XSD_TRAVERSAL_REFERENCE");
    blockedTraversalReferences.push(path.basename(filePath));
  }
  if (checksum.status !== "ready") {
    return {
      marker: PHASE2B7R_LOCAL_XSD_GRAPH_MARKER,
      status: "blocked",
      safeFileName: path.basename(filePath),
      dependencies,
      missingDependencies,
      blockedRemoteReferences,
      blockedTraversalReferences,
      checksumAvailable: false,
      blockers: uniqueBlockers(blockers),
      networkUsed: false,
      contentPrinted: false,
    };
  }

  const body = fs.readFileSync(filePath, "utf8");
  for (const match of body.matchAll(SCHEMA_LOCATION_REGEX)) {
    const kind = match[1] === "include" ? "include" : "import";
    const schemaLocation = match[2] ?? "";

    if (REMOTE_REFERENCE_REGEX.test(schemaLocation)) {
      blockedRemoteReferences.push(schemaLocation);
      blockers.push("BLOCKED_LOCAL_XSD_REMOTE_REFERENCE");
      dependencies.push({
        kind,
        schemaLocation,
        resolvedSafeName: null,
        exists: false,
      });
      continue;
    }
    if (path.isAbsolute(schemaLocation)) {
      blockedTraversalReferences.push(path.basename(schemaLocation));
      blockers.push("BLOCKED_LOCAL_XSD_TRAVERSAL_REFERENCE");
      dependencies.push({
        kind,
        schemaLocation,
        resolvedSafeName: path.basename(schemaLocation),
        exists: false,
      });
      continue;
    }

    const resolved = path.resolve(path.dirname(filePath), schemaLocation);
    if (!isInsideBaseDirectory(resolved, baseDirectory)) {
      blockedTraversalReferences.push(schemaLocation);
      blockers.push("BLOCKED_LOCAL_XSD_TRAVERSAL_REFERENCE");
      dependencies.push({
        kind,
        schemaLocation,
        resolvedSafeName: path.basename(resolved),
        exists: false,
      });
      continue;
    }

    const exists = fs.existsSync(resolved) && fs.statSync(resolved).isFile();
    if (!exists) {
      missingDependencies.push(schemaLocation);
      blockers.push("BLOCKED_LOCAL_XSD_DEPENDENCY_MISSING");
    }
    dependencies.push({
      kind,
      schemaLocation,
      resolvedSafeName: path.basename(resolved),
      exists,
    });
  }

  const unique = uniqueBlockers(blockers);

  return {
    marker: PHASE2B7R_LOCAL_XSD_GRAPH_MARKER,
    status: unique.length > 0 ? "blocked" : "ready",
    safeFileName: path.basename(filePath),
    dependencies,
    missingDependencies,
    blockedRemoteReferences,
    blockedTraversalReferences,
    checksumAvailable: checksum.status === "ready",
    blockers: unique,
    networkUsed: false,
    contentPrinted: false,
  };
}
