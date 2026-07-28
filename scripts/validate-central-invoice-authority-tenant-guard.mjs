import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260728164325_central_invoice_authority_tenant_guard.sql";
const migration = readFileSync(migrationPath, "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

for (const required of [
  "CENTRAL_INVOICE_AUTHORITY_TENANT_GUARD_V1",
  "central_invoice_authority_validate_identity_scope_v1",
  "security invoker",
  "set search_path = ''",
  "v_document_user_id <> new.user_id",
  "v_rectified_user_id <> new.user_id",
  "v_rectified_environment <> new.environment",
  "v_rectified_issuer_nif <> new.issuer_nif",
  "central rectified identity scope mismatch",
  "before insert on public.central_invoice_identities",
  "from public, anon, authenticated",
  "to service_role",
  "revoke update, delete, truncate",
]) {
  assert.match(
    migration,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /\bsecurity\s+definer\b/i,
  /\bgrant\s+execute\b[\s\S]*\bto\s+(?:anon|authenticated)\b/i,
  /\bgrant\s+(?:update|delete|truncate)\b[\s\S]*\bto\s+service_role\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\s+table\b/i,
  /\bdelete\s+from\b/i,
]) {
  assert.doesNotMatch(migration, forbidden);
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-tenant-guard"],
  "node scripts/validate-central-invoice-authority-tenant-guard.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-tenant-guard/,
);

console.log("central invoice authority tenant guard: OK");
