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
const allowedLocalLedgerSchemaMigration =
  "20260727175229_central_invoice_authority_ledger_schema.sql";
const allowedLocalIssueRpcMigration =
  "20260727181804_central_invoice_authority_issue_rpc.sql";
const allowedMaterializedSnapshotMigration =
  "20260727190823_central_invoice_authority_materialized_snapshot.sql";
const allowedOutboxPullMigration =
  "20260727193609_central_invoice_authority_outbox_pull.sql";
const allowedRealtimeWakeupsMigration =
  "20260728100752_central_invoice_authority_realtime_wakeups.sql";
const allowedCentralMigrations = new Set([
  allowedLocalLedgerSchemaMigration,
  allowedLocalIssueRpcMigration,
  allowedMaterializedSnapshotMigration,
  allowedOutboxPullMigration,
  allowedRealtimeWakeupsMigration,
]);
const unexpectedCentralMigrations = centralMigrations.filter(
  (file) => !allowedCentralMigrations.has(file),
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
  unexpectedCentralMigrations,
  [],
  "Phase 2 only allows explicitly reviewed private central authority migrations before readiness gates pass.",
);

if (centralMigrations.includes(allowedLocalLedgerSchemaMigration)) {
  const localLedgerSchema = read(
    `supabase/migrations/${allowedLocalLedgerSchemaMigration}`,
  );
  assert.match(localLedgerSchema, /CENTRAL_INVOICE_AUTHORITY_LEDGER_SCHEMA_V1/);
  assert.doesNotMatch(localLedgerSchema, /\bcreate\s+(?:or\s+replace\s+)?function\b/i);
  assert.doesNotMatch(localLedgerSchema, /\bissue_invoice_v1\b/i);
  assert.doesNotMatch(
    localLedgerSchema,
    /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  );
  assert.match(localLedgerSchema, /enable row level security/i);
}

if (centralMigrations.includes(allowedLocalIssueRpcMigration)) {
  const localIssueRpc = read(`supabase/migrations/${allowedLocalIssueRpcMigration}`);
  assert.match(localIssueRpc, /CENTRAL_INVOICE_AUTHORITY_ISSUE_RPC_V1/);
  assert.match(
    localIssueRpc,
    /\bcreate\s+or\s+replace\s+function\s+public\.issue_central_invoice_v1\b/i,
  );
  assert.match(localIssueRpc, /\bsecurity\s+definer\b/i);
  assert.match(localIssueRpc, /\bset\s+search_path\s+=\s+''/i);
  assert.match(localIssueRpc, /auth\.role\(\)\s*<>\s*'service_role'/i);
  assert.match(localIssueRpc, /\bfor\s+update\b/i);
  assert.doesNotMatch(
    localIssueRpc,
    /\bgrant\s+execute\s+on\s+function\s+public\.issue_central_invoice_v1[\s\S]*\bto\s+(?:anon|authenticated)\b/i,
  );
  assert.doesNotMatch(
    localIssueRpc,
    /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  );
  assert.doesNotMatch(localIssueRpc, /\bupdate\s+public\.(?!central_invoice_)/i);
  assert.doesNotMatch(localIssueRpc, /\binsert\s+into\s+public\.(?!central_invoice_)/i);
  assert.doesNotMatch(localIssueRpc, /\buser_backups\b/i);
  assert.doesNotMatch(localIssueRpc, /\bsync_entities\b/i);
}

if (centralMigrations.includes(allowedMaterializedSnapshotMigration)) {
  const localMaterializedSnapshot = read(
    `supabase/migrations/${allowedMaterializedSnapshotMigration}`,
  );
  assert.match(
    localMaterializedSnapshot,
    /CENTRAL_INVOICE_AUTHORITY_MATERIALIZED_SNAPSHOT_V1/,
  );
  assert.match(
    localMaterializedSnapshot,
    /central_invoice_authority_materialize_full_number_v1/,
  );
  assert.doesNotMatch(
    localMaterializedSnapshot,
    /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  );
  assert.doesNotMatch(
    localMaterializedSnapshot,
    /\bupdate\s+public\.(?!central_invoice_)/i,
  );
  assert.doesNotMatch(
    localMaterializedSnapshot,
    /\binsert\s+into\s+public\.(?!central_invoice_)/i,
  );
  assert.doesNotMatch(localMaterializedSnapshot, /\buser_backups\b/i);
  assert.doesNotMatch(localMaterializedSnapshot, /\bsync_entities\b/i);
}

