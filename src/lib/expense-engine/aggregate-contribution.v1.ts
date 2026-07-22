import {
  EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
  EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  EXPENSE_ENGINE_VERSION,
  EXPENSE_MATH_CHECKS,
  EXPENSE_MATH_RESIDUAL_BUCKETS,
  EXPENSE_MATH_VERDICTS,
  normalizeExpenseEngineObservationV1,
  type ExpenseEngineObservationV1,
  type ExpenseEngineStructuralArchetypeV1,
} from "./contracts";

export const EXPENSE_AGGREGATE_CONTRIBUTION_SCHEMA_VERSION_V1 =
  "expense-engine-aggregate-contribution.v1" as const;
export const EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1 = 67;
export const EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1 = 16 * 1024;

const STRUCTURAL_ARCHETYPE_GROUPS = [
  "TABLE",
  "SUMMARY",
  "OTHER",
  "UNKNOWN",
] as const;
const METRIC_FAMILIES = [
  "SOURCE_QUALITY",
  "ROUTE_MODE",
  "LOCAL_OUTCOME",
  "LOCAL_CONFIDENCE",
  "ABSTENTION_REASON",
  "AI_FALLBACK_REASON",
  "AI_USAGE",
  "LOCAL_DURATION",
  "HUMAN_REVIEW",
  "FIELD_VERDICT",
  "MATH_VERDICT",
  "MATH_RESIDUAL",
  "CRITICAL_FLAG",
] as const;
const FIELD_COMPARISON_SCOPES = [
  "LOCAL_VS_HUMAN",
  "AI_VS_HUMAN",
  "LOCAL_VS_AI",
] as const;
const COMPARISON_SCOPES = ["NONE", ...FIELD_COMPARISON_SCOPES] as const;
const SOURCE_QUALITY_VALUES = ["HIGH", "MEDIUM", "LOW", "UNREADABLE"] as const;
const ROUTE_MODE_VALUES = [
  "SHADOW_AI",
  "LOCAL_ONLY",
  "AI_FALLBACK",
  "HUMAN_REVIEW",
] as const;
const LOCAL_OUTCOME_VALUES = ["CANDIDATE", "ABSTAINED", "FAILED"] as const;
const CONFIDENCE_VALUES = ["LOW", "MEDIUM", "HIGH"] as const;
const ABSTENTION_VALUES = [
  "NONE",
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
const AI_USAGE_VALUES = ["NONE", "ONE", "MULTIPLE", "UNKNOWN"] as const;
const DURATION_VALUES = [
  "LT_250_MS",
  "LT_1_S",
  "LT_5_S",
  "GTE_5_S",
  "UNKNOWN",
] as const;
const REVIEW_VALUES = [
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
const FIELD_VERDICT_VALUES = [
  "MATCH",
  "CORRECTED",
  "MISSING",
  "EXTRA",
  "ABSTAINED",
] as const;
const CRITICAL_FLAGS = [
  "EXPENSE_ACCEPTED_THEN_REJECTED",
  "TAX_TREATMENT_CORRECTED",
  "CREDIT_SIGN_CORRECTED",
  "DUPLICATE_ACCEPTED",
] as const;
const SINGLETON_FAMILIES = [
  "SOURCE_QUALITY",
  "ROUTE_MODE",
  "LOCAL_OUTCOME",
  "LOCAL_CONFIDENCE",
  "ABSTENTION_REASON",
  "AI_FALLBACK_REASON",
  "AI_USAGE",
  "LOCAL_DURATION",
  "HUMAN_REVIEW",
] as const;

export type ExpenseStructuralArchetypeGroupV1 =
  (typeof STRUCTURAL_ARCHETYPE_GROUPS)[number];
export type ExpenseAggregateMetricFamilyV1 = (typeof METRIC_FAMILIES)[number];
export type ExpenseAggregateComparisonScopeV1 =
  (typeof COMPARISON_SCOPES)[number];
type ExpenseAggregateMetricKeyV1 =
  | "VALUE"
  | (typeof FIELD_KEYS)[number]
  | (typeof EXPENSE_MATH_CHECKS)[number]
  | (typeof CRITICAL_FLAGS)[number];
type ExpenseAggregateMetricValueV1 =
  | (typeof SOURCE_QUALITY_VALUES)[number]
  | (typeof ROUTE_MODE_VALUES)[number]
  | (typeof LOCAL_OUTCOME_VALUES)[number]
  | (typeof CONFIDENCE_VALUES)[number]
  | (typeof ABSTENTION_VALUES)[number]
  | (typeof AI_USAGE_VALUES)[number]
  | (typeof DURATION_VALUES)[number]
  | (typeof REVIEW_VALUES)[number]
  | (typeof FIELD_VERDICT_VALUES)[number]
  | (typeof EXPENSE_MATH_VERDICTS)[number]
  | (typeof EXPENSE_MATH_RESIDUAL_BUCKETS)[number]
  | "PRESENT"
  | "NOT_OBSERVED";

export interface ExpenseAggregateMetricV1 {
  readonly family: ExpenseAggregateMetricFamilyV1;
  readonly comparisonScope: ExpenseAggregateComparisonScopeV1;
  readonly key: ExpenseAggregateMetricKeyV1;
  readonly value: ExpenseAggregateMetricValueV1;
}

export interface ExpenseAggregateContributionV1 {
  readonly schemaVersion: typeof EXPENSE_AGGREGATE_CONTRIBUTION_SCHEMA_VERSION_V1;
  readonly observationSchemaVersion: typeof EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION;
  readonly engineVersion: typeof EXPENSE_ENGINE_VERSION;
  readonly privacyPolicyVersion: typeof EXPENSE_ENGINE_PRIVACY_POLICY_VERSION;
  readonly structuralArchetypeGroup: ExpenseStructuralArchetypeGroupV1;
  readonly metrics: readonly Readonly<ExpenseAggregateMetricV1>[];
  readonly learningHints: null;
}

const CANONICAL_COORDINATE_REGISTRY_V1 = {
  singletonFamilies: SINGLETON_FAMILIES,
  fieldComparisonScopes: FIELD_COMPARISON_SCOPES,
  fieldKeys: FIELD_KEYS,
  mathChecks: EXPENSE_MATH_CHECKS,
  criticalFlags: CRITICAL_FLAGS,
} as const;

const CONTRIBUTION_KEYS = [
  "schemaVersion",
  "observationSchemaVersion",
  "engineVersion",
  "privacyPolicyVersion",
  "structuralArchetypeGroup",
  "metrics",
  "learningHints",
] as const;
const METRIC_KEYS = ["family", "comparisonScope", "key", "value"] as const;

export function getExpenseAggregateCanonicalCoordinatesV1() {
  return Object.freeze(buildCanonicalCoordinates());
}

export function getExpenseAggregateCanonicalCardinalitiesV1() {
  return Object.freeze({
    singleton: SINGLETON_FAMILIES.length,
    fieldVerdict: FIELD_COMPARISON_SCOPES.length * FIELD_KEYS.length,
    math: EXPENSE_MATH_CHECKS.length * 2,
    criticalFlag: CRITICAL_FLAGS.length,
    total: EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
  });
}

export function isExpenseAggregateContributionBodySizeAllowedV1(
  byteLength: unknown,
): boolean {
  return (
    Number.isSafeInteger(byteLength) &&
    Number(byteLength) >= 0 &&
    Number(byteLength) <= EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1
  );
}

export function createExpenseAggregateContributionV1(
  value: unknown,
): ExpenseAggregateContributionV1 | null {
  const observation = normalizeExpenseEngineObservationV1(value);
  if (
    !observation ||
    observation.learningHints !== null ||
    observation.criticalFlags.includes("CREDIT_SIGN_CORRECTED")
  ) {
    return null;
  }

  return normalizeExpenseAggregateContributionV1({
    schemaVersion: EXPENSE_AGGREGATE_CONTRIBUTION_SCHEMA_VERSION_V1,
    observationSchemaVersion: EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
    engineVersion: EXPENSE_ENGINE_VERSION,
    privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    structuralArchetypeGroup: structuralGroup(
      observation.structuralArchetypeId,
    ),
    metrics: metricsFromObservation(observation),
    learningHints: null,
  });
}

export function normalizeExpenseAggregateContributionV1(
  value: unknown,
): ExpenseAggregateContributionV1 | null {
  const input = strictRecord(value, CONTRIBUTION_KEYS);
  if (
    !input ||
    input.schemaVersion !== EXPENSE_AGGREGATE_CONTRIBUTION_SCHEMA_VERSION_V1 ||
    input.observationSchemaVersion !==
      EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION ||
    input.engineVersion !== EXPENSE_ENGINE_VERSION ||
    input.privacyPolicyVersion !== EXPENSE_ENGINE_PRIVACY_POLICY_VERSION ||
    input.learningHints !== null
  ) {
    return null;
  }

  const structuralArchetypeGroup = enumValue(
    input.structuralArchetypeGroup,
    STRUCTURAL_ARCHETYPE_GROUPS,
  );
  const metrics = strictArray(
    input.metrics,
    EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
    normalizeMetric,
  );
  if (!structuralArchetypeGroup || !metrics) {
    return null;
  }

  const canonicalMetrics = normalizeCanonicalMetricOrder(metrics);
  if (!canonicalMetrics || !metricsAreCoherent(canonicalMetrics)) return null;

  return Object.freeze({
    schemaVersion: EXPENSE_AGGREGATE_CONTRIBUTION_SCHEMA_VERSION_V1,
    observationSchemaVersion: EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
    engineVersion: EXPENSE_ENGINE_VERSION,
    privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    structuralArchetypeGroup,
    metrics: Object.freeze(canonicalMetrics),
    learningHints: null,
  });
}

function structuralGroup(
  archetype: ExpenseEngineStructuralArchetypeV1,
): ExpenseStructuralArchetypeGroupV1 {
  switch (archetype) {
    case "LINE_TABLE":
    case "DIMENSION_TABLE":
    case "MIXED_TAX_TABLE":
      return "TABLE";
    case "SUMMARY_ONLY":
    case "RECURRING_RECEIPT":
    case "QUICK_TICKET":
      return "SUMMARY";
    case "CREDIT_NOTE":
    case "NON_EXPENSE":
      return "OTHER";
    case "UNKNOWN":
      return "UNKNOWN";
  }
}

function metricsFromObservation(
  observation: ExpenseEngineObservationV1,
): ExpenseAggregateMetricV1[] {
  const metrics: ExpenseAggregateMetricV1[] = [
    singleton("SOURCE_QUALITY", observation.sourceQualityBucket),
    singleton("ROUTE_MODE", observation.routeMode),
    singleton("LOCAL_OUTCOME", observation.localOutcome),
    singleton("LOCAL_CONFIDENCE", observation.localConfidence),
    singleton("ABSTENTION_REASON", observation.abstentionReason ?? "NONE"),
    singleton("AI_FALLBACK_REASON", observation.aiFallbackReason ?? "NONE"),
    singleton("AI_USAGE", observation.aiUsageBucket),
    singleton("LOCAL_DURATION", observation.localDurationBucket),
    singleton("HUMAN_REVIEW", observation.humanReviewStatus),
  ];

  for (const [comparisonScope, comparisons] of [
    ["LOCAL_VS_HUMAN", observation.localVsHuman],
    ["AI_VS_HUMAN", observation.aiVsHuman],
    ["LOCAL_VS_AI", observation.localVsAi],
  ] as const) {
    for (const field of FIELD_KEYS) {
      const comparison = comparisons.find((entry) => entry.field === field);
      metrics.push({
        family: "FIELD_VERDICT",
        comparisonScope,
        key: field,
        value: comparison?.verdict ?? "ABSTAINED",
      });
    }
  }

  for (const checkKey of EXPENSE_MATH_CHECKS) {
    const check = observation.math.find((entry) => entry.check === checkKey);
    metrics.push({
      family: "MATH_VERDICT",
      comparisonScope: "NONE",
      key: checkKey,
      value: check?.verdict ?? "INSUFFICIENT",
    });
    metrics.push({
      family: "MATH_RESIDUAL",
      comparisonScope: "NONE",
      key: checkKey,
      value: check?.residual ?? "UNKNOWN",
    });
  }

  for (const flag of CRITICAL_FLAGS) {
    const isPresent =
      flag === "CREDIT_SIGN_CORRECTED"
        ? false
        : flag === "DUPLICATE_ACCEPTED"
          ? observation.criticalFlags.includes(flag)
          : derivedCriticalFlagIsPresent(metrics, flag);
    metrics.push({
      family: "CRITICAL_FLAG",
      comparisonScope: "NONE",
      key: flag,
      value: isPresent ? "PRESENT" : "NOT_OBSERVED",
    });
  }
  return metrics;
}

function singleton(
  family: (typeof SINGLETON_FAMILIES)[number],
  value: ExpenseAggregateMetricValueV1,
): ExpenseAggregateMetricV1 {
  return { family, comparisonScope: "NONE", key: "VALUE", value };
}

function normalizeMetric(value: unknown): ExpenseAggregateMetricV1 | null {
  const input = strictRecord(value, METRIC_KEYS);
  if (!input) return null;
  const family = enumValue(input.family, METRIC_FAMILIES);
  const comparisonScope = enumValue(input.comparisonScope, COMPARISON_SCOPES);
  if (!family || !comparisonScope) return null;

  const key = input.key;
  const metricValue = input.value;
  if (typeof key !== "string" || typeof metricValue !== "string") return null;

  const valid = metricMatchesRule(family, comparisonScope, key, metricValue);
  return valid
    ? Object.freeze({
        family,
        comparisonScope,
        key: key as ExpenseAggregateMetricKeyV1,
        value: metricValue as ExpenseAggregateMetricValueV1,
      })
    : null;
}

function metricMatchesRule(
  family: ExpenseAggregateMetricFamilyV1,
  comparisonScope: ExpenseAggregateComparisonScopeV1,
  key: string,
  value: string,
): boolean {
  if (family === "FIELD_VERDICT") {
    return (
      comparisonScope !== "NONE" &&
      includes(FIELD_KEYS, key) &&
      includes(FIELD_VERDICT_VALUES, value)
    );
  }
  if (family === "MATH_VERDICT") {
    return (
      comparisonScope === "NONE" &&
      includes(EXPENSE_MATH_CHECKS, key) &&
      includes(EXPENSE_MATH_VERDICTS, value)
    );
  }
  if (family === "MATH_RESIDUAL") {
    return (
      comparisonScope === "NONE" &&
      isMathCheck(key) &&
      includes(EXPENSE_MATH_RESIDUAL_BUCKETS, value)
    );
  }
  if (family === "CRITICAL_FLAG") {
    return (
      comparisonScope === "NONE" &&
      includes(CRITICAL_FLAGS, key) &&
      (value === "PRESENT" || value === "NOT_OBSERVED")
    );
  }
  if (comparisonScope !== "NONE" || key !== "VALUE") return false;

  switch (family) {
    case "SOURCE_QUALITY":
      return includes(SOURCE_QUALITY_VALUES, value);
    case "ROUTE_MODE":
      return includes(ROUTE_MODE_VALUES, value);
    case "LOCAL_OUTCOME":
      return includes(LOCAL_OUTCOME_VALUES, value);
    case "LOCAL_CONFIDENCE":
      return includes(CONFIDENCE_VALUES, value);
    case "ABSTENTION_REASON":
    case "AI_FALLBACK_REASON":
      return includes(ABSTENTION_VALUES, value);
    case "AI_USAGE":
      return includes(AI_USAGE_VALUES, value);
    case "LOCAL_DURATION":
      return includes(DURATION_VALUES, value);
    case "HUMAN_REVIEW":
      return includes(REVIEW_VALUES, value);
    default:
      return false;
  }
}

function isMathCheck(value: string): boolean {
  return includes(EXPENSE_MATH_CHECKS, value);
}

function metricsAreCoherent(
  metrics: readonly ExpenseAggregateMetricV1[],
): boolean {
  const localOutcome = singletonValue(metrics, "LOCAL_OUTCOME");
  const abstentionReason = singletonValue(metrics, "ABSTENTION_REASON");
  const routeMode = singletonValue(metrics, "ROUTE_MODE");
  const aiFallbackReason = singletonValue(metrics, "AI_FALLBACK_REASON");
  const aiUsage = singletonValue(metrics, "AI_USAGE");
  const sourceQuality = singletonValue(metrics, "SOURCE_QUALITY");
  const localConfidence = singletonValue(metrics, "LOCAL_CONFIDENCE");
  const humanReview = singletonValue(metrics, "HUMAN_REVIEW");
  if (
    (localOutcome === "CANDIDATE" && abstentionReason !== "NONE") ||
    (localOutcome !== "CANDIDATE" && abstentionReason === "NONE")
  ) {
    return false;
  }

  if (
    !routeAndAiAreCoherent({
      routeMode,
      localOutcome,
      abstentionReason,
      aiFallbackReason,
      aiUsage,
    }) ||
    !qualityAndOutcomeAreCoherent({
      sourceQuality,
      localConfidence,
      localOutcome,
      abstentionReason,
    }) ||
    !fieldVerdictsAreCoherent(metrics, localOutcome, aiUsage, humanReview) ||
    !mathMetricsAreCoherent(metrics, localOutcome) ||
    !criticalFlagsAreCoherent(metrics)
  ) {
    return false;
  }

  return true;
}

function singletonValue(
  metrics: readonly ExpenseAggregateMetricV1[],
  family: (typeof SINGLETON_FAMILIES)[number],
): ExpenseAggregateMetricValueV1 | undefined {
  return metrics.find((metric) => metric.family === family)?.value;
}

function buildCanonicalCoordinates(): readonly Readonly<
  Pick<ExpenseAggregateMetricV1, "family" | "comparisonScope" | "key">
>[] {
  const coordinates: Array<
    Readonly<
      Pick<ExpenseAggregateMetricV1, "family" | "comparisonScope" | "key">
    >
  > = [];
  for (const family of CANONICAL_COORDINATE_REGISTRY_V1.singletonFamilies) {
    coordinates.push(coordinate(family, "NONE", "VALUE"));
  }
  for (const comparisonScope of CANONICAL_COORDINATE_REGISTRY_V1.fieldComparisonScopes) {
    for (const key of CANONICAL_COORDINATE_REGISTRY_V1.fieldKeys) {
      coordinates.push(coordinate("FIELD_VERDICT", comparisonScope, key));
    }
  }
  for (const key of CANONICAL_COORDINATE_REGISTRY_V1.mathChecks) {
    coordinates.push(coordinate("MATH_VERDICT", "NONE", key));
    coordinates.push(coordinate("MATH_RESIDUAL", "NONE", key));
  }
  for (const key of CANONICAL_COORDINATE_REGISTRY_V1.criticalFlags) {
    coordinates.push(coordinate("CRITICAL_FLAG", "NONE", key));
  }
  return coordinates;
}

function coordinate(
  family: ExpenseAggregateMetricFamilyV1,
  comparisonScope: ExpenseAggregateComparisonScopeV1,
  key: ExpenseAggregateMetricKeyV1,
) {
  return Object.freeze({ family, comparisonScope, key });
}

function normalizeCanonicalMetricOrder(
  metrics: readonly ExpenseAggregateMetricV1[],
): ExpenseAggregateMetricV1[] | null {
  const canonicalCoordinates = buildCanonicalCoordinates();
  if (metrics.length !== canonicalCoordinates.length) {
    return null;
  }
  const indexed = new Map<string, ExpenseAggregateMetricV1>();
  for (const metric of metrics) {
    const key = metricCoordinateKey(metric);
    if (indexed.has(key)) return null;
    indexed.set(key, metric);
  }
  const ordered: ExpenseAggregateMetricV1[] = [];
  for (const expected of canonicalCoordinates) {
    const metric = indexed.get(metricCoordinateKey(expected));
    if (!metric) return null;
    ordered.push(metric);
  }
  return ordered;
}

function metricCoordinateKey(
  metric: Pick<ExpenseAggregateMetricV1, "family" | "comparisonScope" | "key">,
): string {
  return `${metric.family}:${metric.comparisonScope}:${metric.key}`;
}

function routeAndAiAreCoherent(input: {
  routeMode: ExpenseAggregateMetricValueV1 | undefined;
  localOutcome: ExpenseAggregateMetricValueV1 | undefined;
  abstentionReason: ExpenseAggregateMetricValueV1 | undefined;
  aiFallbackReason: ExpenseAggregateMetricValueV1 | undefined;
  aiUsage: ExpenseAggregateMetricValueV1 | undefined;
}): boolean {
  const {
    routeMode,
    localOutcome,
    abstentionReason,
    aiFallbackReason,
    aiUsage,
  } = input;
  if (routeMode === "SHADOW_AI") {
    return (
      aiUsage === "ONE" &&
      (localOutcome === "CANDIDATE"
        ? aiFallbackReason === "NONE"
        : aiFallbackReason === abstentionReason)
    );
  }
  if (routeMode === "AI_FALLBACK") {
    return (
      aiUsage === "ONE" &&
      localOutcome !== "CANDIDATE" &&
      aiFallbackReason !== "NONE" &&
      aiFallbackReason === abstentionReason
    );
  }
  if (routeMode === "LOCAL_ONLY" || routeMode === "HUMAN_REVIEW") {
    return aiUsage === "NONE" && aiFallbackReason === "NONE";
  }
  return false;
}

function qualityAndOutcomeAreCoherent(input: {
  sourceQuality: ExpenseAggregateMetricValueV1 | undefined;
  localConfidence: ExpenseAggregateMetricValueV1 | undefined;
  localOutcome: ExpenseAggregateMetricValueV1 | undefined;
  abstentionReason: ExpenseAggregateMetricValueV1 | undefined;
}): boolean {
  const { sourceQuality, localConfidence, localOutcome, abstentionReason } =
    input;
  if (
    localOutcome === "FAILED" &&
    (sourceQuality !== "UNREADABLE" || localConfidence !== "LOW")
  ) {
    return false;
  }
  if (
    sourceQuality === "UNREADABLE" &&
    (localOutcome === "CANDIDATE" || localConfidence !== "LOW")
  ) {
    return false;
  }
  if (
    localOutcome === "CANDIDATE" &&
    (sourceQuality === "UNREADABLE" || localConfidence === "LOW")
  ) {
    return false;
  }
  return abstentionReason !== "LOW_CONFIDENCE" || localConfidence === "LOW";
}

const ALLOWED_FIELD_VERDICT_TRIPLES = [
  "ABSTAINED:ABSTAINED:ABSTAINED",
  "ABSTAINED:ABSTAINED:MISSING",
  "ABSTAINED:ABSTAINED:MATCH",
  "ABSTAINED:ABSTAINED:CORRECTED",
  "ABSTAINED:EXTRA:MISSING",
  "EXTRA:ABSTAINED:EXTRA",
  "EXTRA:EXTRA:MATCH",
  "EXTRA:EXTRA:CORRECTED",
  "MISSING:MISSING:ABSTAINED",
  "MISSING:MATCH:MISSING",
  "MISSING:CORRECTED:MISSING",
  "MATCH:MISSING:ABSTAINED",
  "CORRECTED:MISSING:ABSTAINED",
  "MATCH:MISSING:EXTRA",
  "CORRECTED:MISSING:EXTRA",
  "MATCH:MATCH:MATCH",
  "MATCH:CORRECTED:CORRECTED",
  "CORRECTED:MATCH:CORRECTED",
  "CORRECTED:CORRECTED:MATCH",
  "CORRECTED:CORRECTED:CORRECTED",
] as const;

function fieldVerdictsAreCoherent(
  metrics: readonly ExpenseAggregateMetricV1[],
  localOutcome: ExpenseAggregateMetricValueV1 | undefined,
  aiUsage: ExpenseAggregateMetricValueV1 | undefined,
  humanReview: ExpenseAggregateMetricValueV1 | undefined,
): boolean {
  if (humanReview === "NOT_REVIEWED") return false;
  const aiVsHumanValues: ExpenseAggregateMetricValueV1[] = [];
  for (const field of FIELD_KEYS) {
    const localVsHuman = metricValue(
      metrics,
      "FIELD_VERDICT",
      "LOCAL_VS_HUMAN",
      field,
    );
    const aiVsHuman = metricValue(
      metrics,
      "FIELD_VERDICT",
      "AI_VS_HUMAN",
      field,
    );
    const localVsAi = metricValue(
      metrics,
      "FIELD_VERDICT",
      "LOCAL_VS_AI",
      field,
    );
    if (
      !includes(
        ALLOWED_FIELD_VERDICT_TRIPLES,
        `${localVsHuman}:${aiVsHuman}:${localVsAi}`,
      )
    ) {
      return false;
    }
    aiVsHumanValues.push(aiVsHuman);
    if (
      localOutcome !== "CANDIDATE" &&
      (localVsHuman === "MATCH" ||
        localVsHuman === "CORRECTED" ||
        localVsHuman === "EXTRA" ||
        localVsAi === "MATCH" ||
        localVsAi === "CORRECTED" ||
        localVsAi === "EXTRA")
    ) {
      return false;
    }
    if (
      aiUsage === "NONE" &&
      (aiVsHuman === "MATCH" ||
        aiVsHuman === "CORRECTED" ||
        aiVsHuman === "EXTRA" ||
        (localVsAi !== "ABSTAINED" && localVsAi !== "EXTRA"))
    ) {
      return false;
    }
  }

  const aiWasCorrected = aiVsHumanValues.some(
    (value) =>
      value === "CORRECTED" || value === "MISSING" || value === "EXTRA",
  );
  if (humanReview === "CONFIRMED" && aiWasCorrected) return false;
  if (humanReview === "CORRECTED" && !aiWasCorrected) return false;
  return aiVsHumanValues.some((value) => value !== "ABSTAINED");
}

function mathMetricsAreCoherent(
  metrics: readonly ExpenseAggregateMetricV1[],
  localOutcome: ExpenseAggregateMetricValueV1 | undefined,
): boolean {
  for (const check of EXPENSE_MATH_CHECKS) {
    const verdict = metricValue(metrics, "MATH_VERDICT", "NONE", check);
    const residual = metricValue(metrics, "MATH_RESIDUAL", "NONE", check);
    if (
      (verdict === "INSUFFICIENT" && residual !== "UNKNOWN") ||
      (verdict !== "INSUFFICIENT" && residual === "UNKNOWN") ||
      (verdict === "MATCH" && residual === "MATERIAL") ||
      (verdict === "MISMATCH" &&
        residual !== "ROUNDING_TOLERANCE" &&
        residual !== "MATERIAL") ||
      (localOutcome === "CANDIDATE" && verdict === "MISMATCH") ||
      (localOutcome === "FAILED" &&
        (verdict !== "INSUFFICIENT" || residual !== "UNKNOWN"))
    ) {
      return false;
    }
  }
  return true;
}

function criticalFlagsAreCoherent(
  metrics: readonly ExpenseAggregateMetricV1[],
): boolean {
  for (const flag of [
    "EXPENSE_ACCEPTED_THEN_REJECTED",
    "TAX_TREATMENT_CORRECTED",
  ] as const) {
    if (
      criticalFlagIsPresent(metrics, flag) !==
      derivedCriticalFlagIsPresent(metrics, flag)
    ) {
      return false;
    }
  }
  if (criticalFlagIsPresent(metrics, "CREDIT_SIGN_CORRECTED")) {
    return false;
  }
  return true;
}

function derivedCriticalFlagIsPresent(
  metrics: readonly ExpenseAggregateMetricV1[],
  key: Exclude<
    (typeof CRITICAL_FLAGS)[number],
    "CREDIT_SIGN_CORRECTED" | "DUPLICATE_ACCEPTED"
  >,
): boolean {
  if (key === "EXPENSE_ACCEPTED_THEN_REJECTED") {
    return singletonValue(metrics, "HUMAN_REVIEW") === "REJECTED";
  }
  if (key === "TAX_TREATMENT_CORRECTED") {
    return [
      "TAX_RATE",
      "TAX_BASE",
      "TAX_AMOUNT",
      "SURCHARGE_AMOUNT",
      "WITHHOLDING_AMOUNT",
    ].some((field) => {
      const value = metricValue(
        metrics,
        "FIELD_VERDICT",
        "AI_VS_HUMAN",
        field as ExpenseAggregateMetricKeyV1,
      );
      return value === "CORRECTED" || value === "MISSING" || value === "EXTRA";
    });
  }
  return false;
}

function criticalFlagIsPresent(
  metrics: readonly ExpenseAggregateMetricV1[],
  key: (typeof CRITICAL_FLAGS)[number],
): boolean {
  return metricValue(metrics, "CRITICAL_FLAG", "NONE", key) === "PRESENT";
}

function metricValue(
  metrics: readonly ExpenseAggregateMetricV1[],
  family: ExpenseAggregateMetricFamilyV1,
  comparisonScope: ExpenseAggregateComparisonScopeV1,
  key: ExpenseAggregateMetricKeyV1,
): ExpenseAggregateMetricValueV1 {
  const value = metrics.find(
    (metric) =>
      metric.family === family &&
      metric.comparisonScope === comparisonScope &&
      metric.key === key,
  )?.value;
  if (!value) throw new Error("Canonical expense metric is missing");
  return value;
}

function strictRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowedKeys.includes(key))
  ) {
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

function strictArray<T>(
  value: unknown,
  maxLength: number,
  normalize: (entry: unknown) => T | null,
): T[] | null {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length > maxLength
  ) {
    return null;
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some((key) => {
      if (key === "length") return false;
      if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        return true;
      }
      return Number(key) >= value.length;
    })
  ) {
    return null;
  }
  const output: T[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor)) return null;
    const normalized = normalize(descriptor.value);
    if (normalized === null) return null;
    output.push(normalized);
  }
  return output;
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | null {
  return typeof value === "string" && includes(allowed, value)
    ? (value as T[number])
    : null;
}

function includes(values: readonly string[], value: string): boolean {
  return values.includes(value);
}
