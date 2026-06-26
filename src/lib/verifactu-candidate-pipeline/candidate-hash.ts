import { createHash } from "node:crypto";
import { syntheticCandidatePipelineErrorMessage } from "./errors";
import {
  SYNTHETIC_CANDIDATE_CANONICAL_VERSION,
  SYNTHETIC_CANDIDATE_HASH_ALGORITHM,
  type CandidateCanonicalMaterial,
  type CandidateHashArtifact,
  type CandidateHashBuildResult,
  type CandidateHashSafeSummary,
  type SyntheticCandidatePipelineError,
} from "./types";

function pipelineError(
  code: SyntheticCandidatePipelineError["code"],
  material?: Partial<CandidateCanonicalMaterial>,
  path?: string,
): SyntheticCandidatePipelineError {
  return {
    code,
    message: syntheticCandidatePipelineErrorMessage(code),
    phase: "hash",
    descriptorId: material?.descriptorId,
    kind: material?.kind,
    path,
  };
}

function isCanonicalMaterial(
  value: unknown,
): value is CandidateCanonicalMaterial {
  return value !== null && typeof value === "object";
}

export function summarizeCandidateHashArtifact(
  hash: CandidateHashArtifact,
): CandidateHashSafeSummary {
  return {
    algorithm: hash.algorithm,
    digest: hash.digest,
    byteLength: hash.byteLength,
    descriptorId: hash.descriptorId,
    kind: hash.kind,
    finality: hash.finality,
    officialFingerprint: hash.officialFingerprint,
    canonicalVersion: hash.canonicalVersion,
  };
}

export function buildSyntheticCandidateHash(
  material: unknown,
): CandidateHashBuildResult {
  if (!isCanonicalMaterial(material)) {
    return {
      status: "rejected",
      errors: [
        pipelineError("canonical_material_invalid", undefined, "material"),
      ],
    };
  }

  const errors: SyntheticCandidatePipelineError[] = [];
  if (material.version !== SYNTHETIC_CANDIDATE_CANONICAL_VERSION) {
    errors.push(pipelineError("canonical_material_invalid", material, "version"));
  }
  if (material.finality !== "candidate_not_aeat") {
    errors.push(pipelineError("canonical_material_invalid", material, "finality"));
  }
  if (material.syntheticOnly !== true) {
    errors.push(
      pipelineError("synthetic_marker_missing", material, "syntheticOnly"),
    );
  }
  if (typeof material.canonicalText !== "string" || !material.canonicalText) {
    errors.push(
      pipelineError("canonical_material_invalid", material, "canonicalText"),
    );
  }
  if (
    material.byteLength !==
    Buffer.byteLength(material.canonicalText ?? "", "utf8")
  ) {
    errors.push(pipelineError("canonical_material_invalid", material, "byteLength"));
  }
  if (!Array.isArray(material.fields) || material.fields.length === 0) {
    errors.push(pipelineError("canonical_material_invalid", material, "fields"));
  }

  if (errors.length > 0) {
    return { status: "rejected", errors };
  }

  const hex = createHash("sha256").update(material.canonicalText).digest("hex");
  const hash: CandidateHashArtifact = {
    algorithm: SYNTHETIC_CANDIDATE_HASH_ALGORITHM,
    digest: `${SYNTHETIC_CANDIDATE_HASH_ALGORITHM}:${hex}`,
    hex,
    byteLength: material.byteLength,
    descriptorId: material.descriptorId,
    kind: material.kind,
    finality: "candidate_not_aeat",
    officialFingerprint: false,
    canonicalVersion: material.version,
  };

  return {
    status: "hashed",
    hash,
    safeSummary: summarizeCandidateHashArtifact(hash),
    errors: [],
  };
}
