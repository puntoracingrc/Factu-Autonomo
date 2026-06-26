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
  "src/lib/document-sync-integrity/supabase-adapter.ts",
  "src/lib/document-sync-integrity/supabase-adapter.test.ts",
  "docs/phase2c16-supabase-local-staging-sync-adapter-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const runtime = read("src/lib/document-sync-integrity/supabase-adapter.ts");
const body = `${runtime}\n${read("src/lib/document-sync-integrity/supabase-adapter.test.ts")}\n${read("docs/phase2c16-supabase-local-staging-sync-adapter-v1.md")}`;

for (const marker of [
  "PHASE2C16_SUPABASE_LOCAL_STAGING_SYNC_ADAPTER_V1",
  "createSupabaseLocalStagingDocumentSyncAdapter",
  "plan(",
  "apply(",
  "getSafeState",
  "getConflictReport",
  "getSafeReport",
  "accepted",
  "rejected",
  "conflict",
  "noop",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.16 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["env read", /process\.env/],
  ["endpoint route", /NextRequest|NextResponse|\/api\//],
  ["UI import", /from ["'](?:@\/)?(?:components|app|public)\//],
  ["network", /\bfetch\s*\(|node:http|node:https/],
]) {
  if (regex.test(runtime)) fail(`Forbidden adapter runtime pattern: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c16-supabase-local-staging-sync-adapter"]) {
  fail("Missing npm script validate:phase2c16-supabase-local-staging-sync-adapter.");
}

if (errors.length > 0) {
  console.error("Phase 2C.16 Supabase local staging sync adapter validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.16 Supabase local staging sync adapter validation passed.");
