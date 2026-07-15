#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildFiscalApprovalHashRegistry,
  buildFiscalReadiness,
  buildFiscalReviewBundle,
  loadFiscalApprovalState,
  validateFiscalRollbackInfrastructure,
  validateFiscalShadowInfrastructure,
  validateReviewBundle,
} from "./core.mjs";
import { ROOT } from "./rule-source.mjs";

const command = process.argv[2];

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function failIfErrors(contractVersion, errors, summary = {}) {
  const report = {
    contractVersion,
    status: errors.length === 0 ? "PASS" : "FAIL",
    ...summary,
    errors,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (errors.length > 0) process.exitCode = 1;
}

function readiness() {
  const report = buildFiscalReadiness(loadFiscalApprovalState());
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== "PASS") process.exitCode = 1;
}

function reviewBundle() {
  const batch = option("--batch", "COMMON_AUTONOMOUS_V1");
  const output = join(
    ROOT,
    "docs/fiscal/review-batches",
    `${batch}.json`,
  );
  const state = loadFiscalApprovalState();
  const bundle = buildFiscalReviewBundle(state, batch);
  const approvalRegistry = buildFiscalApprovalHashRegistry(state);
  const approvalRegistryOutput = join(
    ROOT,
    "docs/fiscal/approval/fiscal-approval-registry.v1.json",
  );
  const errors = validateReviewBundle(bundle);
  if (errors.length > 0) {
    failIfErrors("fiscal-review-bundle-validation.v1", errors, { batch });
    return;
  }
  const content = `${JSON.stringify(bundle, null, 2)}\n`;
  const approvalRegistryContent = `${JSON.stringify(
    approvalRegistry,
    null,
    2,
  )}\n`;
  if (process.argv.includes("--check")) {
    if (
      !existsSync(output) ||
      readFileSync(output, "utf8") !== content ||
      !existsSync(approvalRegistryOutput) ||
      readFileSync(approvalRegistryOutput, "utf8") !== approvalRegistryContent
    ) {
      failIfErrors("fiscal-review-bundle-validation.v1", ["REVIEW_BUNDLE_DRIFT"], {
        batch,
      });
      return;
    }
  } else {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content, "utf8");
    mkdirSync(dirname(approvalRegistryOutput), { recursive: true });
    writeFileSync(approvalRegistryOutput, approvalRegistryContent, "utf8");
  }
  failIfErrors("fiscal-review-bundle-validation.v1", [], {
    batch,
    output: output.slice(ROOT.length + 1),
    ruleCount: bundle.ruleCount,
    approvalCount: bundle.approvalCount,
    authorizedExclusionCount: bundle.authorizedExclusionCount,
    approvalHashRuleCount: approvalRegistry.ruleCount,
    materialSourceReferenceCount:
      approvalRegistry.materialSourceReferenceCount,
    missingMaterialSourceHashCount:
      approvalRegistry.missingMaterialSourceHashCount,
  });
}

function approvalValidate() {
  const state = loadFiscalApprovalState();
  const readinessReport = buildFiscalReadiness(state);
  const bundle = buildFiscalReviewBundle(state, "COMMON_AUTONOMOUS_V1");
  const approvalRegistry = buildFiscalApprovalHashRegistry(state);
  const output = join(
    ROOT,
    "docs/fiscal/review-batches/COMMON_AUTONOMOUS_V1.json",
  );
  const expected = `${JSON.stringify(bundle, null, 2)}\n`;
  const registryOutput = join(
    ROOT,
    "docs/fiscal/approval/fiscal-approval-registry.v1.json",
  );
  const expectedRegistry = `${JSON.stringify(approvalRegistry, null, 2)}\n`;
  const errors = [
    ...readinessReport.errors,
    ...validateReviewBundle(bundle),
  ];
  if (!existsSync(output) || readFileSync(output, "utf8") !== expected) {
    errors.push("REVIEW_BUNDLE_DRIFT");
  }
  if (
    !existsSync(registryOutput) ||
    readFileSync(registryOutput, "utf8") !== expectedRegistry
  ) {
    errors.push("FISCAL_APPROVAL_REGISTRY_DRIFT");
  }
  failIfErrors("fiscal-approval-validation.v1", [...new Set(errors)].sort(), {
    pendingRules: readinessReport.pendingRules,
    openRules: readinessReport.openRules,
    primaryFiscalReviews: readinessReport.primaryFiscalReviews,
    secondFiscalReviews: readinessReport.secondFiscalReviews,
    approvedRules: readinessReport.approvedRules,
    resolvedRules: readinessReport.resolvedRules,
    authorizedExclusions: readinessReport.authorizedExclusions,
    approvalHashRules: approvalRegistry.ruleCount,
    materialSourceReferenceCount:
      approvalRegistry.materialSourceReferenceCount,
    missingMaterialSourceHashCount:
      approvalRegistry.missingMaterialSourceHashCount,
  });
}

function shadowValidate() {
  const state = loadFiscalApprovalState();
  failIfErrors(
    "fiscal-shadow-validation.v1",
    validateFiscalShadowInfrastructure(state),
    {
      fiscal_rules_shadow_mode: state.flags.fiscal_rules_shadow_mode,
      userInterfaceMutated: false,
      calendarMutated: false,
      storedAssessmentMutated: false,
      aggregateMetricsOnly: true,
    },
  );
}

function rollbackValidate() {
  const state = loadFiscalApprovalState();
  failIfErrors(
    "fiscal-rollback-validation.v1",
    validateFiscalRollbackInfrastructure(state),
    {
      flags: state.flags,
      allModelsFallback: "ENABLED",
      preservesAssessmentHistory: true,
      preservesApprovalAudit: true,
      deployRequired: false,
    },
  );
}

switch (command) {
  case "readiness":
    readiness();
    break;
  case "review-bundle":
    reviewBundle();
    break;
  case "approval:validate":
    approvalValidate();
    break;
  case "shadow:validate":
    shadowValidate();
    break;
  case "rollback:validate":
    rollbackValidate();
    break;
  default:
    process.stderr.write(`UNKNOWN_FISCAL_APPROVAL_COMMAND:${command ?? ""}\n`);
    process.exitCode = 1;
}
