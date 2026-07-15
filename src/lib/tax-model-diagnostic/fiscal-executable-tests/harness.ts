import { buildTaxObligationsAssessment } from "@/lib/tax-obligations/build-assessment";
import {
  authorizeRuleExclusion,
  type ExclusionAuthorizationBlockingReason,
} from "@/lib/tax-obligations/rule-exclusion-authorization";

import type {
  ModelResultStatus,
  TaxModelNumber,
  TaxpayerProfile,
} from "../contracts";
import { evaluateTaxModelDiagnostic } from "../engine";
import {
  getTaxRule,
  taxRuleSetAuthorizationMetadata,
} from "../rules";
import { buildFiscalTestProfile } from "./profile-factories";
import {
  buildFiscalDecisionPredicateDefinition,
  evaluateFiscalDecisionPredicate,
  type FiscalDecisionPredicateDefinition,
  type FiscalDecisionPredicateFacts,
  type FiscalPredicateDecision,
  type FiscalPredicateFact,
} from "./decision-predicate";
import {
  FISCAL_EXECUTABLE_CATEGORIES,
  FISCAL_MODEL_EXECUTABLE_SPECS,
  FISCAL_SAFETY_CRITICAL_MUTATIONS,
  type FiscalExecutableCategory,
  type FiscalModelExecutableSpec,
  type FiscalMutationOperator,
  type FiscalScenarioTemplate,
  conditionModeForModel,
  expectedSubjectForModel,
  mutationOperatorsForSpec,
} from "./specs";

export const FISCAL_EXECUTABLE_TEST_GENERATED_AT =
  "2026-07-15T16:00:00.000Z" as const;

export const REQUIRED_PENDING_BLOCKING_REASONS = [
  "GLOBAL_RULESET_NOT_APPROVED",
  "GLOBAL_RULESET_NOT_RESOLVED",
  "RULE_NOT_APPROVED",
  "RULE_NOT_RESOLVED",
  "EXCLUSION_NOT_APPROVED",
  "EXCLUSION_NOT_RESOLVED",
  "TESTS_NOT_PASSING",
  "SOURCE_NOT_VERIFIED",
  "SOURCE_SNAPSHOT_HASH_MISSING",
  "EFFECTIVE_DATE_NOT_CONFIRMED",
  "PRIMARY_REVIEWER_MISSING",
  "SECOND_REVIEWER_MISSING",
  "APPROVED_RULE_HASH_MISSING",
  "APPROVED_RULE_HASH_MISMATCH",
  "APPROVAL_EVIDENCE_MISSING",
  "APPROVAL_EVIDENCE_NOT_VERIFIED",
  "OPEN_FISCAL_ISSUES",
  "EXCLUSION_EFFECT_NOT_EXECUTABLE",
  "INTERNAL_OVERRIDE_NOT_AUTHORIZED",
] as const satisfies readonly ExclusionAuthorizationBlockingReason[];

export interface FiscalRuleTestCase {
  testCaseId: string;
  caseId: string;
  ruleId: string;
  modelNumber: TaxModelNumber;
  fiscalYear: 2025 | 2026;
  territory: TaxpayerProfile["territory"];
  category: FiscalExecutableCategory;
  inputFacts: TaxpayerProfile;
  profile: TaxpayerProfile;
  expectedRecommendation: ModelResultStatus | null;
  expectedTargetStatus: ModelResultStatus | null;
  expectedReasonIncludes: string | null;
  expectedModels: readonly TaxModelNumber[];
  expectedImprobableModels: readonly TaxModelNumber[];
  forbiddenInferenceModels: readonly TaxModelNumber[];
  expectedExclusionCandidates: readonly string[];
  expectedAuthorizedExclusions: 0;
  expectedBlockingReasons: readonly ExclusionAuthorizationBlockingReason[];
  expectedExplanationCodes: readonly string[];
  sourceIds: readonly string[];
  tags: readonly string[];
  hasUnknownRequiredFacts: boolean;
  hasContradictoryFacts: boolean;
  predicateDefinition: FiscalDecisionPredicateDefinition;
  predicateFacts: FiscalDecisionPredicateFacts;
  expectedPredicateDecision: FiscalPredicateDecision;
}

export type FiscalExecutableCase = FiscalRuleTestCase;

