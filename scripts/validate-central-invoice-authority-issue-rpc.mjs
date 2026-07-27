import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const marker = "CENTRAL_INVOICE_AUTHORITY_ISSUE_RPC_V1";
const migrationPath =
  "supabase/migrations/20260727181804_central_invoice_authority_issue_rpc.sql";
const migration = read(migrationPath);
const doc = read("docs/architecture/central-invoice-authority-issue-rpc-v1.md");
const packageJson = JSON.parse(read("package.json"));
const body = `${migration}\n${doc}`;

for (const required of [
  marker,
  "create or replace function public.issue_central_invoice_v1",
  "security definer",
  "set search_path = ''",
  "auth.role() <> 'service_role'",
  "on conflict (user_id, idempotency_key_hash)",
  "for update",
  "central_invoice_commands",
  "central_invoice_documents",
  "central_invoice_series_state",
  "central_invoice_identities",
  "central_invoice_document_versions",
  "central_invoice_outbox",
  "revoke all on function public.issue_central_invoice_v1",
  "from public, anon, authenticated",
  "grant execute on function public.issue_central_invoice_v1",
  "to service_role",
  "'replayed'::text",
  "'committed'::text",
]) {
  assert.match(body, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

for (const forbidden of [
  /\bgrant\s+execute\s+on\s+function\s+public\.issue_central_invoice_v1[\s\S]*\bto\s+(?:anon|authenticated)\b/i,
  /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\s+public\.(?!central_invoice_)/i,
  /\binsert\s+into\s+public\.(?!central_invoice_)/i,
  /\buser_backups\b/i,
  /\bsync_entities\b/i,
  /<\?xml/i,
  /%PDF/i,
]) {
  assert.doesNotMatch(migration, forbidden, `Forbidden issue RPC SQL: ${forbidden}`);
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-issue-rpc"],
  "node scripts/validate-central-invoice-authority-issue-rpc.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-issue-rpc/,
);

console.log("central invoice authority issue RPC: OK");
