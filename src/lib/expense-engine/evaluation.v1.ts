import { EXPENSE_VAT_RECONCILIATION_TOLERANCE } from "../expenses";
import type {
  ExpenseEngineDocumentKindV1,
  ExpenseEngineFieldComparisonV1,
  ExpenseEngineFieldKeyV1,
  ExpenseEngineFieldVerdictV1,
} from "./contracts";
import type { ExpenseLocalCandidateOutcomeV1 } from "./local-candidate.v1";

export interface ExpenseEngineEvaluationLineSnapshotV1 {
  readonly unit?: string;
  readonly total?: number;
}

export interface ExpenseEngineEvaluationSnapshotV1 {
  readonly documentKind?: ExpenseEngineDocumentKindV1;
  readonly expenseDate?: string;
  readonly supplierIdentityPresent?: boolean;
  readonly category?: string;
  readonly taxRate?: number;
  readonly taxBase?: number;
  readonly taxAmount?: number;
  readonly surchargeAmount?: number;
  readonly withholdingAmount?: number;
  readonly totalAmount?: number;
  readonly paymentMethod?: string;
  readonly lines?: readonly ExpenseEngineEvaluationLineSnapshotV1[];
}

export interface ExpenseEngineSnapshotEvaluationV1 {
  readonly localVsHuman: readonly Readonly<ExpenseEngineFieldComparisonV1>[];
  readonly aiVsHuman: readonly Readonly<ExpenseEngineFieldComparisonV1>[];
  readonly localVsAi: readonly Readonly<ExpenseEngineFieldComparisonV1>[];
}

type SnapshotValue =
  string | number | boolean | readonly string[] | readonly number[];

const FIELD_KEYS: readonly ExpenseEngineFieldKeyV1[] = [
  "DOCUMENT_KIND",
  "EXPENSE_DATE",
  "SUPPLIER_IDENTITY_PRESENT",
  "CATEGORY",
  "TAX_RATE",
  "TAX_BASE",
  "TAX_AMOUNT",
  "SURCHARGE_AMOUNT",
  "WITHHOLDING_AMOUNT",
  "TOTAL_AMOUNT",
  "PAYMENT_METHOD",
  "LINE_COUNT",
  "LINE_UNITS",
  "LINE_TOTALS",
];

export function evaluateExpenseEngineSnapshotsV1(input: {
  readonly local?: ExpenseEngineEvaluationSnapshotV1;
  readonly ai?: ExpenseEngineEvaluationSnapshotV1;
  readonly human?: ExpenseEngineEvaluationSnapshotV1;
}): ExpenseEngineSnapshotEvaluationV1 {
  return Object.freeze({
    localVsHuman: compareExpenseEngineSnapshotsV1(input.local, input.human),
    aiVsHuman: compareExpenseEngineSnapshotsV1(input.ai, input.human),
    localVsAi: compareExpenseEngineSnapshotsV1(input.local, input.ai),
  });
}

export function evaluateExpenseLocalCandidateV1(input: {
  readonly local: ExpenseLocalCandidateOutcomeV1;
  readonly ai?: ExpenseEngineEvaluationSnapshotV1;
  readonly human?: ExpenseEngineEvaluationSnapshotV1;
}): ExpenseEngineSnapshotEvaluationV1 {
  const local =
    input.local.status === "CANDIDATE"
      ? snapshotFromLocalCandidate(input.local.ephemeralCandidate)
      : undefined;
  return evaluateExpenseEngineSnapshotsV1({
    local,
    ai: input.ai,
    human: input.human,
  });
}

export function compareExpenseEngineSnapshotsV1(
  candidate: ExpenseEngineEvaluationSnapshotV1 | undefined,
  reference: ExpenseEngineEvaluationSnapshotV1 | undefined,
): readonly Readonly<ExpenseEngineFieldComparisonV1>[] {
  return Object.freeze(
    FIELD_KEYS.map((field) =>
      Object.freeze({
        field,
        verdict: compareField(
          field,
          readSnapshotField(candidate, field),
          readSnapshotField(reference, field),
        ),
      }),
    ),
  );
}

