#!/usr/bin/env node

import { resolve } from "node:path";
import {
  REQUIRED_TAX_CORPUS_FAMILIES,
  loadPrivateHoldoutCorpus,
  loadPublicTaxCorpus,
} from "../src/lib/tax-model-diagnostic/corpus-holdout/current-corpus.mjs";
import {
  assertHoldoutExecutionPolicy,
  summarizeTaxCorpusValidation,
} from "../src/lib/tax-model-diagnostic/corpus-holdout/runtime.mjs";

const args = new Set(process.argv.slice(2));
const holdoutRequested = args.has("--holdout");
const aggregateOnly = args.has("--aggregate-only");
const repositoryRoot = resolve(process.cwd());
const holdoutRoot = process.env.FISCAL_HOLDOUT_ROOT
  ? resolve(process.env.FISCAL_HOLDOUT_ROOT)
  : undefined;

const SAFE_ERRORS = new Set([
  "HOLDOUT_REQUIRES_AGGREGATE_ONLY",
  "HOLDOUT_JOB_NOT_AUTHORIZED",
  "HOLDOUT_ACCESS_TOKEN_MISSING",
  "HOLDOUT_CORPUS_EMPTY",
  "HOLDOUT_ROOT_MUST_BE_EXTERNAL",
  "CORPUS_SYMLINK_FORBIDDEN",
  "CORPUS_ASSET_PATH_ESCAPE",
  "PENDING29_FAMILY_NOT_MAPPED",
]);

async function main() {
  const publicRecords = await loadPublicTaxCorpus(repositoryRoot);
  let privateRecords = [];
  if (holdoutRequested) {
    assertHoldoutExecutionPolicy({
      requested: true,
      aggregateOnly,
      jobEnabled: process.env.FISCAL_HOLDOUT_JOB,
      accessToken: process.env.FISCAL_HOLDOUT_ACCESS_TOKEN,
      repositoryRoot,
      holdoutRoot,
    });
    privateRecords = await loadPrivateHoldoutCorpus(holdoutRoot);
    if (privateRecords.length === 0) throw new Error("HOLDOUT_CORPUS_EMPTY");
  }
  const report = summarizeTaxCorpusValidation(
    [...publicRecords, ...privateRecords],
    REQUIRED_TAX_CORPUS_FAMILIES,
    { holdoutEvaluated: holdoutRequested },
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
