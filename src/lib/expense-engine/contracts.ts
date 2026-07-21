export const EXPENSE_ENGINE_VERSION = "expense-local-engine.v1";
export const EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION =
  "expense-engine-observation.v1";
export const EXPENSE_LEARNING_HINTS_SCHEMA_VERSION =
  "expense-learning-hints.v1";
export const EXPENSE_ENGINE_PRIVACY_POLICY_VERSION = "2026-07-21";
export const EXPENSE_ENGINE_PRIVACY_SCOPE =
  "aggregate_only_no_identity_no_raw_content_no_exact_values";

const PAGE_MODES = ["SINGLE", "MULTI", "UNKNOWN"] as const;
const READING_ORDERS = [
  "ROW_MAJOR",
  "COLUMN_MAJOR",
  "MIXED",
  "UNKNOWN",
] as const;
const REGIONS = [
  "HEADER",
  "SUPPLIER_BLOCK",
  "LINE_ITEMS",
  "TAX_SUMMARY",
  "TOTALS",
  "PAYMENT",
  "FOOTER",
  "UNKNOWN",
] as const;
const TABLE_COUNTS = ["NONE", "ONE", "MULTIPLE", "UNKNOWN"] as const;
const TABLE_ROLES = ["LINE_ITEMS", "TAX_SUMMARY", "TOTALS", "UNKNOWN"] as const;
const COLUMN_ROLES = [
  "REFERENCE",
  "DESCRIPTION",
  "QUANTITY",
  "CHARGE_QUANTITY",
  "UNIT",
  "WIDTH",
  "HEIGHT",
  "LENGTH",
  "UNIT_PRICE",
  "DISCOUNT_RATE",
  "NET_UNIT_PRICE",
  "TAX_BASE",
  "TAX_RATE",
  "TAX_AMOUNT",
  "SURCHARGE_RATE",
  "SURCHARGE_AMOUNT",
  "WITHHOLDING_RATE",
  "WITHHOLDING_AMOUNT",
  "LINE_TOTAL",
  "UNKNOWN",
] as const;
const LEARNING_UNITS = [
  "TEXT",
  "COUNT",
  "MM",
  "CM",
  "M",
  "M2",
  "ML",
  "KG",
  "HOUR",
  "DAY",
  "PACKAGE",
  "EUR",
  "PERCENT",
  "NONE",
  "UNKNOWN",
] as const;
const SIGN_CONVENTIONS = [
  "SIGNED",
  "UNSIGNED",
  "ACCOUNTING_NEGATIVE",
  "UNKNOWN",
] as const;
const CONFIDENCE_BUCKETS = ["LOW", "MEDIUM", "HIGH"] as const;
const LABEL_ROLES = [
  "SUBTOTAL",
  "TAX_BASE",
  "TAX",
  "SURCHARGE",
  "WITHHOLDING",
  "TOTAL",
  "DUE_DATE",
  "PAYMENT_TERMS",
  "UNKNOWN",
] as const;
const FORMULA_SCOPES = ["LINE", "TAX_SUMMARY", "DOCUMENT"] as const;
const FORMULA_KINDS = [
  "QUANTITY_X_UNIT_PRICE",
  "QUANTITY_X_NET_UNIT_PRICE",
  "AREA_X_NET_PRICE",
  "LINEAR_X_NET_PRICE",
  "UNITS_X_NET_PRICE",
  "BASE_X_TAX_RATE",
  "BASE_X_SURCHARGE_RATE",
  "SUM_LINES",
  "SUM_TAX_BASES",
  "BASE_PLUS_TAX",
  "BASE_PLUS_TAX_PLUS_SURCHARGE",
  "BASE_PLUS_TAX_MINUS_WITHHOLDING",
  "BASE_PLUS_TAX_PLUS_SURCHARGE_MINUS_WITHHOLDING",
  "UNKNOWN",
] as const;
const ROUNDING_MODES = ["HALF_UP", "HALF_EVEN", "TRUNCATE", "UNKNOWN"] as const;