export interface FiscalExecutableRuleSuite {
  ruleId: string;
  modelNumber: TaxModelNumber;
  fiscalYear: 2025 | 2026;
  categories: readonly FiscalExecutableCategory[];
  cases: readonly FiscalExecutableCase[];
  mutationOperators: readonly FiscalMutationOperator[];
  predicateDefinition: FiscalDecisionPredicateDefinition;
}

export interface FiscalExecutableObservation {
  diagnosticFiscalYear: number;
  diagnosticTerritory: string;
  targetPresent: boolean;
  targetStatus: ModelResultStatus | null;
  targetReason: string | null;
  targetEvidence: readonly string[];
  targetMissingInformation: readonly string[];
  targetRuleIds: readonly string[];
  recommendedModelCodes: readonly string[];
  candidateModelCodes: readonly string[];
  improbableModelCodes: readonly string[];
  exclusionCandidateIds: readonly string[];
  sourceIds: readonly string[];
  excludedModelCodes: readonly string[];
  gateBlockingReasons: readonly ExclusionAuthorizationBlockingReason[];
  authorizedExclusionCount: number;
  ruleReviewState: string;
  resolutionState: string;
  predicateDecision: FiscalPredicateDecision;
}

function caseFromScenario(
  spec: FiscalModelExecutableSpec,
  fiscalYear: 2025 | 2026,
  category: FiscalExecutableCategory,
  scenario: FiscalScenarioTemplate,
  predicateDefinition: FiscalDecisionPredicateDefinition,
  predicateFacts: FiscalDecisionPredicateFacts,
  expectedPredicateDecision: FiscalPredicateDecision,
  extraOverrides: Partial<TaxpayerProfile> = {},
  facts: {
    unknown?: boolean;
    contradictory?: boolean;
  } = {},
): FiscalExecutableCase {
  const ruleId = `es-common.${fiscalYear}.model-${spec.modelNumber}`;
  const rule = getTaxRule(fiscalYear, spec.modelNumber);
  const profile = buildFiscalTestProfile(scenario.factory, fiscalYear, {
    ...scenario.overrides,
    ...extraOverrides,
  });
  const expectedBlockingReasons = [
    ...REQUIRED_PENDING_BLOCKING_REASONS,
    ...(facts.unknown === true ? ["UNKNOWN_FACTS" as const] : []),
    ...(facts.contradictory === true
      ? ["CONTRADICTORY_FACTS" as const]
      : []),
    ...(profile.territory !== "ES_COMMON"
      ? ["TERRITORY_MISMATCH" as const]
      : []),
  ];
  const testCaseId = `${ruleId}.${category.toLowerCase()}`;
  return {
    testCaseId,
    caseId: testCaseId,
    ruleId,
    modelNumber: spec.modelNumber,
    fiscalYear,
    territory: profile.territory,
    category,
    inputFacts: profile,
    profile,
    expectedRecommendation: scenario.expectedStatus,
    expectedTargetStatus: scenario.expectedStatus,
    expectedReasonIncludes: scenario.reasonIncludes,
    expectedModels: [spec.modelNumber],
    expectedImprobableModels:
      scenario.expectedStatus === "NOT_APPLICABLE"
        ? [spec.modelNumber]
        : [],
    forbiddenInferenceModels:
      category === "INFERENCE_FORBIDDEN" ? [spec.modelNumber] : [],
    expectedExclusionCandidates:
      rule.fiscalMetadata.exclusionCandidates.map(
        (candidate) => candidate.exclusionId,
      ),
    expectedAuthorizedExclusions: 0,
    expectedBlockingReasons,
    expectedExplanationCodes:
      profile.territory === "ES_COMMON"
        ? ["TARGET_REASON_MATCH", "RULE_TRACEABILITY"]
        : ["UNSUPPORTED_TERRITORY"],
    sourceIds: rule.officialSourceIds,
    tags: [
      "FISCAL_EXECUTABLE",
      category,
      `MODEL_${spec.modelNumber}`,
      `YEAR_${fiscalYear}`,
    ],
    hasUnknownRequiredFacts: facts.unknown === true,
    hasContradictoryFacts: facts.contradictory === true,
    predicateDefinition,
    predicateFacts,
    expectedPredicateDecision,
  };
}

function predicateConditions(
  conditionCount: number,
  first: FiscalPredicateFact,
): readonly FiscalPredicateFact[] {
  return [
    first,
    ...Array.from<FiscalPredicateFact>({ length: conditionCount - 1 }).fill(
      "TRUE",
    ),
  ];
}

