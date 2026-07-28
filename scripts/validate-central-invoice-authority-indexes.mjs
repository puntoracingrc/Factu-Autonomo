import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260728172000_central_invoice_authority_indexes.sql";
const migration = readFileSync(migrationPath, "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

for (const required of [
  "CENTRAL_INVOICE_AUTHORITY_INDEXES_V1",
  "central_invoice_documents_identity_uidx",
  "central_invoice_identities_rectifies_idx",
  "central_invoice_commands_result_document_idx",
  "central_invoice_commands_result_identity_idx",
  "central_invoice_commands_result_outbox_idx",
  "central_invoice_outbox_document_idx",
  "central_invoice_outbox_identity_idx",
  "central_invoice_outbox_user_cursor_idx",
  "on public.central_invoice_outbox (user_id, created_at, id)",
]) {
  assert.match(
    migration,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /\bdrop\b/i,
  /\btruncate\b/i,
  /\bdelete\b/i,
  /\bupdate\b/i,
  /\binsert\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bcreate\s+table\b/i,
  /\bcreate\s+(?:or\s+replace\s+)?function\b/i,
]) {
  assert.doesNotMatch(migration, forbidden);
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-indexes"],
  "node scripts/validate-central-invoice-authority-indexes.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-indexes/,
);

console.log("central invoice authority indexes: OK");
