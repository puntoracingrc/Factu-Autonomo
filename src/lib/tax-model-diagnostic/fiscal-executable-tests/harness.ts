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
}

export interface FiscalExecutableRuleSuite {
  ruleId: string;
  modelNumber: TaxModelNumber;
  fiscalYear: 2025 | 2026;
  categories: readonly FiscalExecutableCategory[];
  cases: readonly FiscalExecutableCase[];
  mutationOperators: readonly FiscalMutationOperator[];
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
}

function caseFromScenario(
  spec: FiscalModelExecutableSpec,
  fiscalYear: 2025 | 2026,
  category: FiscalExecutableCategory,
  scenario: FiscalScenarioTemplate,
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
  };
}

function casesForSpec(
  spec: FiscalModelExecutableSpec,
  fiscalYear: 2025 | 2026,
): readonly FiscalExecutableCase[] {
  const territory = caseFromScenario(
    spec,
    fiscalYear,
    "TERRITORY",
    spec.positive,
    { territory: "ES_CANARY" },
  );
  return [
    caseFromScenario(spec, fiscalYear, "POSITIVE", spec.positive),
    caseFromScenario(spec, fiscalYear, "NEGATIVE", spec.negative),
    caseFromScenario(spec, fiscalYear, "EXCEPTION", spec.negative),
    caseFromScenario(spec, fiscalYear, "UNKNOWN", spec.unknown, {}, { unknown: true }),
    caseFromScenario(
      spec,
      fiscalYear,
      "CONTRADICTION",
      spec.positive,
      {},
      { contradictory: true },
    ),
    caseFromScenario(spec, fiscalYear, "TEMPORALITY", spec.positive, {
      activityStartDate: `${fiscalYear}-04-01`,
      activityEndDate: `${fiscalYear}-09-30`,
      activityStillActive: "NO",
    }),
    {
      ...territory,
      expectedTargetStatus: null,
      expectedReasonIncludes: null,
    },
    caseFromScenario(
      spec,
      fiscalYear,
      "PROHIBITED_INFERENCE",
      spec.negative,
    ),
  ];
}

export const FISCAL_EXECUTABLE_RULE_SUITES: readonly FiscalExecutableRuleSuite[] =
  ([2025, 2026] as const).flatMap((fiscalYear) =>
    FISCAL_MODEL_EXECUTABLE_SPECS.map((spec) => ({
      ruleId: `es-common.${fiscalYear}.model-${spec.modelNumber}`,
      modelNumber: spec.modelNumber,
      fiscalYear,
      categories: FISCAL_EXECUTABLE_CATEGORIES,
      cases: casesForSpec(spec, fiscalYear),
      mutationOperators: mutationOperatorsForSpec(spec),
    })),
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

function replaceDecision(
  base: FiscalExecutableObservation,
  replacement: FiscalExecutableObservation,
): FiscalExecutableObservation {
  return {
    ...base,
    targetPresent: replacement.targetPresent,
    targetStatus: replacement.targetStatus,
    targetReason: replacement.targetReason,
    targetRuleIds: replacement.targetRuleIds,
  };
}

export function createMutatedObservation(
  operator: FiscalMutationOperator,
  observations: ReadonlyMap<
    FiscalExecutableCategory,
    FiscalExecutableObservation
  >,
): {
  category: FiscalExecutableCategory;
  observation: FiscalExecutableObservation;
} {
  const required = (category: FiscalExecutableCategory) => {
    const observation = observations.get(category);
    if (!observation) throw new Error(`MISSING_OBSERVATION:${category}`);
    return observation;
  };
  const positive = required("POSITIVE");
  const negative = required("NEGATIVE");

  switch (operator) {
    case "AND_TO_OR":
      return {
        category: "NEGATIVE",
        observation: replaceDecision(negative, positive),
      };
    case "CONDITION_INVERTED":
      return {
        category: "POSITIVE",
        observation: replaceDecision(positive, negative),
      };
    case "EXCEPTION_REMOVED": {
      const exception = required("EXCEPTION");
      return {
        category: "EXCEPTION",
        observation: replaceDecision(exception, positive),
      };
    }
    case "FISCAL_YEAR_CHANGED": {
      const temporal = required("TEMPORALITY");
      const otherYear = temporal.diagnosticFiscalYear === 2025 ? 2026 : 2025;
      return {
        category: "TEMPORALITY",
        observation: {
          ...temporal,
          diagnosticFiscalYear: otherYear,
          targetRuleIds: temporal.targetRuleIds.map((ruleId) =>
            ruleId.replace(/\.(2025|2026)\./u, `.${otherYear}.`),
          ),
        },
      };
    }
    case "TERRITORY_CHANGED": {
      const territory = required("TERRITORY");
      return {
        category: "TERRITORY",
        observation: {
          ...territory,
          targetPresent: true,
          targetStatus: positive.targetStatus,
          targetReason: positive.targetReason,
          targetRuleIds: positive.targetRuleIds,
          candidateModelCodes: positive.candidateModelCodes,
          resolutionState: positive.resolutionState,
        },
      };
    }
    case "UNKNOWN_TO_FALSE": {
      const unknown = required("UNKNOWN");
      return {
        category: "UNKNOWN",
        observation: {
          ...replaceDecision(unknown, negative),
          gateBlockingReasons: unknown.gateBlockingReasons.filter(
            (reason) => reason !== "UNKNOWN_FACTS",
          ),
        },
      };
    }
    case "CONTRADICTION_IGNORED": {
      const contradiction = required("CONTRADICTION");
      return {
        category: "CONTRADICTION",
        observation: {
          ...contradiction,
          gateBlockingReasons: contradiction.gateBlockingReasons.filter(
            (reason) => reason !== "CONTRADICTORY_FACTS",
          ),
        },
      };
    }
    case "THRESHOLD_CHANGED": {
      const inference = required("PROHIBITED_INFERENCE");
      return {
        category: "PROHIBITED_INFERENCE",
        observation: replaceDecision(inference, positive),
      };
    }
  }
}

export function mutationScoreForSuite(
  suite: FiscalExecutableRuleSuite,
  observations: ReadonlyMap<
    FiscalExecutableCategory,
    FiscalExecutableObservation
  >,
): { killed: number; total: number; score: number } {
  let killed = 0;
  for (const operator of suite.mutationOperators) {
    const mutant = createMutatedObservation(operator, observations);
    const testCase = suite.cases.find(
      (candidate) => candidate.category === mutant.category,
    );
    if (!testCase) throw new Error(`MISSING_MUTATION_CASE:${mutant.category}`);
    if (validateFiscalCaseObservation(testCase, mutant.observation).length > 0) {
      killed += 1;
    }
  }
  const total = suite.mutationOperators.length;
  return {
    killed,
    total,
    score: total === 0 ? 0 : Math.round((killed / total) * 100),
  };
}
