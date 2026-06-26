import {
  SYNTHETIC_CANDIDATE_CANONICAL_VERSION,
  type CandidateCanonicalField,
  type CandidateCanonicalMaterial,
  type CandidateCanonicalSafeSummary,
  type CandidateCanonicalizationResult,
  type SyntheticCandidatePipelineError,
  type SyntheticCandidateRecordInput,
} from "./types";
import { SYNTHETIC_FIXTURE_KINDS } from "../verifactu-synthetic-fixtures/types";
import { syntheticCandidatePipelineErrorMessage } from "./errors";

const SYNTHETIC_PREFIX = "SYNTHETIC_ONLY_";
const HASH_PREFIX = "sha256-candidate-v1:";
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pipelineError(
  code: SyntheticCandidatePipelineError["code"],
  input: Partial<SyntheticCandidateRecordInput>,
  path?: string,
): SyntheticCandidatePipelineError {
  return {
    code,
    message: syntheticCandidatePipelineErrorMessage(code),
    phase: "canonicalization",
    descriptorId: input.descriptorId,
    kind: input.kind,
    path,
  };
}

function textField(
  value: unknown,
  fieldName: keyof SyntheticCandidateRecordInput,
  partialInput: Partial<SyntheticCandidateRecordInput>,
  errors: SyntheticCandidatePipelineError[],
): string {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(pipelineError("input_field_missing", partialInput, fieldName));
    return "";
  }

  const normalized = value.trim();
  if (/[\r\n]/.test(normalized) || /[<>]/.test(normalized)) {
    errors.push(
      pipelineError("unsafe_candidate_value", partialInput, fieldName),
    );
    return "";
  }

  return normalized;
}

function requireSyntheticReference(
  value: string,
  fieldName: keyof SyntheticCandidateRecordInput,
  partialInput: Partial<SyntheticCandidateRecordInput>,
  errors: SyntheticCandidatePipelineError[],
): void {
  if (!value.startsWith(SYNTHETIC_PREFIX)) {
    errors.push(
      pipelineError("identifier_not_synthetic", partialInput, fieldName),
    );
  }
}

function normalizePreviousCandidateHash(
  value: unknown,
  partialInput: Partial<SyntheticCandidateRecordInput>,
  errors: SyntheticCandidatePipelineError[],
): string | null {
  if (value === null) return null;
  const normalized = textField(
    value,
    "previousCandidateHash",
    partialInput,
    errors,
  );
  if (!normalized) return null;
  if (
    !normalized.startsWith(SYNTHETIC_PREFIX) &&
    !normalized.startsWith(HASH_PREFIX)
  ) {
    errors.push(
      pipelineError(
        "identifier_not_synthetic",
        partialInput,
        "previousCandidateHash",
      ),
    );
  }
  return normalized;
}

function integerField(
  value: unknown,
  fieldName: keyof SyntheticCandidateRecordInput,
  partialInput: Partial<SyntheticCandidateRecordInput>,
  errors: SyntheticCandidatePipelineError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    errors.push(pipelineError("input_field_invalid", partialInput, fieldName));
    return 0;
  }
  return value;
}

function canonicalValue(value: string | number | boolean | null): string {
  if (value === null) return "null";
  return String(value);
}

function buildCanonicalFields(
  input: SyntheticCandidateRecordInput,
): readonly CandidateCanonicalField[] {
  return [
    { name: "version", value: SYNTHETIC_CANDIDATE_CANONICAL_VERSION },
    { name: "finality", value: "candidate_not_aeat" },
    { name: "syntheticOnly", value: canonicalValue(input.syntheticOnly) },
    { name: "descriptorId", value: input.descriptorId },
    { name: "kind", value: input.kind },
    { name: "sourcePhase", value: input.sourcePhase },
    { name: "issuerReference", value: input.issuerReference },
    { name: "invoiceReference", value: input.invoiceReference },
    { name: "issueDateCandidate", value: input.issueDateCandidate },
    { name: "operationReference", value: input.operationReference },
    {
      name: "recordSequenceCandidate",
      value: canonicalValue(input.recordSequenceCandidate),
    },
    {
      name: "previousCandidateHash",
      value: canonicalValue(input.previousCandidateHash),
    },
    {
      name: "amountMinorCandidate",
      value: canonicalValue(input.amountMinorCandidate),
    },
    { name: "currencyCandidate", value: input.currencyCandidate },
    { name: "expectedOutcome", value: input.expectedOutcome },
    {
      name: "expectedRejectionReason",
      value: input.expectedRejectionReason ?? "none",
    },
  ];
}

export function summarizeCandidateCanonicalMaterial(
  material: CandidateCanonicalMaterial,
): CandidateCanonicalSafeSummary {
  return {
    version: material.version,
    finality: material.finality,
    syntheticOnly: material.syntheticOnly,
    descriptorId: material.descriptorId,
    kind: material.kind,
    fieldCount: material.fields.length,
    byteLength: material.byteLength,
  };
}

