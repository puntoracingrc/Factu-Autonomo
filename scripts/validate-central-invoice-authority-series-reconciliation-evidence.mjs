import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const evidencePath =
  "docs/architecture/central-invoice-authority-series-reconciliation-evidence-2026-07-28.json";
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

assert.equal(
  evidence.marker,
  "CENTRAL_INVOICE_AUTHORITY_SERIES_RECONCILIATION_EVIDENCE_V1",
);
assert.equal(evidence.project.ref, "rnbmkkzptxbvtchluqrx");
assert.equal(evidence.project.environment, "production");
assert.match(evidence.source.repoMainCommit, /^[0-9a-f]{40}$/);
assert.match(evidence.source.migrationVersion, /^\d{14}$/);
assert.equal(
  evidence.source.migrationName,
  "central_invoice_authority_series_reconciliation",
);
assert.equal(evidence.source.businessRowsCopied, false);
assert.equal(evidence.source.emailRecorded, false);
assert.match(evidence.source.userScopeHash, /^sha256:[0-9a-f]{64}$/);
assert.match(evidence.source.issuerNifHash, /^sha256:[0-9a-f]{64}$/);

for (const [key, expected] of Object.entries({
  tableExists: true,
  rlsEnabled: true,
  restrictiveClientDenyPolicies: 1,
  serviceRoleCanSelectEvidence: true,
  serviceRoleCanInsertEvidence: false,
  serviceRoleCanUpdateEvidence: false,
  serviceRoleCanDeleteEvidence: false,
  serviceRoleCanTruncateEvidence: false,
  anonCanSelectEvidence: false,
  authenticatedCanSelectEvidence: false,
  serviceRoleCanExecuteReconciliation: true,
  anonCanExecuteReconciliation: false,
  authenticatedCanExecuteReconciliation: false,
  immutableTriggers: 2,
  identityBaselineTrigger: true,
})) {
  assert.equal(evidence.catalogReadback[key], expected);
}

assert.deepEqual(
  evidence.series.map((series) => ({
    environment: series.environment,
    seriesCode: series.seriesCode,
    fiscalYear: series.fiscalYear,
    observedMaxSequence: series.observedMaxSequence,
    resultingSequence: series.resultingSequence,
    stateVersion: series.stateVersion,
    reconciliationRows: series.reconciliationRows,
  })),
  [
    {
      environment: "test",
      seriesCode: "F-2026",
      fiscalYear: 2026,
      observedMaxSequence: 2954,
      resultingSequence: 2954,
      stateVersion: 1,
      reconciliationRows: 1,
    },
    {
      environment: "test",
      seriesCode: "FR-2026",
      fiscalYear: 2026,
      observedMaxSequence: 1,
      resultingSequence: 1,
      stateVersion: 1,
      reconciliationRows: 1,
    },
  ],
);
for (const series of evidence.series) {
  assert.match(series.sourceDigest, /^sha256:[0-9a-f]{64}$/);
  assert.ok(series.sourceDocumentCount >= 0);
  assert.ok(series.resultingSequence >= series.observedMaxSequence);
  assert.ok(series.resultingSequence >= series.previousSequence);
}

assert.equal(evidence.rollbackDryRun.allocatedFullNumber, "F-2026-2955");
assert.equal(evidence.rollbackDryRun.allocatedSequence, 2955);
assert.equal(evidence.rollbackDryRun.transactionRolledBack, true);
assert.equal(evidence.rollbackDryRun.lastSequenceAfterRollback, 2954);
for (const key of [
  "centralDocumentsAfterRollback",
  "centralIdentitiesAfterRollback",
  "centralCommandsAfterRollback",
  "centralOutboxAfterRollback",
  "centralWakeupsAfterRollback",
]) {
  assert.equal(evidence.rollbackDryRun[key], 0);
}

assert.equal(evidence.advisors.centralSecurityWarnings, 0);
assert.equal(evidence.advisors.centralPerformanceWarnings, 0);
assert.equal(
  evidence.advisors.newCentralPerformanceInfosAreOnlyUnusedIndexesOnEmptyTables,
  true,
);
assert.equal(evidence.activationBoundary.centralAuthorityModeDuringEvidence, "off");
assert.equal(evidence.activationBoundary.legacyCloudSyncReactivated, false);
assert.equal(evidence.activationBoundary.fiscalIdentityPersisted, false);
assert.equal(evidence.activationBoundary.requiredModeEnabled, false);
assert.equal(evidence.result, "ready_for_test_only_canary_activation");

assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-series-reconciliation-evidence"
  ],
  "node scripts/validate-central-invoice-authority-series-reconciliation-evidence.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-series-reconciliation-evidence/,
);

console.log(
  "central invoice authority series reconciliation production evidence: READY",
);
