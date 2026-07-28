import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260728213000_central_invoice_authority_series_reconciliation.sql";
const migration = readFileSync(migrationPath, "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const postgresAcceptance = readFileSync(
  "scripts/test-central-invoice-authority-postgres.mjs",
  "utf8",
);
const restoreDrill = readFileSync(
  "scripts/test-central-invoice-authority-restore-drill.mjs",
  "utf8",
);

for (const required of [
  "CENTRAL_INVOICE_AUTHORITY_SERIES_RECONCILIATION_V1",
  "central_invoice_series_reconciliations",
  "reconcile_central_invoice_series_v1",
  "central_invoice_authority_require_series_reconciliation_v1",
  "central invoice series baseline not reconciled",
  "pg_advisory_xact_lock",
  "for update",
  "greatest",
  "resulting_sequence >= previous_sequence",
  "resulting_sequence >= observed_max_sequence",
  "series reconciliation idempotency key reused with different request",
  "revoke all on table public.central_invoice_series_reconciliations",
  "grant select on table public.central_invoice_series_reconciliations",
  "as restrictive",
  "using (false)",
  "with check (false)",
  "before update or delete",
  "before truncate",
  "before insert on public.central_invoice_identities",
  "from public, anon, authenticated",
  "to service_role",
]) {
  assert.match(
    migration,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /\bgrant\s+(?:insert|update|delete|truncate)\b[\s\S]*\bto\s+service_role\b/i,
  /\bto\s+(?:anon|authenticated)\b[\s\S]*\busing\s*\(true\)/i,
  /\bdelete\s+from\b/i,
  /\btruncate\s+table\b/i,
  /\bdrop\s+table\b/i,
]) {
  assert.doesNotMatch(migration, forbidden);
}

assert.match(postgresAcceptance, /reconcileSql/);
assert.match(postgresAcceptance, /central invoice series baseline not reconciled/i);
assert.match(postgresAcceptance, /\[2955, 2956\]/);
assert.match(
  restoreDrill,
  /20260728213000_central_invoice_authority_series_reconciliation\.sql/,
);

assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-series-reconciliation"
  ],
  "node scripts/validate-central-invoice-authority-series-reconciliation.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-series-reconciliation/,
);

console.log("central invoice authority series reconciliation: OK");
