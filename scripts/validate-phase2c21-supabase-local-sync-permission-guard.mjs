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

const testPath = "scripts/phase2c21-supabase-local-sync-permission-guard.test.ts";
const docPath = "docs/phase2c21-supabase-local-sync-permission-guard-v1.md";

for (const filePath of [testPath, docPath]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const test = read(testPath);
const doc = read(docPath);
const body = `${test}\n${doc}`;

for (const marker of [
  "PHASE2C21_SUPABASE_LOCAL_SYNC_PERMISSION_GUARD_V1",
  "PHASE2C21_SUPABASE_LOCAL_PERMISSION_GUARD",
  "PHASE2C_SUPABASE_LOCAL_URL",
  "describe.skip",
  "localhost",
  "127.0.0.1",
  "anon",
  "authenticated",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.21 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["remote URL", /https?:\/\//],
  ["service role literal", /\bservice_role\b/i],
  ["Vercel", /vercel\.json|\.vercel\//i],
  ["ViDA", /vida/i],
]) {
  if (regex.test(test)) fail(`Forbidden 2C.21 test content: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
for (const scriptName of [
  "test:phase2c21-supabase-local-sync-permission-guard",
  "validate:phase2c21-supabase-local-sync-permission-guard",
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

if (errors.length > 0) {
  console.error("Phase 2C.21 Supabase local sync permission guard validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.21 Supabase local sync permission guard validation passed.");
