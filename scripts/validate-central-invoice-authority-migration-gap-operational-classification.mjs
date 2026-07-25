import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gapPath =
  "docs/architecture/supabase-production-migration-gap-classification-2026-07-24.json";
const operationalPath =
  "docs/architecture/central-invoice-authority-migration-gap-operational-classification-2026-07-25.json";

const classifiedStatuses = new Set([
  "partially_covered_by_catalog_inventory",
  "not_present_in_catalog_inventory",
  "catalog_limited_hardening_or_alter_only",
]);

const blockedActions = new Set([
  "blocked_until_baseline_reconciled_or_replaced_by_reviewed_central_schema",
  "blocked_for_production_until_external_fiscal_boundary_review",
  "blocked_for_production_until_sync_boundary_review",
  "explicit_product_migration_required_before_use",
  "manual_target_aware_review_required_before_apply",
]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function only(values) {
  return [...new Set(values)].sort();
}

function byFile(entries) {
  const map = new Map();
  for (const entry of entries) {
    assert(!map.has(entry.file), `Duplicate operational entry: ${entry.file}`);
    map.set(entry.file, entry);
  }
  return map;
}

const gap = readJson(gapPath);
const operational = readJson(operationalPath);

assert.equal(
  operational.schemaVersion,
  "central-invoice-authority-migration-gap-operational-classification-v1",
);
assert.equal(
  operational.decision,
  "central_authority_sql_blocked_until_baseline_reconciled_and_external_boundary_reviewed",
);
assert.equal(operational.basedOn.migrationGapClassificationFile, gapPath);
assert.equal(
  operational.basedOn.productionProjectRef,
  gap.basedOn.productionProjectRef,
);
assert.deepEqual(
  operational.scope.classifiedStatuses.slice().sort(),
  [...classifiedStatuses].sort(),
);
assert.equal(operational.scope.excludedStatus, "production_catalog_covered_not_recorded");

const expectedEntries = gap.entries.filter((entry) =>
  classifiedStatuses.has(entry.status),
);
const expectedFiles = expectedEntries.map((entry) => entry.file).sort();
const operationalFiles = operational.entries.map((entry) => entry.file).sort();

assert.equal(operational.scope.classifiedEntries, expectedEntries.length);
assert.deepEqual(
  operationalFiles,
  expectedFiles,
  "Operational classification must cover every non-covered migration gap exactly once.",
);

const entryByFile = byFile(operational.entries);
for (const gapEntry of expectedEntries) {
  const operationalEntry = entryByFile.get(gapEntry.file);
  assert(operationalEntry, `Missing operational classification for ${gapEntry.file}`);
  assert.equal(
    operationalEntry.sourceStatus,
    gapEntry.status,
    `${gapEntry.file} sourceStatus must mirror the generated gap classification.`,
  );
  assert(
    blockedActions.has(operationalEntry.productionAction),
    `${gapEntry.file} productionAction must stay blocked or explicitly reviewed.`,
  );
  assert(
    !/^apply/i.test(operationalEntry.productionAction),
    `${gapEntry.file} must not be marked as automatically applicable.`,
  );
  assert(
    operationalEntry.reason.length >= 30,
    `${gapEntry.file} needs a specific operational reason.`,
  );
}

const excluded = new Set(
  gap.entries
    .filter((entry) => entry.status === operational.scope.excludedStatus)
    .map((entry) => entry.file),
);
assert.equal(
  operational.entries.filter((entry) => excluded.has(entry.file)).length,
  0,
  "Already catalog-covered gaps must not be reclassified in this blocker report.",
);

assert.equal(
  entryByFile.get("20260623000000_base_schema.sql")?.operationalClass,
  "partial_base_schema_blocker",
);
assert.equal(
  entryByFile.get("20260623000000_base_schema.sql")?.centralAuthorityImpact,
  "blocks_any_production_sql_for_central_invoice_authority",
);

for (const file of [
  "20260624220000_phase2b_server_schema_local_staging.sql",
  "20260625070000_phase2b4d_fiscal_operation_transaction_rpc.sql",
  "20260625093000_phase2b4f_fiscal_operation_processing_rpc.sql",
  "20260625133500_phase2b4l_fiscal_record_local_persistence.sql",
  "20260625142000_phase2b4m_fiscal_record_chain_atomicity.sql",
  "20260625153000_phase2b4r_fiscal_evidence_packets_local_staging.sql",
]) {
  assert.equal(
    entryByFile.get(file)?.operationalClass,
    "local_staging_fiscal_flow_blocked",
    `${file} must remain local/staging-only before production authority review.`,
  );
}

assert.equal(
  entryByFile.get("20260626212000_phase2c20_document_sync_local_schema.sql")
    ?.operationalClass,
  "local_staging_sync_blocked",
);
assert.equal(
  entryByFile.get("20260628223000_verifactu_chain_previous_invoice.sql")
    ?.centralAuthorityImpact,
  "blocked_by_missing_verifactu_chain_state_baseline_object",
);

const classes = new Set(operational.operationalClasses.map((entry) => entry.class));
assert.deepEqual(
  only(operational.entries.map((entry) => entry.operationalClass)),
  only(classes),
  "Every used operational class must be declared in operationalClasses.",
);

console.log(
  `central-invoice-authority migration gap operational classification OK: ${operational.entries.length} entries remain blocked or explicitly reviewed`,
);
