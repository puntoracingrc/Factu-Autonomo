import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function runBin(bin, args) {
  execFileSync(bin, args, {
    encoding: "utf8",
    stdio: "pipe",
  });
}

const marker = "CENTRAL_INVOICE_AUTHORITY_LEDGER_SCHEMA_V1";
const migrationPath =
  "supabase/migrations/20260727175229_central_invoice_authority_ledger_schema.sql";
const migration = read(migrationPath);
const doc = read("docs/architecture/central-invoice-authority-ledger-schema-v1.md");
const packageJson = JSON.parse(read("package.json"));
const body = `${migration}\n${doc}`;

for (const required of [
  marker,
  "central_invoice_documents",
  "central_invoice_document_versions",
  "central_invoice_series_state",
  "central_invoice_identities",
  "central_invoice_commands",
  "central_invoice_outbox",
  "central_invoice_identities_scope_sequence_uidx",
  "central_invoice_commands_idempotency_uidx",
  "central_invoice_outbox_idempotency_uidx",
  "enable row level security",
  "revoke all on table public.central_invoice_documents from public, anon, authenticated",
  "grant all on table public.central_invoice_documents to service_role",
]) {
  assert.match(body, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

for (const table of [
  "central_invoice_documents",
  "central_invoice_document_versions",
  "central_invoice_series_state",
  "central_invoice_identities",
  "central_invoice_commands",
  "central_invoice_outbox",
]) {
  assert.match(
    migration,
    new RegExp(`alter table public\\.${table}\\s+enable row level security`, "i"),
  );
  assert.match(
    migration,
    new RegExp(
      `revoke all on table public\\.${table} from public, anon, authenticated`,
      "i",
    ),
  );
  assert.match(
    migration,
    new RegExp(`grant all on table public\\.${table} to service_role`, "i"),
  );
}

for (const forbidden of [
  /\bcreate\s+(?:or\s+replace\s+)?function\b/i,
  /\bissue_invoice_v1\b/i,
  /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\s+public\.(?!central_invoice_)/i,
  /\binsert\s+into\s+public\.(?!central_invoice_)/i,
]) {
  assert.doesNotMatch(migration, forbidden, `Forbidden ledger schema SQL: ${forbidden}`);
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-ledger-schema"],
  "node scripts/validate-central-invoice-authority-ledger-schema.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-ledger-schema/,
);

runBin("node", ["scripts/check-supabase-migrations.mjs"]);

console.log("central invoice authority ledger schema: OK");