export type ExpenseLearningPageModeV1 = (typeof PAGE_MODES)[number];
export type ExpenseLearningReadingOrderV1 = (typeof READING_ORDERS)[number];
export type ExpenseLearningRegionV1 = (typeof REGIONS)[number];
export type ExpenseLearningTableCountV1 = (typeof TABLE_COUNTS)[number];
export type ExpenseLearningTableRoleV1 = (typeof TABLE_ROLES)[number];
export type ExpenseLearningColumnRoleV1 = (typeof COLUMN_ROLES)[number];
export type ExpenseLearningUnitV1 = (typeof LEARNING_UNITS)[number];
export type ExpenseLearningSignConventionV1 = (typeof SIGN_CONVENTIONS)[number];
export type ExpenseLearningConfidenceV1 = (typeof CONFIDENCE_BUCKETS)[number];
export type ExpenseLearningLabelRoleV1 = (typeof LABEL_ROLES)[number];
export type ExpenseLearningFormulaScopeV1 = (typeof FORMULA_SCOPES)[number];
export type ExpenseLearningFormulaKindV1 = (typeof FORMULA_KINDS)[number];
export type ExpenseLearningRoundingModeV1 = (typeof ROUNDING_MODES)[number];

export interface ExpenseLearningColumnV1 {
  readonly tableRole: ExpenseLearningTableRoleV1;
  readonly index: number;
  readonly role: ExpenseLearningColumnRoleV1;
  readonly normalizedLabel: ExpenseLearningColumnRoleV1;
  readonly unit: ExpenseLearningUnitV1;
  readonly sign: ExpenseLearningSignConventionV1;
  readonly confidence: ExpenseLearningConfidenceV1;
}

export interface ExpenseLearningLabelV1 {
  readonly role: ExpenseLearningLabelRoleV1;
  readonly region: ExpenseLearningRegionV1;
  readonly confidence: ExpenseLearningConfidenceV1;
}

export interface ExpenseLearningFormulaV1 {
  readonly scope: ExpenseLearningFormulaScopeV1;
  readonly kind: ExpenseLearningFormulaKindV1;
  readonly rounding: Readonly<{
    mode: ExpenseLearningRoundingModeV1;
    scale: number;
  }>;
  readonly sign: ExpenseLearningSignConventionV1;
  readonly confidence: ExpenseLearningConfidenceV1;
}

export interface ExpenseLearningHintsV1 {
  readonly schemaVersion: typeof EXPENSE_LEARNING_HINTS_SCHEMA_VERSION;
  readonly layout: Readonly<{
    pageMode: ExpenseLearningPageModeV1;
    readingOrder: ExpenseLearningReadingOrderV1;
    regionOrder: readonly ExpenseLearningRegionV1[];
    tableCount: ExpenseLearningTableCountV1;
  }>;
  readonly columns: readonly Readonly<ExpenseLearningColumnV1>[];
  readonly labels: readonly Readonly<ExpenseLearningLabelV1>[];
  readonly formulas: readonly Readonly<ExpenseLearningFormulaV1>[];
}

const STRUCTURAL_ARCHETYPES = [
  "SUMMARY_ONLY",
  "LINE_TABLE",
  "DIMENSION_TABLE",
  "MIXED_TAX_TABLE",
  "RECURRING_RECEIPT",
  "QUICK_TICKET",
  "CREDIT_NOTE",
  "NON_EXPENSE",
  "UNKNOWN",
] as const;
const DOCUMENT_KINDS = [
  "EXPENSE_INVOICE",
  "TICKET",
  "QUOTE_OR_ORDER",
  "PROFORMA",
  "OTHER",
] as const;
const SOURCE_QUALITY_BUCKETS = ["HIGH", "MEDIUM", "LOW", "UNREADABLE"] as const;
const ROUTE_MODES = [
  "SHADOW_AI",
  "LOCAL_ONLY",
  "AI_FALLBACK",
  "HUMAN_REVIEW",
] as const;
const LOCAL_OUTCOMES = ["CANDIDATE", "ABSTAINED", "FAILED"] as const;
const ABSTENTION_REASONS = [
  "UNSUPPORTED_ARCHETYPE",
  "LOW_CONFIDENCE",
  "OCR_REQUIRED",
  "OCR_UNAVAILABLE",
  "MISSING_FIELDS",
  "MATH_UNRECONCILED",
  "POLICY_ABSTENTION",
  "LIMIT_EXCEEDED",
  "INVALID_INPUT",
  "UNKNOWN",
] as const;
const REVIEW_STATUSES = [
  "CONFIRMED",
  "CORRECTED",
  "REJECTED",
  "NOT_REVIEWED",
] as const;
const FIELD_KEYS = [
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
] as const;
const FIELD_VERDICTS = [
  "MATCH",
  "CORRECTED",
  "MISSING",
  "EXTRA",
  "ABSTAINED",
] as const;
export const EXPENSE_MATH_CHECKS = [
  "LINE_EXTENSIONS",
  "LINES_TO_BASE",
  "TAX_FROM_BASE",
  "SURCHARGE_FROM_BASE",
  "DOCUMENT_TOTAL",
  "SIGN_CONSISTENCY",
] as const;
export const EXPENSE_MATH_VERDICTS = [
  "MATCH",
  "MISMATCH",
  "INSUFFICIENT",
] as const;
export const EXPENSE_MATH_RESIDUAL_BUCKETS = [
  "EXACT",
  "CENT_TOLERANCE",
  "ROUNDING_TOLERANCE",
  "MATERIAL",
  "UNKNOWN",
] as const;
const CRITICAL_FLAGS = [
  "EXPENSE_ACCEPTED_THEN_REJECTED",
  "TAX_TREATMENT_CORRECTED",
  "CREDIT_SIGN_CORRECTED",
  "DUPLICATE_ACCEPTED",
] as const;
const DURATION_BUCKETS = [
  "LT_250_MS",
  "LT_1_S",
  "LT_5_S",
  "GTE_5_S",
  "UNKNOWN",
] as const;
const AI_USAGE_BUCKETS = ["NONE", "ONE", "MULTIPLE", "UNKNOWN"] as const;

