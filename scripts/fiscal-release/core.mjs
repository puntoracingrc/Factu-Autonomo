import { createHash } from "node:crypto";

const EXPECTED_FLAG_NAMES = Object.freeze([
  "document_auto_confirmation",
  "fiscal_rules_approved_results",
  "fiscal_rules_exclusions",
  "fiscal_rules_shadow_mode",
]);

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicalHash(rows) {
  return sha256(JSON.stringify([...rows].sort((left, right) =>
    compareText(left.ruleId, right.ruleId),
  )));
}

function sufficientTechnicalRule(rule) {
  return (
    rule.executableTestsStatus === "PASSING" &&
    rule.executableTestCount > 0 &&
    rule.passingTestCount === rule.executableTestCount &&
    rule.missingCategories.length === 0 &&
    rule.mutationScore >= 85 &&
    rule.safetyCriticalMutationScore === 100
  );
}

function exactFalseFlags(flags) {
  const names = Object.keys(flags).sort(compareText);
  return (
    JSON.stringify(names) === JSON.stringify(EXPECTED_FLAG_NAMES) &&
    names.every((name) => flags[name] === false)
  );
}

export function buildFiscalReleaseSnapshot({
  validatedSourceSha,
  inventory,
  sourceRegistry,
  approvalRegistry,
  readiness,
  corpus,
}) {
  const rules = [...inventory.rules].sort((left, right) =>
    compareText(left.ruleId, right.ruleId),
  );
  const approvalByRule = new Map(
    approvalRegistry.rules.map((rule) => [rule.ruleId, rule]),
  );
  const fiscalHashes = rules.map((rule) => {
    const approval = approvalByRule.get(rule.ruleId);
    if (!approval) throw new Error(`MISSING_APPROVAL_HASH:${rule.ruleId}`);
    return Object.freeze({
      ruleId: rule.ruleId,
      pendingRuleHash: rule.ruleHash,
      approvalFiscalHash: approval.approvalFiscalHash,
    });
  });
  const rulesWithSufficientTechnicalTests = rules.filter(
    sufficientTechnicalRule,
  ).length;
  const flagsAllFalse = exactFalseFlags(readiness.flags);
  const errors = [];
  if (!/^[0-9a-f]{40}$/.test(validatedSourceSha)) {
    errors.push("INVALID_VALIDATED_SOURCE_SHA");
  }
  if (readiness.status !== "PASS") errors.push("READINESS_NOT_PASSING");
  if (!corpus.valid) errors.push("CORPUS_NOT_VALID");
  if (inventory.counts.rules !== rules.length) errors.push("RULE_COUNT_DRIFT");
  if (approvalRegistry.ruleCount !== rules.length) {
    errors.push("APPROVAL_HASH_COUNT_DRIFT");
  }
  if (rulesWithSufficientTechnicalTests !== rules.length) {
    errors.push("INSUFFICIENT_TECHNICAL_RULE_TESTS");
  }
  if (!flagsAllFalse) errors.push("FISCAL_FLAGS_NOT_ALL_FALSE");
  if (readiness.authorizedExclusions !== 0) {
    errors.push("AUTHORIZED_EXCLUSIONS_PRESENT");
  }
  if (readiness.allModelsFallback !== "ENABLED") {
    errors.push("ALL_MODELS_FALLBACK_DISABLED");
  }
  if (readiness.fiscalMode !== "ORIENTATIVE") {
    errors.push("FISCAL_MODE_NOT_ORIENTATIVE");
  }
  if (corpus.independentHoldoutEvaluated) {
    errors.push("INDEPENDENT_HOLDOUT_MUST_NOT_RUN_IN_PUBLIC_RELEASE_REPORT");
  }

  return Object.freeze({
    contractVersion: "fiscal-release-report.v1",
    status: errors.length === 0 ? "PASS" : "FAIL",
    validatedSourceSha,
    engineVersion: inventory.generatedFrom.engineVersion,
    rulesetVersions: Object.freeze([...inventory.generatedFrom.rulesetIds]),
    hashes: Object.freeze({
      technicalFileHash: inventory.generatedFrom.technicalFileHash,
      executableSpecHash: inventory.generatedFrom.executableSpecHash,
      sourceRegistryHash: sourceRegistry.registryHash,
      approvalRegistryHash: sha256(JSON.stringify(approvalRegistry)),
      pendingRuleHashesDigest: canonicalHash(
        fiscalHashes.map(({ ruleId, pendingRuleHash }) => ({
          ruleId,
          pendingRuleHash,
        })),
      ),
      approvalFiscalHashesDigest: canonicalHash(
        fiscalHashes.map(({ ruleId, approvalFiscalHash }) => ({
          ruleId,
          approvalFiscalHash,
        })),
      ),
    }),
    rules: Object.freeze({
      total: rules.length,
      executableSuites: inventory.counts.passingExecutableSuites,
      sufficientTechnicalTests: rulesWithSufficientTechnicalTests,
      executableTestCases: inventory.counts.executableTestCases,
      passingExecutableTestCases: inventory.counts.passingExecutableTestCases,
      mutationScore: inventory.counts.mutationScore,
      safetyCriticalMutationScore:
        inventory.counts.safetyCriticalMutationScore,
      pendingFiscalReview: readiness.pendingRules,
      openResolution: readiness.openRules,
      primaryFiscalReviews: readiness.primaryFiscalReviews,
      secondFiscalReviews: readiness.secondFiscalReviews,
      eligibleForManualApproval: readiness.rulesEligibleForManualApproval,
      approved: readiness.approvedRules,
      resolved: readiness.resolvedRules,
    }),
    sources: Object.freeze({
      snapshots: sourceRegistry.sourceCount,
      verifiedFiscalSources: readiness.verifiedFiscalSources,
      status: readiness.verifiedFiscalSources === 0
        ? "PENDING_FISCAL_REVIEW"
        : "PARTIALLY_OR_FULLY_VERIFIED",
    }),
    corpus: Object.freeze({
      synthetic: corpus.sourceClassCounts.SYNTHETIC,
      officialGenerated: corpus.sourceClassCounts.OFFICIAL_GENERATED,
      realAnonymized: corpus.sourceClassCounts.REAL_ANONYMIZED,
      engineeringHoldout: corpus.sourceClassCounts.ENGINEERING_HOLDOUT,
      independentHoldout: corpus.sourceClassCounts.INDEPENDENT_HOLDOUT,
      engineeringHoldoutAvailable: corpus.engineeringHoldoutAvailable,
      independentHoldoutAvailable: corpus.independentHoldoutAvailable,
      independentHoldoutEvaluated: corpus.independentHoldoutEvaluated,
      familyCount: corpus.familyCount,
      layoutCount: corpus.layoutCount,
    }),
    runtime: Object.freeze({
      flags: Object.freeze({ ...readiness.flags }),
      flagsAllFalse,
      authorizedExclusions: readiness.authorizedExclusions,
      allModelsFallback: readiness.allModelsFallback,
      fiscalMode: readiness.fiscalMode,
      shadowMode: readiness.runtime.shadowMode,
      exclusions: readiness.runtime.exclusions,
      documentAutoConfirmation: readiness.runtime.documentAutoConfirmation,
      rollbackApplicationStatus: "PLAN_ONLY",
      runtimeFlagProvider: "NOT_CONFIGURED",
      rollbackDeployRequirement: "PROVIDER_DEPENDENT",
    }),
    fiscalHashes: Object.freeze(fiscalHashes),
    errors: Object.freeze(errors.sort(compareText)),
  });
}

