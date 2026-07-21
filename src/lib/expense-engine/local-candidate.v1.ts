import type {
  ExpenseEngineAbstentionReasonV1,
  ExpenseEngineDocumentKindV1,
  ExpenseEngineMathCheckV1,
  ExpenseEngineSourceQualityV1,
  ExpenseEngineStructuralArchetypeV1,
  ExpenseLearningConfidenceV1,
} from "./contracts";

export const EXPENSE_LOCAL_CANDIDATE_SCHEMA_VERSION_V1 = 1 as const;
export const EXPENSE_LOCAL_CANDIDATE_VERSION_V1 = "1.0.0" as const;

export interface ExpenseLocalLineCandidateInputV1 {
  readonly reference?: string;
  readonly description: string;
  readonly quantity?: number;
  readonly unit?: string;
  readonly unitPrice?: number;
  readonly discountPercent?: number;
  readonly netUnitPrice?: number;
  readonly taxPercent?: number;
  readonly total?: number;
}

export interface ExpenseLocalCandidateInputV1 {
  readonly documentKind: ExpenseEngineDocumentKindV1;
  readonly supplierName?: string;
  readonly supplierTaxId?: string;
  readonly invoiceNumber?: string;
  readonly date?: string;
  readonly taxBase?: number;
  readonly taxPercent?: number;
  readonly taxAmount?: number;
  readonly surchargePercent?: number;
  readonly surchargeAmount?: number;
  readonly withholdingAmount?: number;
  readonly total?: number;
  readonly lines: readonly ExpenseLocalLineCandidateInputV1[];
}

export interface EphemeralExpenseLocalLineCandidateV1 extends ExpenseLocalLineCandidateInputV1 {
  toJSON(): undefined;
}

export interface EphemeralExpenseLocalCandidateV1 extends Omit<
  ExpenseLocalCandidateInputV1,
  "lines"
> {
  readonly lines: readonly EphemeralExpenseLocalLineCandidateV1[];
  toJSON(): undefined;
}

interface ExpenseLocalCandidateOutcomeBaseV1 {
  readonly schemaVersion: 1;
  readonly candidateVersion: "1.0.0";
  readonly mode: "SHADOW";
  readonly providerCalled: false;
  readonly persistencePolicy: "DO_NOT_PERSIST_CANDIDATE";
  readonly retainedSourceContent: "NONE";
  readonly promotionPolicy: "BLOCKED";
  readonly structuralArchetypeId: ExpenseEngineStructuralArchetypeV1;
  readonly documentKind: ExpenseEngineDocumentKindV1;
  readonly sourceQualityBucket: ExpenseEngineSourceQualityV1;
  readonly localConfidence: ExpenseLearningConfidenceV1;
  readonly math: readonly Readonly<ExpenseEngineMathCheckV1>[];
}

export interface ExpenseLocalCandidateAvailableOutcomeV1 extends ExpenseLocalCandidateOutcomeBaseV1 {
  readonly status: "CANDIDATE";
  readonly abstentionReason: null;
  readonly ephemeralCandidate: EphemeralExpenseLocalCandidateV1;
}

export interface ExpenseLocalCandidateAbstainedOutcomeV1 extends ExpenseLocalCandidateOutcomeBaseV1 {
  readonly status: "ABSTAINED";
  readonly abstentionReason: ExpenseEngineAbstentionReasonV1;
}

export type ExpenseLocalCandidateOutcomeV1 =
  | ExpenseLocalCandidateAvailableOutcomeV1
  | ExpenseLocalCandidateAbstainedOutcomeV1;

interface ExpenseLocalCandidateOutcomeMetadataV1 {
  readonly structuralArchetypeId: ExpenseEngineStructuralArchetypeV1;
  readonly documentKind: ExpenseEngineDocumentKindV1;
  readonly sourceQualityBucket: ExpenseEngineSourceQualityV1;
  readonly localConfidence: ExpenseLearningConfidenceV1;
  readonly math: readonly Readonly<ExpenseEngineMathCheckV1>[];
}

const DOCUMENT_KINDS = new Set<ExpenseEngineDocumentKindV1>([
  "EXPENSE_INVOICE",
  "TICKET",
  "QUOTE_OR_ORDER",
  "PROFORMA",
  "OTHER",
]);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const MAX_LINES = 100;
const MAX_VALUE = 1_000_000_000_000;