export type ExpenseEngineStructuralArchetypeV1 =
  (typeof STRUCTURAL_ARCHETYPES)[number];
export type ExpenseEngineDocumentKindV1 = (typeof DOCUMENT_KINDS)[number];
export type ExpenseEngineSourceQualityV1 =
  (typeof SOURCE_QUALITY_BUCKETS)[number];
export type ExpenseEngineRouteModeV1 = (typeof ROUTE_MODES)[number];
export type ExpenseEngineLocalOutcomeV1 = (typeof LOCAL_OUTCOMES)[number];
export type ExpenseEngineAbstentionReasonV1 =
  (typeof ABSTENTION_REASONS)[number];
export type ExpenseEngineReviewStatusV1 = (typeof REVIEW_STATUSES)[number];
export type ExpenseEngineFieldKeyV1 = (typeof FIELD_KEYS)[number];
export type ExpenseEngineFieldVerdictV1 = (typeof FIELD_VERDICTS)[number];
export type ExpenseEngineMathCheckKeyV1 = (typeof EXPENSE_MATH_CHECKS)[number];
export type ExpenseEngineMathVerdictV1 = (typeof EXPENSE_MATH_VERDICTS)[number];
export type ExpenseEngineMathResidualBucketV1 =
  (typeof EXPENSE_MATH_RESIDUAL_BUCKETS)[number];
export type ExpenseEngineCriticalFlagV1 = (typeof CRITICAL_FLAGS)[number];
export type ExpenseEngineDurationBucketV1 = (typeof DURATION_BUCKETS)[number];
export type ExpenseEngineAiUsageBucketV1 = (typeof AI_USAGE_BUCKETS)[number];

export interface ExpenseEngineFieldComparisonV1 {
  readonly field: ExpenseEngineFieldKeyV1;
  readonly verdict: ExpenseEngineFieldVerdictV1;
}

export interface ExpenseEngineMathCheckV1 {
  readonly check: ExpenseEngineMathCheckKeyV1;
  readonly verdict: ExpenseEngineMathVerdictV1;
  readonly residual: ExpenseEngineMathResidualBucketV1;
}

