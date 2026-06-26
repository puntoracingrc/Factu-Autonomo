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
  "src/lib/document-sync-integrity/supabase-contract.ts",
  "src/lib/document-sync-integrity/supabase-contract.test.ts",
  "docs/phase2c13-supabase-local-sync-contract-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const runtime = read("src/lib/document-sync-integrity/supabase-contract.ts");
const body = `${runtime}\n${read("src/lib/document-sync-integrity/supabase-contract.test.ts")}\n${read("docs/phase2c13-supabase-local-sync-contract-v1.md")}`;

for (const marker of [
  "PHASE2C13_SUPABASE_LOCAL_SYNC_CONTRACT_V1",
  "DocumentSyncSupabaseClientLike",
  "DocumentSyncSupabaseStore",
  "DocumentSyncSupabaseRow",
  "DocumentSyncSupabaseVersionRow",
  "DocumentSyncSupabaseConflictRow",
  "DocumentSyncSupabaseAdapterOptions",
  "DocumentSyncSupabaseSafetyMode",
  "local_staging_only",
  "PRODUCTION_SUPABASE_REJECTED",
  "REMOTE_SUPABASE_REJECTED",
  "MISSING_SERVER_SCOPE",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.13 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["env read", /process\.env/],
  ["network", /\bfetch\s*\(|node:http|node:https/],
]) {
  if (regex.test(runtime)) fail(`Forbidden contract runtime pattern: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c13-supabase-local-sync-contract"]) {
  fail("Missing npm script validate:phase2c13-supabase-local-sync-contract.");
}

if (errors.length > 0) {
  console.error("Phase 2C.13 Supabase local sync contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.13 Supabase local sync contract validation passed.");
