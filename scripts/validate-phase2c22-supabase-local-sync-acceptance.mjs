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

const testPath = "scripts/phase2c22-supabase-local-sync-acceptance.test.ts";
const docPath = "docs/phase2c22-supabase-local-sync-acceptance-v1.md";

for (const filePath of [testPath, docPath]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const test = read(testPath);
const doc = read(docPath);
const body = `${test}\n${doc}`;

for (const marker of [
  "PHASE2C22_SUPABASE_LOCAL_SYNC_ACCEPTANCE_V1",
  "PHASE2C22_SUPABASE_LOCAL_SYNC_ACCEPTANCE",
  "createSupabaseDocumentSyncStore",
  "createSupabaseLocalStagingDocumentSyncAdapter",
  "SYNTHETIC_ONLY_",
  "expectedVersion",
  "getConflictReport",
  "getSafeReport",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.22 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["remote URL", /https?:\/\//],
  ["service role literal", /\bservice_role\b/i],
  ["Vercel", /vercel\.json|\.vercel\//i],
  ["ViDA", /vida/i],
  ["external endpoint", /agenciatributaria|suministro/i],
]) {
  if (regex.test(test)) fail(`Forbidden 2C.22 test content: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
for (const scriptName of [
  "test:phase2c22-supabase-local-sync-acceptance",
  "validate:phase2c22-supabase-local-sync-acceptance",
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

if (errors.length > 0) {
  console.error("Phase 2C.22 Supabase local sync acceptance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.22 Supabase local sync acceptance validation passed.");
