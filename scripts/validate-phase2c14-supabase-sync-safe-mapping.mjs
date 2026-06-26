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
  "src/lib/document-sync-integrity/supabase-mapping.ts",
  "src/lib/document-sync-integrity/supabase-mapping.test.ts",
  "docs/phase2c14-supabase-sync-safe-mapping-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const runtime = read("src/lib/document-sync-integrity/supabase-mapping.ts");
const body = `${runtime}\n${read("src/lib/document-sync-integrity/supabase-mapping.test.ts")}\n${read("docs/phase2c14-supabase-sync-safe-mapping-v1.md")}`;

for (const marker of [
  "PHASE2C14_SUPABASE_SYNC_SAFE_MAPPING_V1",
  "mapSupabaseDocumentRowToSyncCurrentState",
  "mapSyncMutationToSupabaseDraftUpdate",
  "mapSupabaseConflictRowToSyncConflict",
  "mapSyncConflictToSupabaseConflictInsert",
  "DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS",
  "DocumentSyncSupabaseMappingError",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.14 marker: ${marker}.`);
}

if (runtime.includes("*")) {
  fail("Mapper runtime must not contain SELECT star marker.");
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["env read", /process\.env/],
  ["full document snapshot key", /\bdocument_snapshot\b.*payload|payload.*\bdocument_snapshot\b/],
  ["full pdf snapshot key", /\bpdf_snapshot\b.*payload|payload.*\bpdf_snapshot\b/],
]) {
  if (regex.test(runtime)) fail(`Forbidden mapping runtime pattern: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c14-supabase-sync-safe-mapping"]) {
  fail("Missing npm script validate:phase2c14-supabase-sync-safe-mapping.");
}

if (errors.length > 0) {
  console.error("Phase 2C.14 Supabase sync safe mapping validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.14 Supabase sync safe mapping validation passed.");
