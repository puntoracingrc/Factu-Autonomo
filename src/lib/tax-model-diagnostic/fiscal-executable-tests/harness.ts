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
  type FiscalExecutableCategory,
  type FiscalModelExecutableSpec,
  type FiscalMutationOperator,
  type FiscalScenarioTemplate,
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

export interface FiscalExecutableCase {
  caseId: string;
  ruleId: string;
  modelNumber: TaxModelNumber;
  fiscalYear: 2025 | 2026;
  category: FiscalExecutableCategory;
  profile: TaxpayerProfile;
  expectedTargetStatus: ModelResultStatus | null;
  expectedReasonIncludes: string | null;
  hasUnknownRequiredFacts: boolean;
  hasContradictoryFacts: boolean;
  predicateDefinition: FiscalDecisionPredicateDefinition;
  predicateFacts: FiscalDecisionPredicateFacts;
  expectedPredicateDecision: FiscalPredicateDecision;
}

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
  targetRuleIds: readonly string[];
  candidateModelCodes: readonly string[];
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
  return {
    caseId: `${ruleId}.${category.toLowerCase()}`,
    ruleId,
    modelNumber: spec.modelNumber,
    fiscalYear,
    category,
    profile: buildFiscalTestProfile(scenario.factory, fiscalYear, {
      ...scenario.overrides,
      ...extraOverrides,
    }),
    expectedTargetStatus: scenario.expectedStatus,
    expectedReasonIncludes: scenario.reasonIncludes,
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
  const firstCondition: FiscalPredicateFact =
    category === "NEGATIVE" || category === "PROHIBITED_INFERENCE"
      ? "FALSE"
      : category === "UNKNOWN"
        ? "UNKNOWN"
        : "TRUE";
  return {
    fiscalYear: definition.fiscalYear,
    territory: category === "TERRITORY" ? "ES_CANARY" : "ES_COMMON",
    conditions: predicateConditions(
      definition.conditionCount,
      firstCondition,
    ),
    exceptionApplies: category === "EXCEPTION" ? "TRUE" : "FALSE",
    hasContradiction: category === "CONTRADICTION",
    thresholdValue: null,
    prohibitedInferenceEvidence: category === "PROHIBITED_INFERENCE",
  };
}

const EXPECTED_PREDICATE_DECISIONS = {
  POSITIVE: "CANDIDATE",
  NEGATIVE: "NOT_APPLICABLE",
  EXCEPTION: "NOT_APPLICABLE",
  UNKNOWN: "UNKNOWN",
  CONTRADICTION: "CONTRADICTION",
  TEMPORALITY: "CANDIDATE",
  TERRITORY: "BLOCKED",
  PROHIBITED_INFERENCE: "NOT_APPLICABLE",
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
    build("TEMPORALITY", spec.positive, {
      activityStartDate: `${fiscalYear}-04-01`,
      activityEndDate: `${fiscalYear}-09-30`,
      activityStillActive: "NO",
    }),
    {
      ...territory,
      expectedTargetStatus: null,
      expectedReasonIncludes: null,
    },
    build("PROHIBITED_INFERENCE", spec.prohibitedInference),
  ];
}

export const FISCAL_EXECUTABLE_RULE_SUITES: readonly FiscalExecutableRuleSuite[] =
  ([2025, 2026] as const).flatMap((fiscalYear) =>
    FISCAL_MODEL_EXECUTABLE_SPECS.map((spec) => {
      const rule = getTaxRule(fiscalYear, spec.modelNumber);
      const predicateDefinition = buildFiscalDecisionPredicateDefinition(
        rule,
        spec.thresholdExceptionAt,
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
    targetRuleIds: target?.ruleIds ?? [],
    candidateModelCodes: assessment.obligations.map(
      (obligation) => obligation.modelCode,
    ),
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
  } else {
    if (observation.candidateModelCodes.length !== 0) {
      add("UNSUPPORTED_TERRITORY_EMITTED_CANDIDATES");
    }
    if (observation.resolutionState !== "BLOCKED") {
      add("UNSUPPORTED_TERRITORY_NOT_BLOCKED");
    }
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
  if (observation.authorizedExclusionCount !== 0) {
    add("EXCLUSION_AUTHORIZED_WHILE_PENDING");
  }
  for (const reason of REQUIRED_PENDING_BLOCKING_REASONS) {
    if (!observation.gateBlockingReasons.includes(reason)) {
      add(`MISSING_BLOCKER_${reason}`);
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

const MUTATION_CASES = {
  AND_TO_OR: "NEGATIVE",
  CONDITION_INVERTED: "NEGATIVE",
  EXCEPTION_REMOVED: "EXCEPTION",
  FISCAL_YEAR_CHANGED: "TEMPORALITY",
  TERRITORY_CHANGED: "TERRITORY",
  UNKNOWN_TO_FALSE: "UNKNOWN",
  CONTRADICTION_IGNORED: "CONTRADICTION",
} as const satisfies Record<
  Exclude<FiscalMutationOperator, "THRESHOLD_CHANGED">,
  FiscalExecutableCategory
>;

function mutationProbe(
  suite: FiscalExecutableRuleSuite,
  operator: FiscalMutationOperator,
): {
  facts: FiscalDecisionPredicateFacts;
  expected: FiscalPredicateDecision;
} {
  if (operator === "THRESHOLD_CHANGED") {
    const threshold = suite.predicateDefinition.thresholdExceptionAt;
    if (threshold === null) {
      throw new Error(`THRESHOLD_MUTATION_NOT_APPLICABLE:${suite.ruleId}`);
    }
    return {
      facts: {
        fiscalYear: suite.fiscalYear,
        territory: "ES_COMMON",
        conditions: predicateConditions(
          suite.predicateDefinition.conditionCount,
          "TRUE",
        ),
        exceptionApplies: "FALSE",
        hasContradiction: false,
        thresholdValue: threshold,
        prohibitedInferenceEvidence: false,
      },
      expected: "NOT_APPLICABLE",
    };
  }

  const category = MUTATION_CASES[operator];
  const testCase = suite.cases.find(
    (candidate) => candidate.category === category,
  );
  if (!testCase) throw new Error(`MISSING_MUTATION_CASE:${category}`);
  return {
    facts: testCase.predicateFacts,
    expected: testCase.expectedPredicateDecision,
  };
}

export interface FiscalMutationScore {
  killed: number;
  total: number;
  score: number;
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
    if (mutant !== probe.expected) killed += 1;
    else survivedOperators.push(operator);
  }

  const total = suite.mutationOperators.length;
  return {
    killed,
    total,
    score: total === 0 ? 0 : Math.round((killed / total) * 100),
    survivedOperators,
    invalidBaselineOperators,
  };
}