export interface ExpenseEngineObservationV1 {
  readonly schemaVersion: typeof EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION;
  readonly engineVersion: typeof EXPENSE_ENGINE_VERSION;
  readonly policyVersion: typeof EXPENSE_ENGINE_PRIVACY_POLICY_VERSION;
  readonly privacyScope: typeof EXPENSE_ENGINE_PRIVACY_SCOPE;
  readonly structuralArchetypeId: ExpenseEngineStructuralArchetypeV1;
  readonly documentKind: ExpenseEngineDocumentKindV1;
  readonly sourceQualityBucket: ExpenseEngineSourceQualityV1;
  readonly routeMode: ExpenseEngineRouteModeV1;
  readonly localOutcome: ExpenseEngineLocalOutcomeV1;
  readonly localConfidence: ExpenseLearningConfidenceV1;
  readonly abstentionReason: ExpenseEngineAbstentionReasonV1 | null;
  readonly aiFallbackUsed: boolean;
  readonly aiFallbackReason: ExpenseEngineAbstentionReasonV1 | null;
  readonly aiUsageBucket: ExpenseEngineAiUsageBucketV1;
  readonly localDurationBucket: ExpenseEngineDurationBucketV1;
  readonly humanReviewStatus: ExpenseEngineReviewStatusV1;
  readonly localVsHuman: readonly Readonly<ExpenseEngineFieldComparisonV1>[];
  readonly aiVsHuman: readonly Readonly<ExpenseEngineFieldComparisonV1>[];
  readonly localVsAi: readonly Readonly<ExpenseEngineFieldComparisonV1>[];
  readonly math: readonly Readonly<ExpenseEngineMathCheckV1>[];
  readonly criticalFlags: readonly ExpenseEngineCriticalFlagV1[];
  readonly learningHints: ExpenseLearningHintsV1 | null;
}

const HINT_KEYS = new Set([
  "schemaVersion",
  "layout",
  "columns",
  "labels",
  "formulas",
]);
const LAYOUT_KEYS = new Set([
  "pageMode",
  "readingOrder",
  "regionOrder",
  "tableCount",
]);
const COLUMN_KEYS = new Set([
  "tableRole",
  "index",
  "role",
  "normalizedLabel",
  "unit",
  "sign",
  "confidence",
]);
const LABEL_KEYS = new Set(["role", "region", "confidence"]);
const FORMULA_KEYS = new Set([
  "scope",
  "kind",
  "rounding",
  "sign",
  "confidence",
]);
const ROUNDING_KEYS = new Set(["mode", "scale"]);
const OBSERVATION_KEYS = new Set([
  "schemaVersion",
  "engineVersion",
  "policyVersion",
  "privacyScope",
  "structuralArchetypeId",
  "documentKind",
  "sourceQualityBucket",
  "routeMode",
  "localOutcome",
  "localConfidence",
  "abstentionReason",
  "aiFallbackUsed",
  "aiFallbackReason",
  "aiUsageBucket",
  "localDurationBucket",
  "humanReviewStatus",
  "localVsHuman",
  "aiVsHuman",
  "localVsAi",
  "math",
  "criticalFlags",
  "learningHints",
]);
const FIELD_COMPARISON_KEYS = new Set(["field", "verdict"]);
const MATH_KEYS = new Set(["check", "verdict", "residual"]);