export function createEphemeralExpenseLocalCandidateV1(
  input: ExpenseLocalCandidateInputV1,
): EphemeralExpenseLocalCandidateV1 {
  if (
    !DOCUMENT_KINDS.has(input.documentKind) ||
    input.lines.length > MAX_LINES
  ) {
    invalidCandidate();
  }
  const normalized = {
    documentKind: input.documentKind,
    supplierName: optionalText(input.supplierName, 300),
    supplierTaxId: optionalText(input.supplierTaxId, 32),
    invoiceNumber: optionalText(input.invoiceNumber, 100),
    date: optionalDate(input.date),
    taxBase: optionalNumber(input.taxBase),
    taxPercent: optionalRate(input.taxPercent),
    taxAmount: optionalNumber(input.taxAmount),
    surchargePercent: optionalRate(input.surchargePercent),
    surchargeAmount: optionalNumber(input.surchargeAmount),
    withholdingAmount: optionalNumber(input.withholdingAmount),
    total: optionalNumber(input.total),
    lines: createEphemeralArray(
      input.lines.map((line) => createEphemeralLineCandidate(line)),
    ),
  };
  return createEphemeralRecord(normalized);
}

export function createExpenseLocalCandidateAvailableOutcomeV1(input: {
  readonly metadata: ExpenseLocalCandidateOutcomeMetadataV1;
  readonly candidate: ExpenseLocalCandidateInputV1;
}): ExpenseLocalCandidateAvailableOutcomeV1 {
  const outcome = {
    ...baseOutcome(input.metadata),
    status: "CANDIDATE" as const,
    abstentionReason: null,
  } as ExpenseLocalCandidateAvailableOutcomeV1;
  Object.defineProperty(outcome, "ephemeralCandidate", {
    value: createEphemeralExpenseLocalCandidateV1(input.candidate),
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(outcome);
}

export function createExpenseLocalCandidateAbstainedOutcomeV1(input: {
  readonly metadata: ExpenseLocalCandidateOutcomeMetadataV1;
  readonly reason: ExpenseEngineAbstentionReasonV1;
}): ExpenseLocalCandidateAbstainedOutcomeV1 {
  return Object.freeze({
    ...baseOutcome(input.metadata),
    status: "ABSTAINED",
    abstentionReason: input.reason,
  });
}

function baseOutcome(
  metadata: ExpenseLocalCandidateOutcomeMetadataV1,
): ExpenseLocalCandidateOutcomeBaseV1 {
  return {
    schemaVersion: EXPENSE_LOCAL_CANDIDATE_SCHEMA_VERSION_V1,
    candidateVersion: EXPENSE_LOCAL_CANDIDATE_VERSION_V1,
    mode: "SHADOW",
    providerCalled: false,
    persistencePolicy: "DO_NOT_PERSIST_CANDIDATE",
    retainedSourceContent: "NONE",
    promotionPolicy: "BLOCKED",
    structuralArchetypeId: metadata.structuralArchetypeId,
    documentKind: metadata.documentKind,
    sourceQualityBucket: metadata.sourceQualityBucket,
    localConfidence: metadata.localConfidence,
    math: Object.freeze(
      metadata.math.map((check) => Object.freeze({ ...check })),
    ),
  };
}

function createEphemeralLineCandidate(
  input: ExpenseLocalLineCandidateInputV1,
): EphemeralExpenseLocalLineCandidateV1 {
  const description = requiredText(input.description, 500);
  return createEphemeralRecord({
    reference: optionalText(input.reference, 100),
    description,
    quantity: optionalNumber(input.quantity),
    unit: optionalText(input.unit, 32),
    unitPrice: optionalNumber(input.unitPrice),
    discountPercent: optionalRate(input.discountPercent),
    netUnitPrice: optionalNumber(input.netUnitPrice),
    taxPercent: optionalRate(input.taxPercent),
    total: optionalNumber(input.total),
  });
}

function createEphemeralRecord<T extends object>(
  input: T,
): T & { toJSON(): undefined } {
  const output = Object.create(null) as T & { toJSON(): undefined };
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    Object.defineProperty(output, key, {
      value,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  Object.defineProperty(output, "toJSON", {
    value: () => undefined,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(output);
}

function createEphemeralArray<T>(input: T[]): readonly T[] {
  Object.defineProperty(input, "toJSON", {
    value: () => undefined,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(input);
}

function requiredText(value: unknown, maxLength: number): string {
  const normalized = optionalText(value, maxLength);
  if (!normalized) invalidCandidate();
  return normalized;
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") invalidCandidate();
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > maxLength ||
    CONTROL_CHARACTERS.test(normalized)
  ) {
    invalidCandidate();
  }
  return normalized;
}

function optionalDate(value: unknown): string | undefined {
  const normalized = optionalText(value, 10);
  if (normalized === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) invalidCandidate();
  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== normalized
  ) {
    invalidCandidate();
  }
  return normalized;
}

function optionalRate(value: unknown): number | undefined {
  const normalized = optionalNumber(value);
  if (normalized !== undefined && Math.abs(normalized) > 100)
    invalidCandidate();
  return normalized;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > MAX_VALUE
  ) {
    invalidCandidate();
  }
  return Object.is(value, -0) ? 0 : value;
}

function invalidCandidate(): never {
  throw new Error("INVALID_EXPENSE_LOCAL_CANDIDATE");
}