function predicateFacts(
  definition: FiscalDecisionPredicateDefinition,
  category: FiscalExecutableCategory,
): FiscalDecisionPredicateFacts {
  const negative =
    category === "NEGATIVE" || category === "INFERENCE_FORBIDDEN";
  const unknown = category === "UNKNOWN";
  const conditions =
    definition.conditionMode === "ANY" && (negative || unknown)
      ? predicateConditions(
          definition.conditionCount,
          unknown ? "UNKNOWN" : "FALSE",
        ).map((condition, index) =>
          index === 0 ? condition : "FALSE",
        )
      : predicateConditions(
          definition.conditionCount,
          negative ? "FALSE" : unknown ? "UNKNOWN" : "TRUE",
        );
  return {
    fiscalYear: definition.fiscalYear,
    territory: category === "TERRITORY" ? "ES_CANARY" : "ES_COMMON",
    modelNumber: definition.modelNumber,
    subject:
      definition.expectedSubject === "ENTITY" ? "ENTITY" : "PERSON",
    conditions,
    exceptionApplies: category === "EXCEPTION" ? "TRUE" : "FALSE",
    hasContradiction: category === "CONTRADICTION",
    thresholdValue: null,
    historicalEvidenceOnly: false,
    prohibitedInferenceEvidence: category === "INFERENCE_FORBIDDEN",
  };
}

const EXPECTED_PREDICATE_DECISIONS = {
  POSITIVE: "CANDIDATE",
  NEGATIVE: "NOT_APPLICABLE",
  EXCEPTION: "NOT_APPLICABLE",
  UNKNOWN: "UNKNOWN",
  CONTRADICTION: "CONTRADICTION",
  TEMPORAL: "CANDIDATE",
  TERRITORY: "BLOCKED",
  MULTI_ACTIVITY: "CANDIDATE",
  INFERENCE_FORBIDDEN: "NOT_APPLICABLE",
  BOUNDARY: "CANDIDATE",
} as const satisfies Record<
  FiscalExecutableCategory,
  FiscalPredicateDecision
>;

function casesForSpec(
  spec: FiscalModelExecutableSpec,
  fiscalYear: 2025 | 2026,
  definition: FiscalDecisionPredicateDefinition,
): readonly FiscalExecutableCase[] {
  const build = (
    category: FiscalExecutableCategory,
    scenario: FiscalScenarioTemplate,
    extraOverrides: Partial<TaxpayerProfile> = {},
    facts: { unknown?: boolean; contradictory?: boolean } = {},
  ) =>
    caseFromScenario(
      spec,
      fiscalYear,
      category,
      scenario,
      definition,
      predicateFacts(definition, category),
      EXPECTED_PREDICATE_DECISIONS[category],
      extraOverrides,
      facts,
    );

  const contradictionStatus: ModelResultStatus =
    spec.negative.expectedStatus === "NOT_APPLICABLE"
      ? "CENSUS_MISMATCH"
      : spec.negative.expectedStatus === "DERIVED" ||
          spec.negative.expectedStatus === "CONDITIONAL"
        ? "CONFIRMED_BY_CENSUS"
        : spec.negative.expectedStatus;
  const contradictionScenario: FiscalScenarioTemplate = {
    ...spec.negative,
    expectedStatus: contradictionStatus,
  };
  const territory = caseFromScenario(
    spec,
    fiscalYear,
    "TERRITORY",
    spec.positive,
    definition,
    predicateFacts(definition, "TERRITORY"),
    EXPECTED_PREDICATE_DECISIONS.TERRITORY,
    { territory: "ES_CANARY" },
  );
  return [
    build("POSITIVE", spec.positive),
    build("NEGATIVE", spec.negative),
    build("EXCEPTION", spec.exception),
    build("UNKNOWN", spec.unknown, {}, { unknown: true }),
    build(
      "CONTRADICTION",
      contradictionScenario,
      {
        activityStillActive: "YES",
        activityEndDate: `${fiscalYear}-06-30`,
        censusReviewed: "YES",
        censusObligations: [spec.modelNumber],
      },
      { contradictory: true },
    ),
    build("TEMPORAL", spec.positive, {
      activityStartDate: `${fiscalYear}-04-01`,
      activityEndDate: `${fiscalYear}-09-30`,
      activityStillActive: "NO",
    }),
    {
      ...territory,
      expectedRecommendation: null,
      expectedTargetStatus: null,
      expectedReasonIncludes: null,
      expectedModels: [],
      expectedImprobableModels: [],
      forbiddenInferenceModels: [],
    },
    build("MULTI_ACTIVITY", spec.positive, {
      activityKinds: ["PROFESSIONAL", "BUSINESS"],
    }),
    build("INFERENCE_FORBIDDEN", spec.prohibitedInference),
    build("BOUNDARY", spec.positive, {
      activityStartDate: `${fiscalYear}-01-01`,
      withheldIncomePercent: spec.thresholdExceptionAt,
    }),
  ];
}

