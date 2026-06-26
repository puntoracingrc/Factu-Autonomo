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
  "scripts/phase2c17-supabase-local-sync-acceptance.test.ts",
  "docs/phase2c17-supabase-local-sync-acceptance-opt-in-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const testFile = read("scripts/phase2c17-supabase-local-sync-acceptance.test.ts");
const body = `${testFile}\n${read("docs/phase2c17-supabase-local-sync-acceptance-opt-in-v1.md")}`;

for (const marker of [
  "PHASE2C17_SUPABASE_LOCAL_SYNC_ACCEPTANCE_OPT_IN_V1",
  "PHASE2C17_SUPABASE_LOCAL_SYNC_ACCEPTANCE",
  "PHASE2C17_SUPABASE_LOCAL_DB_URL",
  "describe.skip",
  "localhost",
  "127.0.0.1",
  "BLOCKED_SCHEMA_NOT_COMPATIBLE_WITH_2C_SYNC_ACCEPTANCE",
  "SYNTHETIC_ONLY_*",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.17 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["remote URL literal", /https?:\/\//],
]) {
  if (regex.test(testFile)) fail(`Forbidden acceptance pattern: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
for (const scriptName of [
  "test:phase2c17-supabase-local-sync-acceptance",
  "validate:phase2c17-supabase-local-sync-acceptance-opt-in",
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

if (errors.length > 0) {
  console.error("Phase 2C.17 Supabase local sync acceptance opt-in validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.17 Supabase local sync acceptance opt-in validation passed.");