function table(rows) {
  return rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function yesNo(value) {
  return value ? "YES" : "NO";
}

export function renderFiscalReleaseReport(report) {
  const flagRows = Object.entries(report.runtime.flags)
    .sort(([left], [right]) => compareText(left, right))
    .map(([name, enabled]) => [`\`${name}\``, enabled ? "true" : "false"]);
  const hashRows = report.fiscalHashes.map((row) => [
    `\`${row.ruleId}\``,
    `\`${row.pendingRuleHash}\``,
    `\`${row.approvalFiscalHash}\``,
  ]);
  return `# Fiscal release report

<!-- generated by npm run fiscal:release:report; do not edit manually -->
<!-- validated-source-sha:${report.validatedSourceSha} -->

This report was generated from the fiscal registries and executable validation
artifacts. The recorded SHA is the exact \`main\` commit used as input before
this report-only change; it is intentionally not a self-referential report SHA.

## Release identity

| Field | Value |
| --- | --- |
| Validation status | **${report.status}** |
| Validated source/main SHA | \`${report.validatedSourceSha}\` |
| Engine version | \`${report.engineVersion}\` |
| Ruleset versions | ${report.rulesetVersions.map((value) => `\`${value}\``).join(", ")} |
| Technical rules file hash | \`${report.hashes.technicalFileHash}\` |
| Executable specification hash | \`${report.hashes.executableSpecHash}\` |
| Source registry hash | \`${report.hashes.sourceRegistryHash}\` |
| Approval registry hash | \`${report.hashes.approvalRegistryHash}\` |
| Pending rule hashes digest | \`${report.hashes.pendingRuleHashesDigest}\` |
| Approval fiscal hashes digest | \`${report.hashes.approvalFiscalHashesDigest}\` |

## Fiscal and technical state

| Measure | Value |
| --- | ---: |
| Rules | ${report.rules.total} |
| Executable test suites | ${report.rules.executableSuites} |
| Rules with sufficient technical tests | ${report.rules.sufficientTechnicalTests} |
| Executable test cases | ${report.rules.executableTestCases} |
| Passing executable test cases | ${report.rules.passingExecutableTestCases} |
| Mutation score | ${report.rules.mutationScore}% |
| Safety-critical mutation score | ${report.rules.safetyCriticalMutationScore}% |
| Rules pending fiscal review | ${report.rules.pendingFiscalReview} |
| Rules with resolution OPEN | ${report.rules.openResolution} |
| Source snapshots | ${report.sources.snapshots} |
| Fiscal sources verified by two reviewers | ${report.sources.verifiedFiscalSources} |
| Rules with valid primary fiscal review | ${report.rules.primaryFiscalReviews} |
| Rules with valid second fiscal review | ${report.rules.secondFiscalReviews} |
| Rules eligible for manual approval | ${report.rules.eligibleForManualApproval} |
| Approved rules | ${report.rules.approved} |
| Resolved rules | ${report.rules.resolved} |

Technical sufficiency does not constitute fiscal approval.

## Corpus and holdout

| Class | Count / state |
| --- | ---: |
| Synthetic | ${report.corpus.synthetic} |
| Official generated | ${report.corpus.officialGenerated} |
| Real anonymized | ${report.corpus.realAnonymized} |
| Engineering holdout | ${report.corpus.engineeringHoldout} |
| Independent holdout | ${report.corpus.independentHoldout} |
| Engineering holdout available | ${yesNo(report.corpus.engineeringHoldoutAvailable)} |
| Independent holdout available | ${yesNo(report.corpus.independentHoldoutAvailable)} |
| Independent holdout evaluated | ${yesNo(report.corpus.independentHoldoutEvaluated)} |
| Families | ${report.corpus.familyCount} |
| Layouts | ${report.corpus.layoutCount} |

## Runtime gate

| Measure | Value |
| --- | --- |
| All four flags false | ${yesNo(report.runtime.flagsAllFalse)} |
| Authorized exclusions | ${report.runtime.authorizedExclusions} |
| Fallback “Todos” | **${report.runtime.allModelsFallback}** |
| Fiscal mode | **${report.runtime.fiscalMode}** |
| Shadow mode | ${report.runtime.shadowMode} |
| Exclusions | ${report.runtime.exclusions} |
| Document auto-confirmation | ${report.runtime.documentAutoConfirmation} |
| Rollback application | ${report.runtime.rollbackApplicationStatus} |
| Runtime flag provider | ${report.runtime.runtimeFlagProvider} |
| Rollback deploy requirement | ${report.runtime.rollbackDeployRequirement} |

| Feature flag | Value |
| --- | --- |
${table(flagRows)}

Rollback is currently a validated fail-closed plan. A runtime flag provider has
not been configured, so no claim of deployment-free rollback is made.

## Per-rule fiscal hashes

| Rule | Pending rule hash | Approval fiscal hash |
| --- | --- | --- |
${table(hashRows)}
`;
}
