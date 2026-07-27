import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const marker = "CENTRAL_INVOICE_AUTHORITY_MATERIALIZED_SNAPSHOT_V1";
const migrationPath =
  "supabase/migrations/20260727190823_central_invoice_authority_materialized_snapshot.sql";
const migration = read(migrationPath);
const doc = read(
  "docs/architecture/central-invoice-authority-materialized-snapshot-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${migration}\n${doc}`;
const materializerDefinition = migration.match(
  /create\s+or\s+replace\s+function\s+public\.central_invoice_authority_materialize_full_number_v1[\s\S]*?\$\$;/i,
)?.[0];

assert.ok(materializerDefinition, "Missing materializer function definition");

for (const required of [
  marker,
  "create or replace function public.central_invoice_authority_materialize_full_number_v1",
  "returns jsonb",
  "jsonb_typeof(p_value)",
  "jsonb_array_elements(p_value) with ordinality",
  "jsonb_each(p_value)",
  "pg_catalog.to_jsonb(p_pending_marker)",
  "create or replace function public.issue_central_invoice_v1",
  "v_pending_marker text := '__CENTRAL_AUTHORITY_FULL_NUMBER__'",
  "v_materialized_payload",
  "v_materialized_snapshot",
  "v_materialized_hash",
  "central invoice snapshot materialization incomplete",
  "central invoice materialized number missing",
  "extensions.digest",
  "current_payload = v_materialized_payload",
  "emitted_snapshot = v_materialized_snapshot",
  "emitted_hash = v_materialized_hash",
  "v_materialized_hash",
  "server_materialized_snapshot_v1",
  "materializedSnapshotHash",
  "revoke all on function public.central_invoice_authority_materialize_full_number_v1",
  "revoke all on function public.issue_central_invoice_v1",
  "from public, anon, authenticated",
  "grant execute on function public.issue_central_invoice_v1",
  "to service_role",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /\bgrant\s+execute\s+on\s+function\s+public\.central_invoice_authority_materialize_full_number_v1[\s\S]*\bto\s+(?:anon|authenticated)\b/i,
  /\bgrant\s+execute\s+on\s+function\s+public\.issue_central_invoice_v1[\s\S]*\bto\s+(?:anon|authenticated)\b/i,
  /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\s+public\.(?!central_invoice_)/i,
  /\binsert\s+into\s+public\.(?!central_invoice_)/i,
  /\buser_backups\b/i,
  /\bsync_entities\b/i,
]) {
  assert.doesNotMatch(
    migration,
    forbidden,
    `Forbidden materialized snapshot SQL: ${forbidden}`,
  );
}

assert.doesNotMatch(
  materializerDefinition,
  /\bsecurity\s+definer\b/i,
  "The JSONB materializer must not bypass RLS independently.",
);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-materialized-snapshot"],
  "node scripts/validate-central-invoice-authority-materialized-snapshot.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-materialized-snapshot/,
);

console.log("central invoice authority materialized snapshot: OK");