export function normalizeExpenseLearningHintsV1(
  value: unknown,
): ExpenseLearningHintsV1 | null {
  const input = strictRecord(value, HINT_KEYS);
  if (!input || input.schemaVersion !== EXPENSE_LEARNING_HINTS_SCHEMA_VERSION) {
    return null;
  }
  const layout = strictRecord(input.layout, LAYOUT_KEYS);
  if (!layout) return null;
  const pageMode = enumValue(layout.pageMode, PAGE_MODES);
  const readingOrder = enumValue(layout.readingOrder, READING_ORDERS);
  const regionOrder = enumArray(layout.regionOrder, REGIONS, 8, false);
  const tableCount = enumValue(layout.tableCount, TABLE_COUNTS);
  if (!pageMode || !readingOrder || !regionOrder || !tableCount) return null;

  const columns = objectArray(input.columns, 24, (entry) => {
    const column = strictRecord(entry, COLUMN_KEYS);
    if (!column) return null;
    const tableRole = enumValue(column.tableRole, TABLE_ROLES);
    const role = enumValue(column.role, COLUMN_ROLES);
    const normalizedLabel = enumValue(column.normalizedLabel, COLUMN_ROLES);
    const unit = enumValue(column.unit, LEARNING_UNITS);
    const sign = enumValue(column.sign, SIGN_CONVENTIONS);
    const confidence = enumValue(column.confidence, CONFIDENCE_BUCKETS);
    if (
      !tableRole ||
      !role ||
      !normalizedLabel ||
      !unit ||
      !sign ||
      !confidence ||
      !boundedInteger(column.index, 0, 23)
    ) {
      return null;
    }
    return Object.freeze({
      tableRole,
      index: column.index,
      role,
      normalizedLabel,
      unit,
      sign,
      confidence,
    });
  });
  const labels = objectArray(input.labels, 16, (entry) => {
    const label = strictRecord(entry, LABEL_KEYS);
    if (!label) return null;
    const role = enumValue(label.role, LABEL_ROLES);
    const region = enumValue(label.region, REGIONS);
    const confidence = enumValue(label.confidence, CONFIDENCE_BUCKETS);
    if (!role || !region || !confidence) return null;
    return Object.freeze({ role, region, confidence });
  });
  const formulas = objectArray(input.formulas, 16, (entry) => {
    const formula = strictRecord(entry, FORMULA_KEYS);
    if (!formula) return null;
    const rounding = strictRecord(formula.rounding, ROUNDING_KEYS);
    const scope = enumValue(formula.scope, FORMULA_SCOPES);
    const kind = enumValue(formula.kind, FORMULA_KINDS);
    const sign = enumValue(formula.sign, SIGN_CONVENTIONS);
    const confidence = enumValue(formula.confidence, CONFIDENCE_BUCKETS);
    const mode = rounding && enumValue(rounding.mode, ROUNDING_MODES);
    if (
      !rounding ||
      !scope ||
      !kind ||
      !sign ||
      !confidence ||
      !mode ||
      !boundedInteger(rounding.scale, 0, 4)
    ) {
      return null;
    }
    return Object.freeze({
      scope,
      kind,
      rounding: Object.freeze({ mode, scale: rounding.scale }),
      sign,
      confidence,
    });
  });
  if (!columns || !labels || !formulas) return null;

  return Object.freeze({
    schemaVersion: EXPENSE_LEARNING_HINTS_SCHEMA_VERSION,
    layout: Object.freeze({
      pageMode,
      readingOrder,
      regionOrder: Object.freeze(regionOrder),
      tableCount,
    }),
    columns: Object.freeze(columns),
    labels: Object.freeze(labels),
    formulas: Object.freeze(formulas),
  });
}

export function normalizeExpenseEngineObservationV1(
  value: unknown,
): ExpenseEngineObservationV1 | null {
  const input = strictRecord(value, OBSERVATION_KEYS);
  if (
    !input ||
    input.schemaVersion !== EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION ||
    input.engineVersion !== EXPENSE_ENGINE_VERSION ||
    input.policyVersion !== EXPENSE_ENGINE_PRIVACY_POLICY_VERSION ||
    input.privacyScope !== EXPENSE_ENGINE_PRIVACY_SCOPE ||
    typeof input.aiFallbackUsed !== "boolean"
  ) {
    return null;
  }

  const structuralArchetypeId = enumValue(
    input.structuralArchetypeId,
    STRUCTURAL_ARCHETYPES,
  );
  const documentKind = enumValue(input.documentKind, DOCUMENT_KINDS);
  const sourceQualityBucket = enumValue(
    input.sourceQualityBucket,
    SOURCE_QUALITY_BUCKETS,
  );
  const routeMode = enumValue(input.routeMode, ROUTE_MODES);
  const localOutcome = enumValue(input.localOutcome, LOCAL_OUTCOMES);
  const localConfidence = enumValue(input.localConfidence, CONFIDENCE_BUCKETS);
  const abstentionReason = nullableEnum(
    input.abstentionReason,
    ABSTENTION_REASONS,
  );
  const aiFallbackReason = nullableEnum(
    input.aiFallbackReason,
    ABSTENTION_REASONS,
  );
  const aiUsageBucket = enumValue(input.aiUsageBucket, AI_USAGE_BUCKETS);
  const localDurationBucket = enumValue(
    input.localDurationBucket,
    DURATION_BUCKETS,
  );
  const humanReviewStatus = enumValue(input.humanReviewStatus, REVIEW_STATUSES);
  if (
    !structuralArchetypeId ||
    !documentKind ||
    !sourceQualityBucket ||
    !routeMode ||
    !localOutcome ||
    !localConfidence ||
    abstentionReason === undefined ||
    aiFallbackReason === undefined ||
    !aiUsageBucket ||
    !localDurationBucket ||
    !humanReviewStatus
  ) {
    return null;
  }
  if (
    (localOutcome === "CANDIDATE" && abstentionReason !== null) ||
    (localOutcome !== "CANDIDATE" && abstentionReason === null) ||
    (input.aiFallbackUsed && aiFallbackReason === null) ||
    (!input.aiFallbackUsed && aiFallbackReason !== null)
  ) {
    return null;
  }

  const localVsHuman = normalizeFieldComparisons(input.localVsHuman);
  const aiVsHuman = normalizeFieldComparisons(input.aiVsHuman);
  const localVsAi = normalizeFieldComparisons(input.localVsAi);
  const math = objectArray(input.math, EXPENSE_MATH_CHECKS.length, (entry) => {
    const check = strictRecord(entry, MATH_KEYS);
    if (!check) return null;
    const key = enumValue(check.check, EXPENSE_MATH_CHECKS);
    const verdict = enumValue(check.verdict, EXPENSE_MATH_VERDICTS);
    const residual = enumValue(check.residual, EXPENSE_MATH_RESIDUAL_BUCKETS);
    if (!key || !verdict || !residual) return null;
    return Object.freeze({ check: key, verdict, residual });
  });
  const criticalFlags = enumArray(input.criticalFlags, CRITICAL_FLAGS, 4, true);
  const learningHints =
    input.learningHints === null
      ? null
      : normalizeExpenseLearningHintsV1(input.learningHints);
  if (
    !localVsHuman ||
    !aiVsHuman ||
    !localVsAi ||
    !math ||
    !criticalFlags ||
    (input.learningHints !== null && learningHints === null)
  ) {
    return null;
  }

  return Object.freeze({
    schemaVersion: EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
    engineVersion: EXPENSE_ENGINE_VERSION,
    policyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    privacyScope: EXPENSE_ENGINE_PRIVACY_SCOPE,
    structuralArchetypeId,
    documentKind,
    sourceQualityBucket,
    routeMode,
    localOutcome,
    localConfidence,
    abstentionReason,
    aiFallbackUsed: input.aiFallbackUsed,
    aiFallbackReason,
    aiUsageBucket,
    localDurationBucket,
    humanReviewStatus,
    localVsHuman: Object.freeze(localVsHuman),
    aiVsHuman: Object.freeze(aiVsHuman),
    localVsAi: Object.freeze(localVsAi),
    math: Object.freeze(math),
    criticalFlags: Object.freeze(criticalFlags),
    learningHints,
  });
}

