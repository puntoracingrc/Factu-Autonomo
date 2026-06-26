import { buildSyntheticCandidateHash } from "./candidate-hash";
import { buildSyntheticCandidateInputFromDescriptor } from "./candidate-input";
import { canonicalizeSyntheticCandidateInput } from "./canonicalize";
import { syntheticCandidatePipelineErrorMessage } from "./errors";
import type {
  SyntheticCandidatePipelineError,
  SyntheticCandidatePipelineResult,
  SyntheticCandidateRecordInput,
} from "./types";
import { validateSyntheticXmlCandidate } from "./validate-xml-candidate";
import { buildSyntheticXmlCandidateArtifact } from "./xml-candidate";

function scenarioRejectionError(
  input: SyntheticCandidateRecordInput,
): SyntheticCandidatePipelineError {
  return {
    code:
      input.expectedRejectionReason === "candidate_hash_mismatch"
        ? "candidate_hash_mismatch"
        : "scenario_rejected",
    message: syntheticCandidatePipelineErrorMessage(
      input.expectedRejectionReason === "candidate_hash_mismatch"
        ? "candidate_hash_mismatch"
        : "scenario_rejected",
    ),
    phase: "pipeline",
    descriptorId: input.descriptorId,
    kind: input.kind,
    path: input.expectedRejectionReason,
  };
}

export function runSyntheticCandidateXmlPipeline(
  descriptor: unknown,
): SyntheticCandidatePipelineResult {
  const inputResult = buildSyntheticCandidateInputFromDescriptor(descriptor);
  if (inputResult.status === "rejected") {
    return {
      status: "rejected",
      finality: "candidate_not_aeat",
      syntheticOnly: true,
      transportable: false,
      errors: inputResult.errors,
    };
  }

  const { input } = inputResult;
  const canonicalResult = canonicalizeSyntheticCandidateInput(input);
  if (canonicalResult.status === "rejected") {
    return {
      status: "rejected",
      descriptorId: input.descriptorId,
      kind: input.kind,
      finality: "candidate_not_aeat",
      syntheticOnly: true,
      transportable: false,
      errors: canonicalResult.errors,
    };
  }

  const hashResult = buildSyntheticCandidateHash(canonicalResult.material);
  if (hashResult.status === "rejected") {
    return {
      status: "rejected",
      descriptorId: input.descriptorId,
      kind: input.kind,
      finality: "candidate_not_aeat",
      syntheticOnly: true,
      transportable: false,
      canonical: canonicalResult.safeSummary,
      errors: hashResult.errors,
    };
  }

  if (input.expectedOutcome === "rejected_candidate") {
    return {
      status: "rejected",
      descriptorId: input.descriptorId,
      kind: input.kind,
      finality: "candidate_not_aeat",
      syntheticOnly: true,
      transportable: false,
      rejectionReason: input.expectedRejectionReason,
      canonical: canonicalResult.safeSummary,
      hash: hashResult.safeSummary,
      errors: [scenarioRejectionError(input)],
    };
  }

  const xmlResult = buildSyntheticXmlCandidateArtifact(
    input,
    canonicalResult.material,
    hashResult.hash,
  );
  if (xmlResult.status === "rejected") {
    return {
      status: "rejected",
      descriptorId: input.descriptorId,
      kind: input.kind,
      finality: "candidate_not_aeat",
      syntheticOnly: true,
      transportable: false,
      canonical: canonicalResult.safeSummary,
      hash: hashResult.safeSummary,
      errors: xmlResult.errors,
    };
  }

  const validation = validateSyntheticXmlCandidate(xmlResult.artifact, {
    input,
    canonical: canonicalResult.material,
    hash: hashResult.hash,
  });
  if (validation.status === "rejected") {
    return {
      status: "rejected",
      descriptorId: input.descriptorId,
      kind: input.kind,
      finality: "candidate_not_aeat",
      syntheticOnly: true,
      transportable: false,
      canonical: canonicalResult.safeSummary,
      hash: hashResult.safeSummary,
      errors: validation.errors,
    };
  }

  return {
    status: "accepted",
    descriptorId: input.descriptorId,
    kind: input.kind,
    finality: "candidate_not_aeat",
    syntheticOnly: true,
    transportable: false,
    canonical: canonicalResult.safeSummary,
    hash: hashResult.safeSummary,
    xmlCandidate: xmlResult.safeSummary,
    localValidation: validation,
    errors: [],
  };
}
