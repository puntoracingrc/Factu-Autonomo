import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const inventoryPath =
  "docs/architecture/supabase-production-schema-inventory-2026-07-24.json";
const reconciliationPath =
  "docs/architecture/central-invoice-authority-supabase-reconciliation-2026-07-24.json";

const inventory = readJson(inventoryPath);
const reconciliation = readJson(reconciliationPath);
const readinessDoc = read(
  "docs/architecture/central-invoice-authority-phase2-readiness-gates.md",
);
const runbook = read("docs/operacion/supabase-production-migration-runbook.md");
const packageJson = readJson("package.json");

const migrationVersions = readdirSync("supabase/migrations")
  .map((file) => file.match(/^(\d{14})_/)?.[1])
  .filter(Boolean)
  .sort();

const centralMigrations = readdirSync("supabase/migrations").filter((file) =>
  /central_invoice/i.test(file),
);

assert.equal(
  inventory.schemaVersion,
  "factu-supabase-production-schema-inventory-v1",
);
assert.equal(inventory.projectRef, "rnbmkkzptxbvtchluqrx");
assert.equal(inventory.environment, "production");
assert.equal(
  inventory.queryMode,
  "read-only-catalog-only-no-business-rows",
);
assert.deepEqual(inventory.schemas, ["public", "storage"]);
assert.equal(inventory.centralAuthority.tablesPresent, false);
assert.equal(inventory.centralAuthority.issueRpcPresent, false);
assert.deepEqual(inventory.centralAuthority.requiredTablesPresent, []);
assert.deepEqual(inventory.migrationHistory.liveMissingFromRepo, []);
assert.deepEqual(
  inventory.migrationHistory.repoVersionsEmbeddedInQuery,
  migrationVersions,
);

assert.equal(
  reconciliation.schemaVersion,
  "central-invoice-authority-supabase-reconciliation-v1",
);
assert.equal(reconciliation.basedOn.productionInventoryFile, inventoryPath);
assert.equal(reconciliation.project.ref, inventory.projectRef);
assert.equal(reconciliation.project.environment, inventory.environment);
assert.equal(reconciliation.queryMode, inventory.queryMode);
assert.equal(
  reconciliation.migrationReconciliation.baselineReconciledWithGit,
  false,
);
assert.deepEqual(
  reconciliation.migrationReconciliation.productionVisibleVersions,
  inventory.migrationHistory.liveVersions,
);
assert.deepEqual(
  reconciliation.migrationReconciliation.repositoryMigrationVersions,
  migrationVersions,
);
assert.deepEqual(
  reconciliation.migrationReconciliation.productionVisibleVersionsMissingFromGit,
  [],
);
assert.deepEqual(
  reconciliation.migrationReconciliation.repositoryVersionsNotVisibleInProduction,
  inventory.migrationHistory.repoNotVisibleInLive,
);
assert.equal(
  reconciliation.migrationReconciliation.classification.length,
  inventory.migrationHistory.repoNotVisibleInLive.length,
);
assert.ok(
  reconciliation.migrationReconciliation.classification.every(
    (entry) =>
      entry.status === "not_visible_in_production_migration_history" &&
      entry.action.includes("do_not_replay_against_production"),
  ),
);
assert.equal(reconciliation.centralAuthority.tablesPresent, false);
assert.equal(reconciliation.centralAuthority.issueRpcPresent, false);
assert.equal(
  reconciliation.recoveryEvidence.pitrRequiredBeforeThisReadOnlyPhase,
  false,
);
assert.equal(reconciliation.recoveryEvidence.restorableBackupVerified, false);
assert.equal(reconciliation.recoveryEvidence.isolatedRestoreDrillPassed, false);
assert.equal(reconciliation.decision, "blocked-before-additive-central-schema");
assert.match(
  reconciliation.nextAllowedStep,
  /restorable-backup-evidence-before-any-production-sql/,
);

assert.match(readinessDoc, /inventario de solo lectura/i);
assert.match(runbook, /No ejecutar SQL en produccion/i);
assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-supabase-reconciliation"
  ],
  "node scripts/validate-central-invoice-authority-supabase-reconciliation.mjs",
);
assert.deepEqual(
  centralMigrations,
  [],
  "Supabase reconciliation must not add executable central_invoice migrations.",
);

console.log("central invoice authority Supabase reconciliation: OK");
