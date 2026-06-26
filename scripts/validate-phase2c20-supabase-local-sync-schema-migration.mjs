import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const errors = [];

function fail(message) {
  errors.push(message);
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.existsSync(absolute(relativePath))
    ? fs.readFileSync(absolute(relativePath), "utf8")
    : "";
}

const migrationPath = "supabase/migrations/20260626212000_phase2c20_document_sync_local_schema.sql";
const rollbackPath = "supabase/rollbacks/20260626212000_phase2c20_document_sync_local_schema.down.sql";
const docPath = "docs/phase2c20-supabase-local-sync-schema-migration-v1.md";

for (const filePath of [migrationPath, rollbackPath, docPath]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const migration = read(migrationPath);
const rollback = read(rollbackPath);
const doc = read(docPath);
const sql = `${migration}\n${rollback}`;

for (const marker of [
  "PHASE2C20_SUPABASE_LOCAL_SYNC_SCHEMA_MIGRATION_V1",
  "scope_id",
  "payload_hash",
  "document_series",
  "safe_summary",
  "server_documents_sync_scope_local_idx",
]) {
  if (!doc.includes(marker) && !sql.includes(marker)) {
    fail(`Missing 2C.20 marker: ${marker}.`);
  }
}

for (const forbidden of [
  /\bfiscal_records\b/i,
  /\bfiscal_chain_state\b/i,
  /\bfiscal_transport_attempts\b/i,
  /\bstripe\b/i,
  /\bopenai\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  /\bservice_role\b/i,
]) {
  if (forbidden.test(sql)) fail(`Forbidden SQL pattern: ${forbidden}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c20-supabase-local-sync-schema-migration"]) {
  fail("Missing npm script validate:phase2c20-supabase-local-sync-schema-migration.");
}

if (errors.length > 0) {
  console.error("Phase 2C.20 Supabase local sync schema migration validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.20 Supabase local sync schema migration validation passed.");