function compareField(
  field: ExpenseEngineFieldKeyV1,
  candidate: SnapshotValue | undefined,
  reference: SnapshotValue | undefined,
): ExpenseEngineFieldVerdictV1 {
  if (reference === undefined) return "ABSTAINED";
  if (candidate === undefined) return "MISSING";
  return fieldValuesMatch(field, candidate, reference) ? "MATCH" : "CORRECTED";
}

function fieldValuesMatch(
  field: ExpenseEngineFieldKeyV1,
  candidate: SnapshotValue,
  reference: SnapshotValue,
): boolean {
  if (typeof candidate === "number" && typeof reference === "number") {
    const tolerance =
      field === "TAX_RATE" ? 0.01 : EXPENSE_VAT_RECONCILIATION_TOLERANCE;
    return (
      Number.isFinite(candidate) &&
      Number.isFinite(reference) &&
      Math.abs(candidate - reference) <= tolerance
    );
  }
  if (Array.isArray(candidate) && Array.isArray(reference)) {
    if (candidate.length !== reference.length) return false;
    if (field === "LINE_TOTALS") {
      return candidate.every(
        (value, index) =>
          typeof value === "number" &&
          typeof reference[index] === "number" &&
          Number.isFinite(value) &&
          Number.isFinite(reference[index]) &&
          Math.abs(value - reference[index]) <=
            EXPENSE_VAT_RECONCILIATION_TOLERANCE,
      );
    }
    return candidate.every(
      (value, index) =>
        typeof value === "string" &&
        typeof reference[index] === "string" &&
        normalizeComparableText(value) ===
          normalizeComparableText(reference[index]),
    );
  }
  if (typeof candidate === "string" && typeof reference === "string") {
    return (
      normalizeComparableText(candidate) === normalizeComparableText(reference)
    );
  }
  return candidate === reference;
}

function readSnapshotField(
  snapshot: ExpenseEngineEvaluationSnapshotV1 | undefined,
  field: ExpenseEngineFieldKeyV1,
): SnapshotValue | undefined {
  if (!snapshot) return undefined;
  switch (field) {
    case "DOCUMENT_KIND":
      return snapshot.documentKind;
    case "EXPENSE_DATE":
      return snapshot.expenseDate;
    case "SUPPLIER_IDENTITY_PRESENT":
      return snapshot.supplierIdentityPresent;
    case "CATEGORY":
      return snapshot.category;
    case "TAX_RATE":
      return finiteNumber(snapshot.taxRate);
    case "TAX_BASE":
      return finiteNumber(snapshot.taxBase);
    case "TAX_AMOUNT":
      return finiteNumber(snapshot.taxAmount);
    case "SURCHARGE_AMOUNT":
      return finiteNumber(snapshot.surchargeAmount);
    case "WITHHOLDING_AMOUNT":
      return finiteNumber(snapshot.withholdingAmount);
    case "TOTAL_AMOUNT":
      return finiteNumber(snapshot.totalAmount);
    case "PAYMENT_METHOD":
      return snapshot.paymentMethod;
    case "LINE_COUNT":
      return snapshot.lines ? snapshot.lines.length : undefined;
    case "LINE_UNITS":
      return snapshot.lines &&
        snapshot.lines.every((line) => line.unit !== undefined)
        ? snapshot.lines.map((line) => line.unit!)
        : undefined;
    case "LINE_TOTALS":
      return snapshot.lines &&
        snapshot.lines.every((line) => finiteNumber(line.total) !== undefined)
        ? snapshot.lines.map((line) => finiteNumber(line.total)!)
        : undefined;
  }
}

function normalizeComparableText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ");
}

function snapshotFromLocalCandidate(
  candidate: Extract<
    ExpenseLocalCandidateOutcomeV1,
    { status: "CANDIDATE" }
  >["ephemeralCandidate"],
): ExpenseEngineEvaluationSnapshotV1 {
  return {
    documentKind: candidate.documentKind,
    expenseDate: candidate.date,
    supplierIdentityPresent: Boolean(
      candidate.supplierName || candidate.supplierTaxId,
    ),
    taxRate: candidate.taxPercent,
    taxBase: candidate.taxBase,
    taxAmount: candidate.taxAmount,
    surchargeAmount: candidate.surchargeAmount,
    withholdingAmount: candidate.withholdingAmount,
    totalAmount: candidate.total,
    lines: candidate.lines.map((line) => ({
      unit: line.unit,
      total: line.total,
    })),
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
