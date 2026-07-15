#!/usr/bin/env node

import { resolve } from "node:path";
import {
  REQUIRED_TAX_CORPUS_FAMILIES,
  loadEngineeringHoldoutCorpus,
  loadIndependentHoldoutCorpus,
  loadPublicTaxCorpus,
} from "../src/lib/tax-model-diagnostic/corpus-holdout/current-corpus.mjs";
import {
  assertIndependentHoldoutExecutionPolicy,
  summarizeTaxCorpusValidation,
} from "../src/lib/tax-model-diagnostic/corpus-holdout/runtime.mjs";

const args = new Set(process.argv.slice(2));
const independentHoldoutRequested = args.has("--independent-holdout");
const aggregateOnly = args.has("--aggregate-only");
const repositoryRoot = resolve(process.cwd());
const independentHoldoutRoot = process.env.FISCAL_INDEPENDENT_HOLDOUT_ROOT
  ? resolve(process.env.FISCAL_INDEPENDENT_HOLDOUT_ROOT)
  : undefined;

const SAFE_ERRORS = new Set([
  "INDEPENDENT_HOLDOUT_REQUIRES_AGGREGATE_ONLY",
  "INDEPENDENT_HOLDOUT_JOB_NOT_AUTHORIZED",
  "INDEPENDENT_HOLDOUT_ACCESS_TOKEN_MISSING",
  "INDEPENDENT_HOLDOUT_CORPUS_EMPTY",
  "INDEPENDENT_HOLDOUT_ROOT_MUST_BE_EXTERNAL",
  "CORPUS_CREATED_AT_MISSING",
  "CORPUS_SYMLINK_FORBIDDEN",
  "CORPUS_ASSET_PATH_ESCAPE",
  "PENDING29_FAMILY_NOT_MAPPED",
]);

async function main() {
  const publicRecords = await loadPublicTaxCorpus(repositoryRoot);
  const engineeringRecords = await loadEngineeringHoldoutCorpus(repositoryRoot);
  let independentRecords = [];
  if (independentHoldoutRequested) {
    assertIndependentHoldoutExecutionPolicy({
      requested: true,
      aggregateOnly,
      jobEnabled: process.env.FISCAL_INDEPENDENT_HOLDOUT_JOB,
      accessToken: process.env.FISCAL_INDEPENDENT_HOLDOUT_ACCESS_TOKEN,
      repositoryRoot,
      holdoutRoot: independentHoldoutRoot,
    });
    independentRecords = await loadIndependentHoldoutCorpus(
      independentHoldoutRoot,
    );
    if (independentRecords.length === 0) {
      throw new Error("INDEPENDENT_HOLDOUT_CORPUS_EMPTY");
    }
  }
  const report = summarizeTaxCorpusValidation(
    [...publicRecords, ...engineeringRecords, ...independentRecords],
    REQUIRED_TAX_CORPUS_FAMILIES,
    { independentHoldoutEvaluated: independentHoldoutRequested },
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "";
  const code = SAFE_ERRORS.has(message) ? message : "CORPUS_VALIDATION_FAILED";
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
});