export const FISCAL_EXECUTABLE_RULE_SUITES: readonly FiscalExecutableRuleSuite[] =
  ([2025, 2026] as const).flatMap((fiscalYear) =>
    FISCAL_MODEL_EXECUTABLE_SPECS.map((spec) => {
      const rule = getTaxRule(fiscalYear, spec.modelNumber);
      const predicateDefinition = buildFiscalDecisionPredicateDefinition(
        rule,
        spec.thresholdExceptionAt,
        conditionModeForModel(spec.modelNumber),
        expectedSubjectForModel(spec.modelNumber),
      );
      return {
        ruleId: rule.ruleId,
        modelNumber: spec.modelNumber,
        fiscalYear,
        categories: FISCAL_EXECUTABLE_CATEGORIES,
        cases: casesForSpec(spec, fiscalYear, predicateDefinition),
        mutationOperators: mutationOperatorsForSpec(
          spec,
          rule.conditions.length,
        ),
        predicateDefinition,
      };
    }),
  );

function uniqueReasons(
  values: readonly ExclusionAuthorizationBlockingReason[],
): readonly ExclusionAuthorizationBlockingReason[] {
  return [...new Set(values)];
}

export function executeFiscalCase(
  testCase: FiscalExecutableCase,
): FiscalExecutableObservation {
  const diagnostic = evaluateTaxModelDiagnostic(
    testCase.profile,
    FISCAL_EXECUTABLE_TEST_GENERATED_AT,
  );
  const assessment = buildTaxObligationsAssessment(diagnostic);
  const target = diagnostic.models.find(
    (model) => model.modelNumber === testCase.modelNumber,
  );
  const rule = getTaxRule(testCase.fiscalYear, testCase.modelNumber);
  const gateResults = rule.fiscalMetadata.exclusionCandidates.map((candidate) =>
    authorizeRuleExclusion({
      ruleset: taxRuleSetAuthorizationMetadata(testCase.fiscalYear),
      rule,
      exclusionCandidate: candidate,
      targetFiscalYear: testCase.fiscalYear,
      targetTerritory: testCase.profile.territory,
      ruleHash: rule.fiscalMetadata.ruleHash,
      approvalEvidence: null,
      issues: rule.fiscalMetadata.review.issueIds.map((issueId) => ({
        issueId,
        status: "OPEN",
      })),
      issueRegistryComplete: true,
      facts: {
        hasUnknownRequiredFacts: testCase.hasUnknownRequiredFacts,
        hasContradictoryFacts: testCase.hasContradictoryFacts,
      },
      // Every executable case proves that an internal override cannot bypass
      // the pending fiscal gate.
      internalOverrideRequested: true,
      evaluatedAt: FISCAL_EXECUTABLE_TEST_GENERATED_AT,
    }),
  );

  return {
    diagnosticFiscalYear: diagnostic.fiscalYear,
    diagnosticTerritory: diagnostic.territory,
    targetPresent: Boolean(target),
    targetStatus: target?.status ?? null,
    targetReason: target?.reason ?? null,
    targetEvidence: target?.evidence ?? [],
    targetMissingInformation: target?.missingInformation ?? [],
    targetRuleIds: target?.ruleIds ?? [],
    recommendedModelCodes: diagnostic.models
      .filter(
        (model) =>
          model.status === "DERIVED" ||
          model.status === "CONFIRMED_BY_CENSUS",
      )
      .map((model) => model.modelNumber),
    candidateModelCodes: assessment.obligations.map(
      (obligation) => obligation.modelCode,
    ),
    improbableModelCodes: diagnostic.models
      .filter((model) => model.status === "NOT_APPLICABLE")
      .map((model) => model.modelNumber),
    exclusionCandidateIds: gateResults.map((result) => result.exclusionId),
    sourceIds: target?.officialSources.map((source) => source.sourceId) ?? [],
    excludedModelCodes: assessment.obligations
      .filter(
        (obligation) => obligation.exclusionAuthorization?.authorized === true,
      )
      .map((obligation) => obligation.modelCode),
    gateBlockingReasons: uniqueReasons(
      gateResults.flatMap((result) => result.blockingReasons),
    ),
    authorizedExclusionCount: gateResults.filter((result) => result.authorized)
      .length,
    ruleReviewState: assessment.ruleReviewState,
    resolutionState: assessment.resolutionState,
    predicateDecision: evaluateFiscalDecisionPredicate(
      testCase.predicateDefinition,
      testCase.predicateFacts,
    ),
  };
}

