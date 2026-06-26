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
  type SyntheticXmlCandidateBuildResult,
  type SyntheticXmlCandidateSafeSummary,
} from "./types";
import { escapeSyntheticXmlText } from "./xml-escape";

const INSPECT = Symbol.for("nodejs.util.inspect.custom");

function pipelineError(
  code: SyntheticCandidatePipelineError["code"],
  input?: Partial<SyntheticCandidateRecordInput>,
  path?: string,
): SyntheticCandidatePipelineError {
  return {
    code,
    message: syntheticCandidatePipelineErrorMessage(code),
    phase: "xml_candidate",
    descriptorId: input?.descriptorId,
    kind: input?.kind,
    path,
  };
}

function xmlDigest(xml: string): string {
  const hex = createHash("sha256").update(xml).digest("hex");
  return `${SYNTHETIC_CANDIDATE_HASH_ALGORITHM}:${hex}`;
}

function buildXml(
  input: SyntheticCandidateRecordInput,
  canonical: CandidateCanonicalMaterial,
  hash: CandidateHashArtifact,
): string {
  const previousHash = input.previousCandidateHash ?? "";
  return [
    `<FactuAutonomoSyntheticFiscalCandidate xmlns="${SYNTHETIC_CANDIDATE_XML_NAMESPACE}" syntheticOnly="true" finality="candidate_not_aeat" transportable="false" schemaVersionCandidate="${SYNTHETIC_XML_CANDIDATE_SCHEMA_VERSION}">`,
    `  <Descriptor id="${escapeSyntheticXmlText(input.descriptorId)}" kind="${escapeSyntheticXmlText(input.kind)}" sourcePhase="${escapeSyntheticXmlText(input.sourcePhase)}" />`,
    `  <Record sequenceCandidate="${input.recordSequenceCandidate}">`,
    `    <IssuerReference>${escapeSyntheticXmlText(input.issuerReference)}</IssuerReference>`,
    `    <InvoiceReference>${escapeSyntheticXmlText(input.invoiceReference)}</InvoiceReference>`,
    `    <IssueDateCandidate>${escapeSyntheticXmlText(input.issueDateCandidate)}</IssueDateCandidate>`,
    `    <OperationReference>${escapeSyntheticXmlText(input.operationReference)}</OperationReference>`,
    `    <AmountMinorCandidate currency="${escapeSyntheticXmlText(input.currencyCandidate)}">${input.amountMinorCandidate}</AmountMinorCandidate>`,
    `    <PreviousCandidateHash>${escapeSyntheticXmlText(previousHash)}</PreviousCandidateHash>`,
    "  </Record>",
    `  <CanonicalMaterial version="${canonical.version}" byteLength="${canonical.byteLength}" fieldCount="${canonical.fields.length}" />`,
    `  <CandidateHash algorithm="${hash.algorithm}" officialFingerprint="false">${escapeSyntheticXmlText(hash.digest)}</CandidateHash>`,
    "  <LocalOnlyNotice>candidate_not_aeat synthetic_only no_external_connection</LocalOnlyNotice>",
    "</FactuAutonomoSyntheticFiscalCandidate>",
  ].join("\n");
}

class InMemorySyntheticXmlCandidateArtifact
  implements SyntheticXmlCandidateArtifact
{
  readonly schemaVersionCandidate = SYNTHETIC_XML_CANDIDATE_SCHEMA_VERSION;
  readonly namespace = SYNTHETIC_CANDIDATE_XML_NAMESPACE;
  readonly finality = "candidate_not_aeat";
  readonly syntheticOnly = true;
  readonly transportable = false;
  readonly digest: string;
  readonly byteLength: number;
  readonly candidateHashDigest: string;
  readonly descriptorId: string;
  readonly kind: SyntheticCandidateRecordInput["kind"];
  #xml: string;

  constructor(
    input: SyntheticCandidateRecordInput,
    candidateHashDigest: string,
    xml: string,
  ) {
    this.descriptorId = input.descriptorId;
    this.kind = input.kind;
    this.candidateHashDigest = candidateHashDigest;
    this.#xml = xml;
    this.digest = xmlDigest(xml);
    this.byteLength = Buffer.byteLength(xml, "utf8");
  }

  getXmlForLocalValidation(): string {
    return this.#xml;
  }

  toJSON(): SyntheticXmlCandidateSafeSummary {
    return {
      schemaVersionCandidate: this.schemaVersionCandidate,
      namespace: this.namespace,
      descriptorId: this.descriptorId,
      kind: this.kind,
      finality: this.finality,
      syntheticOnly: this.syntheticOnly,
      transportable: this.transportable,
      digest: this.digest,
      byteLength: this.byteLength,
      candidateHashDigest: this.candidateHashDigest,
    };
  }

  toString(): string {
    return `[SyntheticXmlCandidateArtifact redacted descriptorId=${this.descriptorId} digest=${this.digest}]`;
  }

  [INSPECT](): string {
    return this.toString();
  }
}

export function buildSyntheticXmlCandidateArtifact(
  input: SyntheticCandidateRecordInput,
  canonical: CandidateCanonicalMaterial,
  hash: CandidateHashArtifact,
): SyntheticXmlCandidateBuildResult {
  const errors: SyntheticCandidatePipelineError[] = [];
  if (input.syntheticOnly !== true) {
    errors.push(pipelineError("synthetic_marker_missing", input, "syntheticOnly"));
  }
  if (input.expectedOutcome !== "accepted_candidate") {
    errors.push(pipelineError("scenario_rejected", input, "expectedOutcome"));
  }
  if (canonical.descriptorId !== input.descriptorId || canonical.kind !== input.kind) {
    errors.push(pipelineError("canonical_material_invalid", input, "canonical"));
  }
  if (
    hash.descriptorId !== input.descriptorId ||
    hash.kind !== input.kind ||
    hash.finality !== "candidate_not_aeat" ||
    hash.officialFingerprint !== false
  ) {
    errors.push(pipelineError("hash_invalid", input, "hash"));
  }
  if (!hash.digest.startsWith(`${SYNTHETIC_CANDIDATE_HASH_ALGORITHM}:`)) {
    errors.push(pipelineError("hash_invalid", input, "hash.digest"));
  }

  if (errors.length > 0) {
    return { status: "rejected", errors };
  }

  const xml = buildXml(input, canonical, hash);
  const artifact = new InMemorySyntheticXmlCandidateArtifact(
    input,
    hash.digest,
    xml,
  );

  return {
    status: "built",
    artifact,
    safeSummary: artifact.toJSON(),
    errors: [],
  };
}