export function canonicalizeSyntheticCandidateInput(
  input: unknown,
): CandidateCanonicalizationResult {
  if (!isRecord(input)) {
    return {
      status: "rejected",
      errors: [
        {
          code: "input_missing",
          message: syntheticCandidatePipelineErrorMessage("input_missing"),
          phase: "canonicalization",
        },
      ],
    };
  }

  const partialInput = input as Partial<SyntheticCandidateRecordInput>;
  const errors: SyntheticCandidatePipelineError[] = [];

  const descriptorId = textField(
    input.descriptorId,
    "descriptorId",
    partialInput,
    errors,
  );
  const kind = textField(input.kind, "kind", partialInput, errors);
  const sourcePhase = textField(
    input.sourcePhase,
    "sourcePhase",
    partialInput,
    errors,
  );
  const issuerReference = textField(
    input.issuerReference,
    "issuerReference",
    partialInput,
    errors,
  );
  const invoiceReference = textField(
    input.invoiceReference,
    "invoiceReference",
    partialInput,
    errors,
  );
  const issueDateCandidate = textField(
    input.issueDateCandidate,
    "issueDateCandidate",
    partialInput,
    errors,
  );
  const operationReference = textField(
    input.operationReference,
    "operationReference",
    partialInput,
    errors,
  );
  const previousCandidateHash = normalizePreviousCandidateHash(
    input.previousCandidateHash,
    partialInput,
    errors,
  );
  const currencyCandidate = textField(
    input.currencyCandidate,
    "currencyCandidate",
    partialInput,
    errors,
  );
  const expectedOutcome = textField(
    input.expectedOutcome,
    "expectedOutcome",
    partialInput,
    errors,
  );

  if (input.syntheticOnly !== true) {
    errors.push(
      pipelineError("synthetic_marker_missing", partialInput, "syntheticOnly"),
    );
  }

  if (
    kind &&
    !SYNTHETIC_FIXTURE_KINDS.includes(
      kind as SyntheticCandidateRecordInput["kind"],
    )
  ) {
    errors.push(pipelineError("unsupported_kind", partialInput, "kind"));
  }

  for (const [fieldName, value] of [
    ["descriptorId", descriptorId],
    ["issuerReference", issuerReference],
    ["invoiceReference", invoiceReference],
    ["operationReference", operationReference],
  ] as const) {
    if (value) requireSyntheticReference(value, fieldName, partialInput, errors);
  }

  if (
    issueDateCandidate &&
    !ISO_DATE_REGEX.test(issueDateCandidate) &&
    !issueDateCandidate.startsWith(SYNTHETIC_PREFIX)
  ) {
    errors.push(
      pipelineError("input_field_invalid", partialInput, "issueDateCandidate"),
    );
  }

  if (currencyCandidate && !CURRENCY_REGEX.test(currencyCandidate)) {
    errors.push(
      pipelineError("input_field_invalid", partialInput, "currencyCandidate"),
    );
  }

  if (
    expectedOutcome !== "accepted_candidate" &&
    expectedOutcome !== "rejected_candidate"
  ) {
    errors.push(
      pipelineError("input_field_invalid", partialInput, "expectedOutcome"),
    );
  }

  const recordSequenceCandidate = integerField(
    input.recordSequenceCandidate,
    "recordSequenceCandidate",
    partialInput,
    errors,
  );
  if (recordSequenceCandidate < 1) {
    errors.push(
      pipelineError(
        "input_field_invalid",
        partialInput,
        "recordSequenceCandidate",
      ),
    );
  }
  const amountMinorCandidate = integerField(
    input.amountMinorCandidate,
    "amountMinorCandidate",
    partialInput,
    errors,
  );

  const expectedRejectionReason =
    typeof input.expectedRejectionReason === "string" &&
    input.expectedRejectionReason.trim()
      ? input.expectedRejectionReason.trim()
      : undefined;

  if (expectedOutcome === "rejected_candidate" && !expectedRejectionReason) {
    errors.push(
      pipelineError(
        "input_field_missing",
        partialInput,
        "expectedRejectionReason",
      ),
    );
  }

  if (errors.length > 0) {
    return { status: "rejected", errors };
  }

  const normalizedInput: SyntheticCandidateRecordInput = {
    descriptorId,
    kind: kind as SyntheticCandidateRecordInput["kind"],
    syntheticOnly: true,
    sourcePhase,
    issuerReference,
    invoiceReference,
    issueDateCandidate,
    operationReference,
    recordSequenceCandidate,
    previousCandidateHash,
    amountMinorCandidate,
    currencyCandidate,
    expectedOutcome: expectedOutcome as SyntheticCandidateRecordInput["expectedOutcome"],
    expectedRejectionReason:
      expectedRejectionReason as SyntheticCandidateRecordInput["expectedRejectionReason"],
  };

  const fields = buildCanonicalFields(normalizedInput);
  const canonicalText = `${fields
    .map((field) => `${field.name}=${field.value}`)
    .join("\n")}\n`;
  const material: CandidateCanonicalMaterial = {
    version: SYNTHETIC_CANDIDATE_CANONICAL_VERSION,
    finality: "candidate_not_aeat",
    syntheticOnly: true,
    descriptorId,
    kind: normalizedInput.kind,
    fields,
    canonicalText,
    byteLength: Buffer.byteLength(canonicalText, "utf8"),
  };

  return {
    status: "canonicalized",
    material,
    safeSummary: summarizeCandidateCanonicalMaterial(material),
    errors: [],
  };
}