function lower(value: string): string {
  return value.toLocaleLowerCase("es-ES");
}

export function validateFiscalCaseObservation(
  testCase: FiscalExecutableCase,
  observation: FiscalExecutableObservation,
): string[] {
  const errors: string[] = [];
  const add = (code: string) => errors.push(`${testCase.caseId}:${code}`);

  if (observation.diagnosticFiscalYear !== testCase.fiscalYear) {
    add("FISCAL_YEAR_MISMATCH");
  }
  if (observation.diagnosticTerritory !== testCase.profile.territory) {
    add("TERRITORY_MISMATCH");
  }
  if (observation.targetStatus !== testCase.expectedTargetStatus) {
    add("UNEXPECTED_RECOMMENDATION");
  }
  if (testCase.expectedRecommendation !== testCase.expectedTargetStatus) {
    add("TEST_CASE_RECOMMENDATION_ALIAS_MISMATCH");
  }
  if (observation.predicateDecision !== testCase.expectedPredicateDecision) {
    add("PREDICATE_DECISION_MISMATCH");
  }
  if (
    testCase.expectedReasonIncludes &&
    !lower(observation.targetReason ?? "").includes(
      lower(testCase.expectedReasonIncludes),
    )
  ) {
    add("UNEXPECTED_EXPLANATION");
  }

  const expectedTargetPresent = testCase.expectedTargetStatus !== null;
  if (observation.targetPresent !== expectedTargetPresent) {
    add("TARGET_PRESENCE_MISMATCH");
  }
  if (testCase.profile.territory === "ES_COMMON") {
    if (observation.candidateModelCodes.length !== 27) {
      add("INCOMPLETE_CANDIDATE_CATALOG");
    }
    if (!observation.candidateModelCodes.includes(testCase.modelNumber)) {
      add("TARGET_NOT_PRESERVED_AS_CANDIDATE");
    }
    const expectedRuleId = `es-common.${testCase.fiscalYear}.model-${testCase.modelNumber}`;
    if (!observation.targetRuleIds.includes(expectedRuleId)) {
      add("RULE_TRACEABILITY_MISSING");
    }
    if (
      observation.targetEvidence.length === 0 &&
      observation.targetMissingInformation.length === 0
    ) {
      add("USED_FACTS_NOT_REPORTED");
    }
  } else {
    if (observation.candidateModelCodes.length !== 0) {
      add("UNSUPPORTED_TERRITORY_EMITTED_CANDIDATES");
    }
    if (observation.resolutionState !== "BLOCKED") {
      add("UNSUPPORTED_TERRITORY_NOT_BLOCKED");
    }
  }

  for (const model of testCase.expectedModels) {
    if (!observation.candidateModelCodes.includes(model)) {
      add(`EXPECTED_MODEL_MISSING_${model}`);
    }
  }
  for (const model of testCase.expectedImprobableModels) {
    if (!observation.improbableModelCodes.includes(model)) {
      add(`IMPROBABLE_MODEL_NOT_IDENTIFIED_${model}`);
    }
  }
  for (const model of testCase.forbiddenInferenceModels) {
    if (observation.recommendedModelCodes.includes(model)) {
      add(`FORBIDDEN_INFERENCE_EMITTED_${model}`);
    }
  }
  if (
    new Set(observation.exclusionCandidateIds).size !==
      new Set(testCase.expectedExclusionCandidates).size ||
    testCase.expectedExclusionCandidates.some(
      (candidate) => !observation.exclusionCandidateIds.includes(candidate),
    )
  ) {
    add("EXCLUSION_CANDIDATES_MISMATCH");
  }
  if (
    testCase.profile.territory === "ES_COMMON" &&
    testCase.sourceIds.some((sourceId) => !observation.sourceIds.includes(sourceId))
  ) {
    add("OFFICIAL_SOURCE_TRACEABILITY_MISSING");
  }

  if (observation.ruleReviewState !== "PENDING_FISCAL_REVIEW") {
    add("RULESET_NOT_PENDING");
  }
  if (observation.resolutionState === "RESOLVED") {
    add("PENDING_RULESET_RESOLVED");
  }
  if (observation.excludedModelCodes.length !== 0) {
    add("MODEL_EXCLUDED_WHILE_PENDING");
  }
  if (
    observation.authorizedExclusionCount !==
    testCase.expectedAuthorizedExclusions
  ) {
    add("EXCLUSION_AUTHORIZED_WHILE_PENDING");
  }
  for (const reason of testCase.expectedBlockingReasons) {
    if (!observation.gateBlockingReasons.includes(reason)) {
      add(`MISSING_BLOCKER_${reason}`);
    }
  }
  for (const explanationCode of testCase.expectedExplanationCodes) {
    if (
      explanationCode === "TARGET_REASON_MATCH" &&
      !testCase.expectedReasonIncludes
    ) {
      add("EXPLANATION_CODE_WITHOUT_REASON");
    }
    if (
      explanationCode === "RULE_TRACEABILITY" &&
      observation.targetRuleIds.length === 0
    ) {
      add("EXPLANATION_RULE_TRACEABILITY_MISSING");
    }
    if (
      explanationCode === "UNSUPPORTED_TERRITORY" &&
      observation.resolutionState !== "BLOCKED"
    ) {
      add("EXPLANATION_UNSUPPORTED_TERRITORY_MISSING");
    }
  }
  if (
    testCase.hasUnknownRequiredFacts &&
    !observation.gateBlockingReasons.includes("UNKNOWN_FACTS")
  ) {
    add("UNKNOWN_FACTS_NOT_BLOCKED");
  }
  if (
    testCase.hasContradictoryFacts &&
    !observation.gateBlockingReasons.includes("CONTRADICTORY_FACTS")
  ) {
    add("CONTRADICTION_NOT_BLOCKED");
  }
  if (
    testCase.profile.territory !== "ES_COMMON" &&
    !observation.gateBlockingReasons.includes("TERRITORY_MISMATCH")
  ) {
    add("TERRITORY_GATE_NOT_BLOCKED");
  }

  return errors;
}

