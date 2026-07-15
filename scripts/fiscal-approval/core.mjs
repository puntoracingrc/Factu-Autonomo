import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { validateDecision } from "../fiscal-sources/cli-core.mjs";
import { readFiscalRuleBlueprints, ROOT } from "./rule-source.mjs";

export const COMMON_AUTONOMOUS_V1_MODELS = Object.freeze([
  "036",
  "100",
  "111",
  "115",
  "130",
  "131",
  "180",
  "190",
  "303",
  "347",
  "349",
  "390",
]);

export const FISCAL_FEATURE_FLAG_NAMES = Object.freeze([
  "fiscal_rules_shadow_mode",
  "fiscal_rules_approved_results",
  "fiscal_rules_exclusions",
  "document_auto_confirmation",
]);

export const DEFAULT_FISCAL_FEATURE_FLAGS = Object.freeze(
  Object.fromEntries(FISCAL_FEATURE_FLAG_NAMES.map((name) => [name, false])),
);

export function buildFiscalRuntimeState(state) {
  const rules = state.inventory.rules;
  const approved =
    rules.length === 54 &&
    rules.every(
      (rule) =>
        rule.reviewStatus === "APPROVED" &&
        rule.resolutionStatus === "RESOLVED",
    );
  const approvedResults =
    state.flags.fiscal_rules_approved_results && approved;
  return {
    flags: state.flags,
    fiscalMode: approvedResults ? "APPROVED_RESULTS" : "ORIENTATIVE",
    allModelsFallback: "ENABLED",
    shadowMode: state.flags.fiscal_rules_shadow_mode
      ? "ENABLED_NON_MUTATING"
      : "DISABLED",
    exclusions:
      approvedResults && state.flags.fiscal_rules_exclusions
        ? "INDIVIDUAL_AUTHORIZATION_REQUIRED"
        : "BLOCKED",
    documentAutoConfirmation: state.flags.document_auto_confirmation
      ? "INDIVIDUAL_GUARDS_REQUIRED"
      : "BLOCKED",
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8"));
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sorted(values) {
  return [...values].sort(compareText);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function loadFiscalApprovalState() {
  return {
    inventory: readJson("docs/fiscal/rule-inventory.json"),
    sources: readJson(
      "docs/fiscal/sources/source-snapshot-registry.v2.json",
    ),
    reviews: readJson("docs/fiscal/sources/review-decisions.v2.json"),
    issues: readJson("docs/fiscal/issues.json"),
    blueprints: readFiscalRuleBlueprints(),
    flags: DEFAULT_FISCAL_FEATURE_FLAGS,
  };
}

function materialTestHash(inventory, rule) {
  return sha256(
    JSON.stringify({
      executableSpecHash: inventory.generatedFrom.executableSpecHash,
      ruleId: rule.ruleId,
      declaredTestCaseIds: sorted(rule.declaredTestCaseIds),
      categoriesCovered: sorted(rule.categoriesCovered),
      missingCategories: sorted(rule.missingCategories),
    }),
  );
}

export function canonicalizeApprovalRule(input) {
  return JSON.stringify({
    schema: "fiscal-approval-rule-v1",
    ruleId: input.ruleId,
    model: input.model,
    fiscalYear: input.fiscalYear,
    territory: input.territory,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    conditions: sorted(input.conditions),
    factIds: sorted(input.factIds),
    decision: input.decision,
    exceptions: sorted(input.exceptions),
    exclusionIds: sorted(input.exclusionIds),
    materialSources: [...input.materialSources]
      .map((source) => ({
        sourceId: source.sourceId,
        contentHash: source.contentHash,
        normalizedContentHash: source.normalizedContentHash,
        effectiveFrom: source.effectiveFrom,
        effectiveTo: source.effectiveTo,
        materialScope: source.materialScope,
      }))
      .sort((left, right) => compareText(left.sourceId, right.sourceId)),
    materialTestHash: input.materialTestHash,
  });
}

export function approvalFiscalHash(input) {
  return `fiscal-approval-rule-v1:${sha256(
    canonicalizeApprovalRule(input),
  ).slice("sha256:".length)}`;
}

function approvalRuleInput(state, inventoryRule) {
  const blueprint = state.blueprints.find(
    (candidate) => candidate.model === inventoryRule.model,
  );
  if (!blueprint) throw new Error(`MISSING_BLUEPRINT:${inventoryRule.model}`);
  const sourcesById = new Map(
    state.sources.sources.map((source) => [source.sourceId, source]),
  );
  const materialSources = inventoryRule.sourceIds.map((sourceId) => {
    const source = sourcesById.get(sourceId);
    if (!source) throw new Error(`MISSING_SOURCE:${sourceId}`);
    return {
      sourceId,
      contentHash: source.contentHash,
      normalizedContentHash: source.normalizedContentHash,
      effectiveFrom: source.materialValidity.effectiveFrom,
      effectiveTo: source.materialValidity.effectiveTo,
      materialScope: source.materialScope,
      verificationStatus: source.verificationStatus,
      materialValidityStatus: source.materialValidity.status,
      materialValidityBasis: source.materialValidity.basis,
    };
  });
  return {
    ruleId: inventoryRule.ruleId,
    model: inventoryRule.model,
    fiscalYear: inventoryRule.fiscalYear,
    territory: inventoryRule.territory,
    effectiveFrom: inventoryRule.effectiveFrom,
    effectiveTo: inventoryRule.effectiveTo,
    conditions: blueprint.conditions,
    factIds: inventoryRule.factIds,
    decision: blueprint.decision,
    exceptions: blueprint.exceptions,
    exclusionIds: blueprint.exceptions.map(
      (_, index) => `${inventoryRule.ruleId}.exclusion-${index + 1}`,
    ),
    materialSources,
    materialTestHash: materialTestHash(state.inventory, inventoryRule),
  };
}

export function buildFiscalApprovalHashRegistry(state) {
  const rules = state.inventory.rules
    .map((rule) => {
      const material = approvalRuleInput(state, rule);
      return {
        ruleId: rule.ruleId,
        rulesetId: rule.rulesetId,
        model: rule.model,
        fiscalYear: rule.fiscalYear,
        territory: rule.territory,
        pendingRuleHash: rule.ruleHash,
        approvalFiscalHash: approvalFiscalHash(material),
        materialTestHash: material.materialTestHash,
        materialSources: material.materialSources,
        reviewStatus: rule.reviewStatus,
        resolutionStatus: rule.resolutionStatus,
        approvedRuleHash: null,
        authorizedExclusionIds: [],
      };
    })
    .sort((left, right) => compareText(left.ruleId, right.ruleId));
  return {
    contractVersion: "fiscal-approval-registry.v1",
    ruleCount: rules.length,
    materialSourceReferenceCount: rules.reduce(
      (total, rule) => total + rule.materialSources.length,
      0,
    ),
    missingMaterialSourceHashCount: rules.reduce(
      (total, rule) =>
        total +
        rule.materialSources.filter(
          (source) =>
            !source.contentHash || !source.normalizedContentHash,
        ).length,
      0,
    ),
    approvedRuleCount: 0,
    authorizedExclusionCount: 0,
    rules,
  };
}

function reviewCounts(state, approvalRegistry) {
  const sourceById = new Map(
    state.sources.sources.map((source) => [source.sourceId, source]),
  );
  const approvalHashByRule = new Map(
    approvalRegistry.rules.map((rule) => [
      rule.ruleId,
      rule.approvalFiscalHash,
    ]),
  );
  const inventory = {
    ...state.inventory,
    rules: state.inventory.rules.map((rule) => ({
      ...rule,
      approvalFiscalHash: approvalHashByRule.get(rule.ruleId) ?? null,
    })),
  };
  const validActive = state.reviews.decisions.filter(
    (decision) =>
      decision.revocation?.status === "ACTIVE" &&
      validateDecision(decision, inventory, sourceById).length === 0,
  );
  const dualByRule = new Map();
  for (const rule of inventory.rules) {
    const decisions = validActive.filter(
      (decision) => decision.ruleId === rule.ruleId,
    );
    const primary = decisions.filter(
      (decision) => decision.reviewerRole === "PRIMARY_FISCAL_REVIEWER",
    );
    const second = decisions.filter(
      (decision) => decision.reviewerRole === "SECOND_FISCAL_REVIEWER",
    );
    dualByRule.set(rule.ruleId, {
      primaryValid: primary.length === 1,
      secondValid:
        second.length === 1 &&
        primary.length === 1 &&
        primary[0].reviewerId !== second[0].reviewerId,
      eligible:
        primary.length === 1 &&
        second.length === 1 &&
        primary[0].reviewerId !== second[0].reviewerId &&
        primary[0].decision === "APPROVE" &&
        second[0].decision === "APPROVE" &&
        rule.sourceIds.every((sourceId) => {
          const source = sourceById.get(sourceId);
          return (
            source?.verificationStatus ===
              "VERIFIED_BY_TWO_FISCAL_REVIEWERS" &&
            source.materialValidity.status === "VERIFIED" &&
            source.materialValidity.basis === "SIGNED_FISCAL_REVIEW"
          );
        }),
    });
  }
  return {
    primary: [...dualByRule.values()].filter((review) => review.primaryValid)
      .length,
    second: [...dualByRule.values()].filter((review) => review.secondValid)
      .length,
    eligible: [...dualByRule.values()].filter((review) => review.eligible)
      .length,
  };
}

export function buildFiscalReadiness(state) {
  const rules = state.inventory.rules;
  const runtime = buildFiscalRuntimeState(state);
  const approvalRegistry = buildFiscalApprovalHashRegistry(state);
  const reviews = reviewCounts(state, approvalRegistry);
  const flagNames = Object.keys(state.flags).sort(compareText);
  const expectedFlagNames = [...FISCAL_FEATURE_FLAG_NAMES].sort(compareText);
  const errors = [];
  if (rules.length !== 54) errors.push(`EXPECTED_54_RULES:${rules.length}`);
  if (state.inventory.counts.passingExecutableSuites !== 54) {
    errors.push("EXPECTED_54_EXECUTABLE_SUITES");
  }
  if (rules.some((rule) => rule.reviewStatus !== "PENDING_FISCAL_REVIEW")) {
    errors.push("REAL_RULE_NOT_PENDING");
  }
  if (rules.some((rule) => rule.resolutionStatus !== "OPEN")) {
    errors.push("REAL_RULE_NOT_OPEN");
  }
  if (rules.some((rule) => rule.exclusionAuthorized)) {
    errors.push("AUTHORIZED_EXCLUSION_FOUND");
  }
  if (
    approvalRegistry.ruleCount !== 54 ||
    approvalRegistry.materialSourceReferenceCount !== 72 ||
    approvalRegistry.missingMaterialSourceHashCount !== 0
  ) {
    errors.push("FISCAL_APPROVAL_HASH_REGISTRY_INCOMPLETE");
  }
  if (state.sources.sources.some((source) => source.verificationStatus !== "PENDING_FISCAL_REVIEW")) {
    errors.push("SOURCE_PREMATURELY_VERIFIED");
  }
  if (state.issues.issues.some((issue) => issue.status !== "OPEN")) {
    errors.push("REAL_ISSUE_NOT_OPEN");
  }
  if (JSON.stringify(flagNames) !== JSON.stringify(expectedFlagNames)) {
    errors.push("FISCAL_FEATURE_FLAG_SET_MISMATCH");
  }
  if (FISCAL_FEATURE_FLAG_NAMES.some((name) => state.flags[name] !== false)) {
    errors.push("FISCAL_FEATURE_FLAG_ENABLED");
  }
  return {
    contractVersion: "fiscal-readiness.v1",
    status: errors.length === 0 ? "PASS" : "FAIL",
    rules: rules.length,
    pendingRules: rules.filter(
      (rule) => rule.reviewStatus === "PENDING_FISCAL_REVIEW",
    ).length,
    openRules: rules.filter((rule) => rule.resolutionStatus === "OPEN").length,
    executableSuites: state.inventory.counts.passingExecutableSuites,
    mutationScore: state.inventory.counts.mutationScore,
    sourceSnapshots: state.sources.sourceCount,
    verifiedFiscalSources: state.sources.sources.filter(
      (source) =>
        source.verificationStatus === "VERIFIED_BY_TWO_FISCAL_REVIEWERS",
    ).length,
    primaryFiscalReviews: reviews.primary,
    secondFiscalReviews: reviews.second,
    rulesEligibleForManualApproval: reviews.eligible,
    approvedRules: rules.filter((rule) => rule.reviewStatus === "APPROVED")
      .length,
    resolvedRules: rules.filter((rule) => rule.resolutionStatus === "RESOLVED")
      .length,
    openIssues: state.issues.issues.filter((issue) => issue.status === "OPEN")
      .length,
    authorizedExclusions: rules.filter((rule) => rule.exclusionAuthorized)
      .length,
    runtime,
    flags: runtime.flags,
    allModelsFallback: runtime.allModelsFallback,
    fiscalMode: runtime.fiscalMode,
    errors,
  };
}

function yearDifference(current, other) {
  const comparedFields = [
    "conditions",
    "exceptions",
    "decision",
    "sourceIds",
    "factIds",
    "questionIds",
    "effectiveFrom",
    "effectiveTo",
  ];
  if (!other) {
    return {
      status: "COUNTERPART_YEAR_RULE_MISSING",
      codedDifferenceFields: [],
      comparedFields,
      fiscalReviewConclusion: "NOT_ASSESSED",
    };
  }
  const differences = [];
  for (const field of comparedFields) {
    if (
      JSON.stringify(current[field]) !== JSON.stringify(other[field])
    ) {
      differences.push(field.toUpperCase());
    }
  }
  return {
    status:
      differences.length === 0
        ? "NO_YEAR_SPECIFIC_DIFFERENCE_CODED"
        : "CODED_DIFFERENCES_FOUND",
    codedDifferenceFields: differences,
    comparedFields,
    fiscalReviewConclusion: "NOT_ASSESSED",
  };
}

export function buildFiscalReviewBundle(state, batchId) {
  if (batchId !== "COMMON_AUTONOMOUS_V1") {
    throw new Error(`UNKNOWN_REVIEW_BATCH:${batchId}`);
  }
  const sourceById = new Map(
    state.sources.sources.map((source) => [source.sourceId, source]),
  );
  const issueByRule = new Map(
    state.issues.issues.map((issue) => [issue.ruleId, issue]),
  );
  const inventoryByModelYear = new Map(
    state.inventory.rules.map((rule) => [
      `${rule.model}:${rule.fiscalYear}`,
      rule,
    ]),
  );
  const rules = state.inventory.rules
    .filter(
      (rule) =>
        COMMON_AUTONOMOUS_V1_MODELS.includes(rule.model) &&
        (rule.fiscalYear === 2025 || rule.fiscalYear === 2026),
    )
    .map((rule) => {
      const material = approvalRuleInput(state, rule);
      const blueprint = state.blueprints.find(
        (candidate) => candidate.model === rule.model,
      );
      const otherYear = inventoryByModelYear.get(
        `${rule.model}:${rule.fiscalYear === 2025 ? 2026 : 2025}`,
      );
      const otherBlueprint = otherYear
        ? state.blueprints.find(
            (candidate) => candidate.model === otherYear.model,
          )
        : null;
      const currentComparable = {
        conditions: blueprint.conditions,
        exceptions: blueprint.exceptions,
        decision: blueprint.decision,
        sourceIds: rule.sourceIds,
        factIds: rule.factIds,
        questionIds: rule.questionIds,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
      };
      const otherComparable = otherBlueprint
        ? {
            conditions: otherBlueprint.conditions,
            exceptions: otherBlueprint.exceptions,
            decision: otherBlueprint.decision,
            sourceIds: otherYear.sourceIds,
            factIds: otherYear.factIds,
            questionIds: otherYear.questionIds,
            effectiveFrom: otherYear.effectiveFrom,
            effectiveTo: otherYear.effectiveTo,
          }
        : null;
      return {
        ruleId: rule.ruleId,
        rulesetId: rule.rulesetId,
        model: rule.model,
        modelRole:
          rule.model === "036"
            ? "CENSUS_ACTION"
            : "RETURN_OR_INFORMATION_MODEL",
        fiscalYear: rule.fiscalYear,
        territory: rule.territory,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        conditions: blueprint.conditions,
        exceptions: blueprint.exceptions,
        decision: blueprint.decision,
        exclusionCandidates: material.exclusionIds.map((exclusionId, index) => ({
          exclusionId,
          description: blueprint.exceptions[index],
          status: "ADVISORY_ONLY_PENDING_FISCAL_REVIEW",
        })),
        facts: rule.factIds,
        questions: rule.questionIds,
        sources: rule.sourceIds.map((sourceId) => {
          const source = sourceById.get(sourceId);
          if (!source) throw new Error(`MISSING_SOURCE:${sourceId}`);
          return {
            sourceId,
            authority: source.authority,
            officialLocator: source.officialLocator,
            materialScope: source.materialScope,
            contentHash: source.contentHash,
            normalizedContentHash: source.normalizedContentHash,
            materialValidity: source.materialValidity,
            verificationStatus: source.verificationStatus,
          };
        }),
        technicalTests: {
          executableStatus: rule.executableTestsStatus,
          executableTestCount: rule.executableTestCount,
          passingTestCount: rule.passingTestCount,
          categoriesCovered: rule.categoriesCovered,
          materialTestHash: material.materialTestHash,
          mutationCount: rule.mutationCount,
          killedMutationCount: rule.killedMutationCount,
          mutationScore: rule.mutationScore,
          safetyCriticalMutationScore: rule.safetyCriticalMutationScore,
        },
        incidents: issueByRule.has(rule.ruleId)
          ? [
              (() => {
                const issue = issueByRule.get(rule.ruleId);
                return {
                  issueId: issue.issueId,
                  severity: issue.severity,
                  status: issue.status,
                  historicalFindings: issue.findings,
                  evidenceRequired: issue.evidenceRequired,
                  openedAt: issue.openedAt,
                  openedBy: issue.openedBy,
                  openedByMeaning:
                    "HISTORICAL_TECHNICAL_AUDIT_METADATA_NOT_FISCAL_REVIEW_OR_SIGNATURE",
                  currentTechnicalAssessment: {
                    sourceSnapshot:
                      "PRESENT_HASHED_PENDING_FISCAL_VERIFICATION",
                    materialValidity: "UNVERIFIED",
                    executableTests: rule.executableTestsStatus,
                    issueRemainsOpen: true,
                  },
                  readyForVerificationAt: issue.readyForVerificationAt,
                  verifiedAt: issue.verifiedAt,
                  verifiedBy: issue.verifiedBy,
                  resolutionEvidenceIds: issue.resolutionEvidenceIds,
                };
              })(),
            ]
          : [],
        hashes: {
          pendingRuleHash: rule.ruleHash,
          approvalFiscalHash: approvalFiscalHash(material),
          approvedRuleHash: null,
        },
        review: {
          reviewStatus: rule.reviewStatus,
          resolutionStatus: rule.resolutionStatus,
          primaryFiscalReviewer: null,
          secondFiscalReviewer: null,
          signedEvidence: [],
          approved: false,
        },
        differencesAgainstOtherYear: yearDifference(
          currentComparable,
          otherComparable,
        ),
      };
    })
    .sort((left, right) =>
      left.model === right.model
        ? left.fiscalYear - right.fiscalYear
        : compareText(left.model, right.model),
    );
  if (rules.length !== COMMON_AUTONOMOUS_V1_MODELS.length * 2) {
    throw new Error(`REVIEW_BATCH_RULE_COUNT_MISMATCH:${rules.length}`);
  }
  return {
    contractVersion: "fiscal-review-bundle.v1",
    batchId,
    status: "PREPARED_NOT_APPROVED",
    purpose:
      "Compact technical packet for two independent fiscal professionals",
    fiscalYears: [2025, 2026],
    territory: "ES_COMMON",
    modelCount: COMMON_AUTONOMOUS_V1_MODELS.length,
    ruleCount: rules.length,
    approvalCount: 0,
    authorizedExclusionCount: 0,
    rules,
  };
}

export function validateReviewBundle(bundle) {
  const errors = [];
  if (bundle.batchId !== "COMMON_AUTONOMOUS_V1") {
    errors.push("INVALID_BATCH_ID");
  }
  if (bundle.ruleCount !== 24 || bundle.rules.length !== 24) {
    errors.push("EXPECTED_24_PRIORITY_RULES");
  }
  if (bundle.approvalCount !== 0 || bundle.authorizedExclusionCount !== 0) {
    errors.push("PREMATURE_REVIEW_BATCH_ACTIVATION");
  }
  if (
    bundle.rules.some(
      (rule) =>
        rule.review.reviewStatus !== "PENDING_FISCAL_REVIEW" ||
        rule.review.resolutionStatus !== "OPEN" ||
        rule.review.approved ||
        rule.hashes.approvedRuleHash !== null,
    )
  ) {
    errors.push("PRIORITY_RULE_NOT_PENDING");
  }
  if (
    bundle.rules.filter((rule) => rule.model === "036").some(
      (rule) => rule.modelRole !== "CENSUS_ACTION",
    )
  ) {
    errors.push("MODEL_036_NOT_CENSUS_ACTION");
  }
  if (
    bundle.rules.some(
      (rule) =>
        rule.differencesAgainstOtherYear.fiscalReviewConclusion !==
        "NOT_ASSESSED",
    )
  ) {
    errors.push("YEAR_DIFFERENCE_MISREPRESENTS_FISCAL_REVIEW");
  }
  return errors;
}

export function validateFiscalShadowInfrastructure(state) {
  const readiness = buildFiscalReadiness(state);
  const errors = [...readiness.errors];
  if (readiness.fiscalMode !== "ORIENTATIVE") errors.push("MODE_NOT_ORIENTATIVE");
  if (readiness.allModelsFallback !== "ENABLED") errors.push("ALL_NOT_ENABLED");
  if (readiness.authorizedExclusions !== 0) errors.push("SHADOW_EXCLUSION_FOUND");
  return errors;
}

export function validateFiscalRollbackInfrastructure(state) {
  const readiness = buildFiscalReadiness(state);
  const errors = [...readiness.errors];
  if (Object.values(DEFAULT_FISCAL_FEATURE_FLAGS).some(Boolean)) {
    errors.push("ROLLBACK_DEFAULT_NOT_FALSE");
  }
  if (readiness.allModelsFallback !== "ENABLED") {
    errors.push("ROLLBACK_DOES_NOT_PRESERVE_ALL");
  }
  if (
    readiness.runtime.exclusions !== "BLOCKED" ||
    readiness.runtime.documentAutoConfirmation !== "BLOCKED"
  ) {
    errors.push("ROLLBACK_RUNTIME_CAPABILITY_STILL_ENABLED");
  }
  return errors;
}
