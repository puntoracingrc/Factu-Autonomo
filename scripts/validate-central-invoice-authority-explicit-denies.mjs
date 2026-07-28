import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260728175925_central_invoice_authority_explicit_denies.sql";
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

assert.match(migration, /CENTRAL_INVOICE_AUTHORITY_EXPLICIT_DENIES_V1/);

for (const table of [
  "central_invoice_commands",
  "central_invoice_document_versions",
  "central_invoice_documents",
  "central_invoice_identities",
  "central_invoice_outbox",
  "central_invoice_series_state",
]) {
  assert.match(
    migration,
    new RegExp(
      `create policy ${table}_deny_clients_v1[\\s\\S]*?` +
        `on public\\.${table}[\\s\\S]*?` +
        "as restrictive[\\s\\S]*?" +
        "for all[\\s\\S]*?" +
        "to anon, authenticated[\\s\\S]*?" +
        "using \\(false\\)[\\s\\S]*?" +
        "with check \\(false\\)",
      "i",
    ),
  );
}

assert.doesNotMatch(
  migration,
  /central_invoice_event_wakeups_deny_clients_v1/i,
);
assert.doesNotMatch(migration, /\bgrant\b/i);
assert.doesNotMatch(migration, /\brevoke\b/i);
assert.doesNotMatch(migration, /\bcreate\s+table\b/i);
assert.doesNotMatch(migration, /\bcreate\s+(?:or\s+replace\s+)?function\b/i);
assert.match(postgresAcceptance, /expectedDenyPolicies/);
assert.match(postgresAcceptance, /permissive = 'RESTRICTIVE'/);
assert.match(postgresAcceptance, /roles = array\['anon', 'authenticated'\]/);
assert.match(
  restoreDrill,
  /20260728175925_central_invoice_authority_explicit_denies\.sql/,
);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-explicit-denies"],
  "node scripts/validate-central-invoice-authority-explicit-denies.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-explicit-denies/,
);

console.log("central invoice authority explicit deny policies: OK");
