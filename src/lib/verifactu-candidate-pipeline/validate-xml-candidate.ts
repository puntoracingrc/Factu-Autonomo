import { createHash } from "node:crypto";
import { syntheticCandidatePipelineErrorMessage } from "./errors";
import {
  SYNTHETIC_CANDIDATE_HASH_ALGORITHM,
  SYNTHETIC_CANDIDATE_XML_NAMESPACE,
  SYNTHETIC_XML_CANDIDATE_SCHEMA_VERSION,
  type CandidateCanonicalMaterial,
  type CandidateHashArtifact,
  type SyntheticCandidatePipelineError,
  type SyntheticCandidateRecordInput,
  type SyntheticXmlCandidateArtifact,
  type SyntheticXmlCandidateValidationResult,
} from "./types";

export interface SyntheticXmlCandidateValidationContext {
  readonly input: SyntheticCandidateRecordInput;
  readonly canonical: CandidateCanonicalMaterial;
  readonly hash: CandidateHashArtifact;
}

function joinTerms(...parts: string[]): string {
  return parts.join("");
}

const BLOCKED_TERMS = [
  joinTerms("<", "?xml"),
  joinTerms("<", "Signature"),
  "X509Certificate",
  joinTerms("BEGIN ", "CERTIFICATE"),
  joinTerms("PRIVATE ", "KEY"),
  joinTerms("sede.", "aeat"),
  joinTerms("www1.", "aeat"),
  joinTerms("www2.", "aeat"),
  "suministrofacturas",
  "suministrolr",
  joinTerms("fiscal", "_transport", "_attempts"),
  joinTerms("transport", 'able="true"'),
] as const;

function pipelineError(
  code: SyntheticCandidatePipelineError["code"],
  input?: Partial<SyntheticCandidateRecordInput>,
  path?: string,
): SyntheticCandidatePipelineError {
  return {
    code,
    message: syntheticCandidatePipelineErrorMessage(code),
    phase: "local_validation",
    descriptorId: input?.descriptorId,
    kind: input?.kind,
    path,
  };
}

function digestXml(xml: string): string {
  const hex = createHash("sha256").update(xml).digest("hex");
  return `${SYNTHETIC_CANDIDATE_HASH_ALGORITHM}:${hex}`;
}

function containsTerm(source: string, term: string): boolean {
  return source.toLowerCase().includes(term.toLowerCase());
}

export function validateSyntheticXmlCandidate(
  artifact: SyntheticXmlCandidateArtifact,
  context: SyntheticXmlCandidateValidationContext,
): SyntheticXmlCandidateValidationResult {
  const errors: SyntheticCandidatePipelineError[] = [];
  const { input, canonical, hash } = context;
  const xml = artifact.getXmlForLocalValidation();

  if (!xml.startsWith("<FactuAutonomoSyntheticFiscalCandidate ")) {
    errors.push(pipelineError("xml_candidate_invalid", input, "root"));
  }
  if (!xml.includes(`xmlns="${SYNTHETIC_CANDIDATE_XML_NAMESPACE}"`)) {
    errors.push(pipelineError("xml_candidate_invalid", input, "namespace"));
  }
  if (!xml.includes('syntheticOnly="true"')) {
    errors.push(pipelineError("synthetic_marker_missing", input, "syntheticOnly"));
  }
  if (!xml.includes('finality="candidate_not_aeat"')) {
    errors.push(pipelineError("xml_candidate_invalid", input, "finality"));
  }
  if (!xml.includes('transportable="false"')) {
    errors.push(pipelineError("xml_candidate_invalid", input, "transportable"));
  }
  if (
    !xml.includes(
      `schemaVersionCandidate="${SYNTHETIC_XML_CANDIDATE_SCHEMA_VERSION}"`,
    )
  ) {
    errors.push(
      pipelineError("xml_candidate_invalid", input, "schemaVersionCandidate"),
    );
  }
  if (!xml.includes(hash.digest)) {
    errors.push(pipelineError("candidate_hash_mismatch", input, "hash.digest"));
  }
  if (input.previousCandidateHash && !xml.includes(input.previousCandidateHash)) {
    errors.push(
      pipelineError(
        "previous_hash_mismatch",
        input,
        "previousCandidateHash",
      ),
    );
  }
  if (
    artifact.descriptorId !== input.descriptorId ||
    artifact.kind !== input.kind ||
    artifact.candidateHashDigest !== hash.digest ||
    canonical.descriptorId !== input.descriptorId ||
    canonical.kind !== input.kind
  ) {
    errors.push(pipelineError("xml_candidate_invalid", input, "context"));
  }
  if (artifact.digest !== digestXml(xml)) {
    errors.push(pipelineError("digest_mismatch", input, "digest"));
  }
  if (artifact.byteLength !== Buffer.byteLength(xml, "utf8")) {
    errors.push(pipelineError("xml_candidate_invalid", input, "byteLength"));
  }
  if (
    artifact.syntheticOnly !== true ||
    artifact.transportable !== false ||
    artifact.finality !== "candidate_not_aeat"
  ) {
    errors.push(pipelineError("xml_candidate_invalid", input, "artifact"));
  }

  for (const term of BLOCKED_TERMS) {
    if (containsTerm(xml, term)) {
      errors.push(pipelineError("blocked_material_detected", input, "xml"));
    }
  }

  if (errors.length > 0) {
    return {
      status: "rejected",
      safeSummary: artifact.toJSON(),
      errors,
    };
  }

  return {
    status: "accepted",
    safeSummary: artifact.toJSON(),
    errors: [],
  };
}