function suiteCase(
  suite: FiscalExecutableRuleSuite,
  category: FiscalExecutableCategory,
): FiscalExecutableCase {
  const testCase = suite.cases.find(
    (candidate) => candidate.category === category,
  );
  if (!testCase) throw new Error(`MISSING_MUTATION_CASE:${category}`);
  return testCase;
}

function completePredicateFacts(
  suite: FiscalExecutableRuleSuite,
  overrides: Partial<FiscalDecisionPredicateFacts> = {},
): FiscalDecisionPredicateFacts {
  return {
    fiscalYear: suite.fiscalYear,
    territory: "ES_COMMON",
    modelNumber: suite.modelNumber,
    subject:
      suite.predicateDefinition.expectedSubject === "ENTITY"
        ? "ENTITY"
        : "PERSON",
    conditions: predicateConditions(
      suite.predicateDefinition.conditionCount,
      "TRUE",
    ),
    exceptionApplies: "FALSE",
    hasContradiction: false,
    thresholdValue: null,
    historicalEvidenceOnly: false,
    prohibitedInferenceEvidence: false,
    ...overrides,
  };
}

function mutationProbe(
  suite: FiscalExecutableRuleSuite,
  operator: FiscalMutationOperator,
): {
  facts: FiscalDecisionPredicateFacts;
  expected: FiscalPredicateDecision;
} {
  switch (operator) {
    case "CONDITION_INVERTED":
    case "AND_TO_OR":
    case "REQUIRED_CONDITION_REMOVED": {
      const testCase = suiteCase(suite, "NEGATIVE");
      return {
        facts: testCase.predicateFacts,
        expected: testCase.expectedPredicateDecision,
      };
    }
    case "OR_TO_AND":
      return {
        facts: completePredicateFacts(suite, {
          conditions: [
            "TRUE",
            ...Array.from<FiscalPredicateFact>({
              length: suite.predicateDefinition.conditionCount - 1,
            }).fill("FALSE"),
          ],
        }),
        expected: "CANDIDATE",
      };
    case "EXCEPTION_REMOVED": {
      const testCase = suiteCase(suite, "EXCEPTION");
      return {
        facts: testCase.predicateFacts,
        expected: testCase.expectedPredicateDecision,
      };
    }
    case "FISCAL_YEAR_CHANGED": {
      const testCase = suiteCase(suite, "TEMPORAL");
      return {
        facts: testCase.predicateFacts,
        expected: testCase.expectedPredicateDecision,
      };
    }
    case "TERRITORY_CHANGED": {
      const testCase = suiteCase(suite, "TERRITORY");
      return {
        facts: testCase.predicateFacts,
        expected: testCase.expectedPredicateDecision,
      };
    }
    case "UNKNOWN_TO_FALSE":
    case "UNKNOWN_TO_TRUE": {
      const testCase = suiteCase(suite, "UNKNOWN");
      return {
        facts: testCase.predicateFacts,
        expected: testCase.expectedPredicateDecision,
      };
    }
    case "CONTRADICTION_IGNORED": {
      const testCase = suiteCase(suite, "CONTRADICTION");
      return {
        facts: testCase.predicateFacts,
        expected: testCase.expectedPredicateDecision,
      };
    }
    case "THRESHOLD_CHANGED": {
      const threshold = suite.predicateDefinition.thresholdExceptionAt;
      if (threshold === null) {
        throw new Error(`THRESHOLD_MUTATION_NOT_APPLICABLE:${suite.ruleId}`);
      }
      return {
        facts: completePredicateFacts(suite, { thresholdValue: threshold }),
        expected: "NOT_APPLICABLE",
      };
    }
    case "HISTORICAL_TO_CURRENT":
      return {
        facts: completePredicateFacts(suite, {
          historicalEvidenceOnly: true,
        }),
        expected: "BLOCKED",
      };
    case "SUBJECT_SWAPPED":
    case "CROSS_MODEL_RULE":
      return {
        facts: completePredicateFacts(suite),
        expected: "CANDIDATE",
      };
  }
}

