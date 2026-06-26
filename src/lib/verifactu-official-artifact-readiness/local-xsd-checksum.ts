import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { LocalArtifactInspectionBlocker } from "./errors";
import type { LocalArtifactSha256Input, LocalArtifactSha256Result } from "./types";

export const DEFAULT_LOCAL_ARTIFACT_MAX_BYTES = 1024 * 1024;

function safeFileName(filePath: string): string {
  return path.basename(filePath);
}

export function computeLocalArtifactSha256(
  input: LocalArtifactSha256Input,
): LocalArtifactSha256Result {
  const filePath = path.resolve(input.filePath);
  const maxBytes = input.maxBytes ?? DEFAULT_LOCAL_ARTIFACT_MAX_BYTES;
  const blockers: LocalArtifactInspectionBlocker[] = [];
  const extension = path.extname(filePath).toLowerCase();

  if (extension !== ".xsd") {
    blockers.push("BLOCKED_LOCAL_ARTIFACT_EXTENSION_NOT_ALLOWED");
  }
  if (!fs.existsSync(filePath)) {
    blockers.push("BLOCKED_LOCAL_ARTIFACT_FILE_NOT_FOUND");
    return {
      status: "blocked",
      sha256: null,
      byteLength: null,
      safeFileName: safeFileName(filePath),
      blockers,
    };
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    blockers.push("BLOCKED_LOCAL_ARTIFACT_NOT_A_FILE");
  }
  if (stat.size > maxBytes) {
    blockers.push("BLOCKED_LOCAL_ARTIFACT_TOO_LARGE");
  }
  if (blockers.length > 0) {
    return {
      status: "blocked",
      sha256: null,
      byteLength: stat.size,
      safeFileName: safeFileName(filePath),
      blockers,
    };
  }

  const sha256 = createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

  return {
    status: "ready",
    sha256,
    byteLength: stat.size,
    safeFileName: safeFileName(filePath),
    blockers: [],
  };
}
