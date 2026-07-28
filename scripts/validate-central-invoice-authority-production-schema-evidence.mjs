import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const evidencePath =
  "docs/architecture/central-invoice-authority-production-schema-evidence-2026-07-28.json";
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

assert.equal(
  evidence.marker,
  "CENTRAL_INVOICE_AUTHORITY_PRODUCTION_SCHEMA_EVIDENCE_V1",
);
assert.equal(evidence.project.ref, "rnbmkkzptxbvtchluqrx");
assert.equal(evidence.project.environment, "production");
assert.match(evidence.source.repoMainCommit, /^[0-9a-f]{40}$/);
assert.equal(evidence.source.businessRowsRead, false);

assert.equal(evidence.appliedMigrations.length, 8);
assert.equal(
  new Set(evidence.appliedMigrations.map(({ version }) => version)).size,
  8,
);
assert.equal(
  new Set(evidence.appliedMigrations.map(({ name }) => name)).size,
  8,
);
for (const migration of evidence.appliedMigrations) {
  assert.match(migration.version, /^\d{14}$/);
  assert.match(migration.name, /^central_invoice_authority_[a-z0-9_]+$/);
}

assert.equal(evidence.catalog.tables, 7);
assert.equal(evidence.catalog.tablesWithRls, evidence.catalog.tables);
assert.equal(evidence.catalog.policies, 7);
assert.equal(evidence.catalog.explicitRestrictiveClientDenies, 6);
assert.equal(evidence.catalog.ownerScopedRealtimeReadPolicies, 1);
assert.equal(evidence.catalog.serviceRoleOnlyFunctions, 5);
assert.equal(evidence.catalog.indexes, 29);
assert.equal(evidence.catalog.triggers, 2);
assert.deepEqual(evidence.catalog.realtimeTables, [
  "central_invoice_event_wakeups",
]);
assert.equal(evidence.catalog.immutableIdentityServiceRoleCanUpdate, false);
assert.equal(evidence.catalog.immutableIdentityServiceRoleCanDelete, false);
assert.equal(evidence.catalog.immutableIdentityServiceRoleCanTruncate, false);

assert.deepEqual(Object.keys(evidence.safeCounts).sort(), [
  "central_invoice_commands",
  "central_invoice_document_versions",
  "central_invoice_documents",
  "central_invoice_event_wakeups",
  "central_invoice_identities",
  "central_invoice_outbox",
  "central_invoice_series_state",
]);
assert.equal(
  Object.values(evidence.safeCounts).every((count) => count === 0),
  true,
);

assert.equal(evidence.advisors.centralSecurityWarnings, 0);
assert.equal(evidence.advisors.centralSecurityInfos, 0);
assert.equal(evidence.advisors.centralPerformanceWarnings, 0);
assert.equal(
  evidence.advisors.centralPerformanceInfosAreOnlyUnusedIndexesOnEmptyTables,
  true,
);
assert.match(evidence.advisors.securityRemediationReference, /^https:\/\/supabase\.com\//);
assert.match(
  evidence.advisors.performanceRemediationReference,
  /^https:\/\/supabase\.com\//,
);

assert.equal(evidence.browserReadback.emailRecorded, false);
assert.equal(evidence.browserReadback.checksReady, 8);
assert.equal(evidence.browserReadback.checksBlocked, 0);
assert.equal(evidence.browserReadback.serverReady, true);
assert.equal(evidence.browserReadback.canaryRequested, false);
assert.equal(evidence.browserReadback.fiscalWritesEnabled, false);

assert.equal(evidence.activationBoundary.legacyCloudSyncReactivated, false);
assert.equal(evidence.activationBoundary.canaryFiscalWritesEnabled, false);
assert.equal(evidence.activationBoundary.requiredModeEnabled, false);
assert.equal(evidence.result, "production_schema_ready_writes_disabled");

assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-production-schema-evidence"
  ],
  "node scripts/validate-central-invoice-authority-production-schema-evidence.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-production-schema-evidence/,
);

console.log("central invoice authority production schema evidence: READY");
