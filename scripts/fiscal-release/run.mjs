#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadEngineeringHoldoutCorpus,
  loadPublicTaxCorpus,
  REQUIRED_TAX_CORPUS_FAMILIES,
} from "../../src/lib/tax-model-diagnostic/corpus-holdout/current-corpus.mjs";
import { summarizeTaxCorpusValidation } from "../../src/lib/tax-model-diagnostic/corpus-holdout/runtime.mjs";
import {
  buildFiscalApprovalHashRegistry,
  buildFiscalReadiness,
  loadFiscalApprovalState,
} from "../fiscal-approval/core.mjs";
import { ROOT } from "../fiscal-approval/rule-source.mjs";
import { validateState as validateFiscalSourceState } from "../fiscal-sources/cli-core.mjs";
import {
  readCurrentOfficialSources,
  readCurrentRuleInventory,
  sourceRuleAssociations,
} from "../fiscal-sources/registry-source.mjs";
import {
  buildFiscalReleaseSnapshot,
  renderFiscalReleaseReport,
} from "./core.mjs";

const OUTPUT = join(ROOT, "docs/fiscal/release-report.md");

function git(...args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

function recordedSourceSha() {
  if (!existsSync(OUTPUT)) return null;
  const match = readFileSync(OUTPUT, "utf8").match(
    /<!-- validated-source-sha:([0-9a-f]{40}) -->/,
  );
  return match?.[1] ?? null;
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

async function main() {
  const check = process.argv.includes("--check");
  const currentHead = git("rev-parse", "HEAD");
  const validatedSourceSha =
    option("--source-sha") ?? recordedSourceSha() ?? currentHead;
  try {
    git("merge-base", "--is-ancestor", validatedSourceSha, currentHead);
  } catch {
    throw new Error("VALIDATED_SOURCE_SHA_IS_NOT_ANCESTOR");
  }

  const state = loadFiscalApprovalState();
  const readiness = buildFiscalReadiness(state);
  const approvalRegistry = buildFiscalApprovalHashRegistry(state);
  const storedApprovalRegistry = JSON.parse(
    readFileSync(
      join(
        ROOT,
        "docs/fiscal/approval/fiscal-approval-registry.v1.json",
      ),
      "utf8",
    ),
  );
  if (
    JSON.stringify(storedApprovalRegistry) !==
    JSON.stringify(approvalRegistry)
  ) {
    throw new Error("FISCAL_APPROVAL_REGISTRY_DRIFT");
  }
  const sourceInventory = readCurrentRuleInventory();
  const currentSources = readCurrentOfficialSources();
  const sourceErrors = validateFiscalSourceState({
    root: ROOT,
    registry: state.sources,
    reviews: state.reviews,
    currentSources,
    inventory: sourceInventory,
    associations: sourceRuleAssociations(sourceInventory),
  });
  if (sourceErrors.length > 0) {
    throw new Error(
      `FISCAL_SOURCE_VALIDATION_FAILED:${sourceErrors.join(",")}`,
    );
  }
  const publicRecords = await loadPublicTaxCorpus(ROOT);
  const engineeringRecords = await loadEngineeringHoldoutCorpus(ROOT);
  const corpus = summarizeTaxCorpusValidation(
    [...publicRecords, ...engineeringRecords],
    REQUIRED_TAX_CORPUS_FAMILIES,
    { independentHoldoutEvaluated: false },
  );
  const report = buildFiscalReleaseSnapshot({
    validatedSourceSha,
    inventory: state.inventory,
    sourceRegistry: state.sources,
    approvalRegistry,
    readiness,
    corpus,
  });
  if (report.status !== "PASS") {
    throw new Error(`FISCAL_RELEASE_REPORT_BLOCKED:${report.errors.join(",")}`);
  }
  const content = renderFiscalReleaseReport(report);
  if (check) {
    if (!existsSync(OUTPUT) || readFileSync(OUTPUT, "utf8") !== content) {
      throw new Error("FISCAL_RELEASE_REPORT_DRIFT");
    }
  } else {
    writeFileSync(OUTPUT, content, "utf8");
  }
  process.stdout.write(`${JSON.stringify({
    contractVersion: report.contractVersion,
    status: report.status,
    output: "docs/fiscal/release-report.md",
    validatedSourceSha: report.validatedSourceSha,
    rules: report.rules.total,
    executableSuites: report.rules.executableSuites,
    sufficientTechnicalTests: report.rules.sufficientTechnicalTests,
    sourceSnapshots: report.sources.snapshots,
    verifiedFiscalSources: report.sources.verifiedFiscalSources,
    approvedRules: report.rules.approved,
    resolvedRules: report.rules.resolved,
    authorizedExclusions: report.runtime.authorizedExclusions,
    allModelsFallback: report.runtime.allModelsFallback,
    fiscalMode: report.runtime.fiscalMode,
    errors: report.errors,
  }, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
