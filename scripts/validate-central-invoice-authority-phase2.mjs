import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function runBin(bin, args) {
  execFileSync(bin, args, {
    encoding: "utf8",
    stdio: "pipe",
  });
}

const marker = "CENTRAL_INVOICE_AUTHORITY_PHASE2_READINESS_GATES_V1";
const readinessDoc = read(
  "docs/architecture/central-invoice-authority-phase2-readiness-gates.md",
);
const readinessEvidence = readJson(
  "docs/architecture/central-invoice-authority-production-readiness-2026-07-23.json",
);
const baseline = readJson(
  "docs/architecture/central-invoice-authority-production-baseline-2026-07-23.json",
);
const adr = read("docs/architecture/ADR-0010-central-invoice-authority.md");
const schema = read("docs/architecture/central-invoice-authority-schema-v1.md");
const runbook = read("docs/operacion/supabase-production-migration-runbook.md");
const readiness = read("src/lib/central-invoice-authority/readiness.ts");
const codeowners = read(".github/CODEOWNERS");
const packageJson = readJson("package.json");

assert.equal(readinessEvidence.schemaVersion, "central-invoice-authority-production-readiness-v1");
assert.equal(readinessEvidence.marker, marker);
assert.equal(readinessEvidence.basedOn.productionBaselineFile, "docs/architecture/central-invoice-authority-production-baseline-2026-07-23.json");
assert.equal(readinessEvidence.project.ref, baseline.project.ref);
assert.deepEqual(
  readinessEvidence.migrationReconciliation.productionVisibleVersions,
  baseline.migrationHistory.visibleVersions,
);
assert.equal(readinessEvidence.migrationReconciliation.baselineReconciledWithGit, false);
assert.equal(readinessEvidence.recoveryEvidence.pitrRequiredByArchitecture, false);
assert.equal(readinessEvidence.recoveryEvidence.restorableBackupVerified, false);
assert.equal(readinessEvidence.recoveryEvidence.isolatedRestoreDrillPassed, false);
assert.equal(readinessEvidence.activation.centralInvoiceAuthorityMode, "off");
assert.equal(readinessEvidence.activation.productionMigrationApproved, false);
assert.equal(readinessEvidence.centralAuthority.tablesPresent, false);
assert.equal(readinessEvidence.centralAuthority.issueRpcPresent, false);
assert.equal(readinessEvidence.decision, "blocked-before-additive-central-schema");

for (const body of [readinessDoc, readiness]) {
  assert.match(body, new RegExp(marker));
}

assert.match(adr, /PITR es recomendable, no obligatorio/i);
assert.match(adr, /restauracion ensayada/i);
assert.match(schema, /no puede recibir esta base hasta que/i);
assert.match(schema, /copia se haya restaurado/i);
assert.match(runbook, /No ejecutar SQL en produccion/i);
assert.match(readiness, /production_baseline_not_reconciled/);
assert.match(readiness, /restorable_backup_not_verified/);
assert.match(readiness, /isolated_restore_drill_missing/);
assert.match(readiness, /unexpected_pitr_requirement/);
assert.match(codeowners, /central-invoice-authority/);
assert.equal(
  packageJson.scripts["validate:central-invoice-authority-phase2"],
  "node scripts/validate-central-invoice-authority-phase2.mjs",
);

const centralMigrations = readdirSync("supabase/migrations").filter((file) =>
  /central_invoice/i.test(file),
);
const migrationVersions = new Set(
  readdirSync("supabase/migrations")
    .map((file) => file.match(/^(\d{14})_/)?.[1])
    .filter(Boolean),
);
const productionVersionsMissingFromGit =
  baseline.migrationHistory.visibleVersions.filter(
    (version) => !migrationVersions.has(version),
  );

assert.deepEqual(
  productionVersionsMissingFromGit,
  readinessEvidence.migrationReconciliation
    .productionVisibleVersionsMissingFromGit,
);
assert.deepEqual(
  centralMigrations,
  [],
  "Phase 2 must not add executable central_invoice migrations before readiness gates pass.",
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/readiness.test.ts",
]);

console.log("central invoice authority phase 2 readiness contract: OK");