if (centralMigrations.includes(allowedOutboxPullMigration)) {
  const localOutboxPull = read(
    `supabase/migrations/${allowedOutboxPullMigration}`,
  );
  assert.match(localOutboxPull, /CENTRAL_INVOICE_AUTHORITY_OUTBOX_PULL_V1/);
  assert.match(
    localOutboxPull,
    /create\s+or\s+replace\s+function\s+public\.list_central_invoice_events_v1/i,
  );
  assert.match(localOutboxPull, /\bsecurity\s+definer\b/i);
  assert.match(localOutboxPull, /\bset\s+search_path\s+=\s+''/i);
  assert.match(localOutboxPull, /auth\.role\(\)\s*<>\s*'service_role'/i);
  assert.doesNotMatch(
    localOutboxPull,
    /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  );
  assert.doesNotMatch(localOutboxPull, /\bupdate\s+public\.(?!central_invoice_)/i);
  assert.doesNotMatch(localOutboxPull, /\binsert\s+into\s+public\.(?!central_invoice_)/i);
  assert.doesNotMatch(localOutboxPull, /\buser_backups\b/i);
  assert.doesNotMatch(localOutboxPull, /\bsync_entities\b/i);
}

if (centralMigrations.includes(allowedRealtimeWakeupsMigration)) {
  const localRealtimeWakeups = read(
    `supabase/migrations/${allowedRealtimeWakeupsMigration}`,
  );
  assert.match(
    localRealtimeWakeups,
    /CENTRAL_INVOICE_AUTHORITY_REALTIME_WAKEUPS_V1/,
  );
  assert.match(
    localRealtimeWakeups,
    /create table if not exists public\.central_invoice_event_wakeups/i,
  );
  assert.match(
    localRealtimeWakeups,
    /alter table public\.central_invoice_event_wakeups enable row level security/i,
  );
  assert.match(
    localRealtimeWakeups,
    /revoke all on table public\.central_invoice_event_wakeups from public, anon, authenticated/i,
  );
  assert.match(
    localRealtimeWakeups,
    /grant select on table public\.central_invoice_event_wakeups to authenticated/i,
  );
  assert.match(
    localRealtimeWakeups,
    /create policy central_invoice_event_wakeups_owner_select_v1[\s\S]*?to authenticated[\s\S]*?auth\.uid\(\)\) = user_id/i,
  );
  assert.match(
    localRealtimeWakeups,
    /after insert on public\.central_invoice_outbox/i,
  );
  assert.match(
    localRealtimeWakeups,
    /alter publication supabase_realtime[\s\S]*?add table public\.central_invoice_event_wakeups/i,
  );
  assert.doesNotMatch(
    localRealtimeWakeups,
    /\bgrant\s+.+central_invoice_outbox.+\bto\s+(?:anon|authenticated)\b/i,
  );
  assert.doesNotMatch(
    localRealtimeWakeups,
    /alter publication supabase_realtime[\s\S]*?central_invoice_outbox/i,
  );
  assert.doesNotMatch(localRealtimeWakeups, /\bdocument_payload\b/i);
  assert.doesNotMatch(localRealtimeWakeups, /\bemitted_snapshot\b/i);
  assert.doesNotMatch(localRealtimeWakeups, /\bemitted_hash\b/i);
  assert.doesNotMatch(localRealtimeWakeups, /\bsafe_summary\b/i);
  assert.doesNotMatch(localRealtimeWakeups, /\buser_backups\b/i);
  assert.doesNotMatch(localRealtimeWakeups, /\bsync_entities\b/i);
}

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/readiness.test.ts",
]);

console.log("central invoice authority phase 2 readiness contract: OK");