export interface FiscalMutationScore {
  killed: number;
  total: number;
  score: number;
  safetyCriticalKilled: number;
  safetyCriticalTotal: number;
  safetyCriticalScore: number;
  survivedOperators: readonly FiscalMutationOperator[];
  invalidBaselineOperators: readonly FiscalMutationOperator[];
}

/**
 * Ejecuta cada mutante contra el predicado fiscal antes de tomar la decisión.
 * Un mutante solo cuenta como muerto si la lógica alterada cambia el resultado
 * esperado de un escenario cuya decisión canónica también se ha comprobado.
 */
export function mutationScoreForSuite(
  suite: FiscalExecutableRuleSuite,
): FiscalMutationScore {
  const survivedOperators: FiscalMutationOperator[] = [];
  const invalidBaselineOperators: FiscalMutationOperator[] = [];
  let killed = 0;
  let safetyCriticalKilled = 0;
  let safetyCriticalTotal = 0;

  for (const operator of suite.mutationOperators) {
    const probe = mutationProbe(suite, operator);
    const baseline = evaluateFiscalDecisionPredicate(
      suite.predicateDefinition,
      probe.facts,
    );
    if (baseline !== probe.expected) {
      invalidBaselineOperators.push(operator);
      continue;
    }
    const mutant = evaluateFiscalDecisionPredicate(
      suite.predicateDefinition,
      probe.facts,
      operator,
    );
    const mutantKilled = mutant !== probe.expected;
    if (mutantKilled) killed += 1;
    else survivedOperators.push(operator);
    if (
      FISCAL_SAFETY_CRITICAL_MUTATIONS.includes(
        operator as (typeof FISCAL_SAFETY_CRITICAL_MUTATIONS)[number],
      )
    ) {
      safetyCriticalTotal += 1;
      if (mutantKilled) safetyCriticalKilled += 1;
    }
  }

  const total = suite.mutationOperators.length;
  return {
    killed,
    total,
    score: total === 0 ? 0 : Math.round((killed / total) * 100),
    safetyCriticalKilled,
    safetyCriticalTotal,
    safetyCriticalScore:
      safetyCriticalTotal === 0
        ? 100
        : Math.round((safetyCriticalKilled / safetyCriticalTotal) * 100),
    survivedOperators,
    invalidBaselineOperators,
  };
}
