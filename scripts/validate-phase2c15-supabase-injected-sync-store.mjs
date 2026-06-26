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

for (const filePath of [
  "src/lib/document-sync-integrity/supabase-store.ts",
  "src/lib/document-sync-integrity/supabase-store.test.ts",
  "docs/phase2c15-supabase-injected-sync-store-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const runtime = read("src/lib/document-sync-integrity/supabase-store.ts");
const body = `${runtime}\n${read("src/lib/document-sync-integrity/supabase-store.test.ts")}\n${read("docs/phase2c15-supabase-injected-sync-store-v1.md")}`;

for (const marker of [
  "PHASE2C15_SUPABASE_INJECTED_SYNC_STORE_V1",
  "createSupabaseDocumentSyncStore",
  "getById",
  "listByScope",
  "putDraft",
  "updateDraft",
  "deleteDraft",
  "recordConflict",
  "getConflicts",
  "DocumentSyncSupabaseStoreError",
  ".eq(\"user_id\"",
  ".eq(\"scope_id\"",
  ".eq(\"version\"",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.15 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["env read", /process\.env/],
  ["browser storage", /\blocalStorage\b/],
  ["network", /\bfetch\s*\(|node:http|node:https/],
]) {
  if (regex.test(runtime)) fail(`Forbidden store runtime pattern: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c15-supabase-injected-sync-store"]) {
  fail("Missing npm script validate:phase2c15-supabase-injected-sync-store.");
}

if (errors.length > 0) {
  console.error("Phase 2C.15 Supabase injected sync store validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.15 Supabase injected sync store validation passed.");
