import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const path =
  "docs/architecture/central-invoice-authority-production-cutover-2026-07-28.json";
const cutover = JSON.parse(readFileSync(path, "utf8"));
const classification = JSON.parse(
  readFileSync(
    "docs/architecture/central-invoice-authority-migration-gap-operational-classification-2026-07-25.json",
    "utf8",
  ),
);
const recovery = JSON.parse(
  readFileSync(
    "docs/architecture/central-invoice-authority-recovery-evidence-2026-07-28.json",
    "utf8",
  ),
);
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

assert.equal(
  cutover.marker,
  "CENTRAL_INVOICE_AUTHORITY_PRODUCTION_CUTOVER_V1",
);
assert.equal(cutover.project.ref, "rnbmkkzptxbvtchluqrx");
assert.deepEqual(
  cutover.productionCatalog.visibleVersionsMissingFromGit,
  [],
);
assert.deepEqual(cutover.productionCatalog.centralTablesBeforeCutover, []);
assert.deepEqual(cutover.productionCatalog.centralFunctionsBeforeCutover, []);
assert.equal(cutover.productionCatalog.pgcryptoInExtensions, true);
assert.equal(cutover.productionCatalog.serviceRoleExists, true);
assert.equal(cutover.productionCatalog.authRoleExists, true);
assert.equal(cutover.productionCatalog.authUidExists, true);
assert.equal(cutover.productionCatalog.realtimePublicationExists, true);
assert.equal(cutover.productionCatalog.businessRowsRead, false);

assert.equal(
  cutover.baselineDecision.repositoryHistoryFullyReconciled,
  false,
);
assert.equal(
  cutover.baselineDecision.centralAuthorityBaselineAccepted,
  true,
);
assert.equal(
  cutover.baselineDecision.classifiedLegacyGapEntries,
  classification.entries.length,
);
assert.equal(cutover.baselineDecision.legacyGapAppliedOrReplayed, false);
assert.equal(
  cutover.baselineDecision.legacyVerifactuRolloutRemainsBlocked,
  true,
);
assert.equal(recovery.productionBackup.result, "restorable_backup_verified");
assert.equal(recovery.isolatedRestoreDrill.result, "passed");

assert.equal(cutover.approvedMigrations.length, 7);
assert.equal(new Set(cutover.approvedMigrations).size, 7);
for (const migration of cutover.approvedMigrations) {
  assert.match(migration, /^\d{14}_central_invoice_authority_[a-z0-9_]+\.sql$/);
  assert.doesNotThrow(() =>
    readFileSync(`supabase/migrations/${migration}`, "utf8"),
  );
}

assert.equal(cutover.safetyBoundary.fiscalWriteGatesDuringMigration, false);
assert.equal(cutover.safetyBoundary.existingCloudSyncReactivated, false);
assert.equal(cutover.safetyBoundary.existingBusinessRowsMutated, false);
assert.match(
  cutover.safetyBoundary.failureAfterCanaryWrite,
  /never drop or renumber issued identities/i,
);
assert.equal(cutover.approval.humanApprovalRecorded, true);
assert.equal(cutover.approval.requiredModeApproved, false);
assert.equal(
  cutover.decision,
  "approved_to_apply_exact_additive_central_schema_with_fiscal_writes_disabled",
);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-production-cutover"],
  "node scripts/validate-central-invoice-authority-production-cutover.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-production-cutover/,
);

console.log("central invoice authority production cutover: APPROVED");