export function expenseLearningStructureKeyV1(
  hints: ExpenseLearningHintsV1,
): string {
  return [
    hints.layout.pageMode,
    hints.layout.readingOrder,
    hints.layout.tableCount,
    hints.columns
      .map((column) => `${column.tableRole}:${column.index}:${column.role}`)
      .join(","),
    hints.formulas
      .map((formula) => `${formula.scope}:${formula.kind}`)
      .join(","),
  ].join("|");
}

function normalizeFieldComparisons(
  value: unknown,
): Readonly<ExpenseEngineFieldComparisonV1>[] | null {
  const comparisons = objectArray(value, FIELD_KEYS.length, (entry) => {
    const comparison = strictRecord(entry, FIELD_COMPARISON_KEYS);
    if (!comparison) return null;
    const field = enumValue(comparison.field, FIELD_KEYS);
    const verdict = enumValue(comparison.verdict, FIELD_VERDICTS);
    if (!field || !verdict) return null;
    return Object.freeze({ field, verdict });
  });
  if (!comparisons) return null;
  const uniqueFields = new Set(comparisons.map((entry) => entry.field));
  return uniqueFields.size === comparisons.length ? comparisons : null;
}

function strictRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string" || !allowedKeys.has(key))) {
    return null;
  }
  const output: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return null;
    output[String(key)] = descriptor.value;
  }
  return output;
}

function objectArray<T>(
  value: unknown,
  max: number,
  normalize: (entry: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const output: T[] = [];
  for (const entry of value) {
    const normalized = normalize(entry);
    if (normalized === null) return null;
    output.push(normalized);
  }
  return output;
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | null {
  return typeof value === "string" && allowed.includes(value as T[number])
    ? (value as T[number])
    : null;
}

function nullableEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | null | undefined {
  if (value === null) return null;
  return enumValue(value, allowed) ?? undefined;
}

function enumArray<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  max: number,
  unique: boolean,
): T[number][] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const output: T[number][] = [];
  for (const entry of value) {
    const normalized = enumValue(entry, allowed);
    if (!normalized) return null;
    output.push(normalized);
  }
  return !unique || new Set(output).size === output.length ? output : null;
}

function boundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    Number.isSafeInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}
