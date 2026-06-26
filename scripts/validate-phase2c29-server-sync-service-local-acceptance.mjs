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

const testPath = "scripts/phase2c29-server-sync-service-local-acceptance.test.ts";
const docPath = "docs/phase2c29-server-sync-service-local-acceptance-v1.md";

for (const filePath of [testPath, docPath]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const body = `${read(testPath)}\n${read(docPath)}`;

for (const marker of [
  "PHASE2C29_SERVER_SYNC_SERVICE_LOCAL_ACCEPTANCE_V1",
  "in_memory_local_staging",
  "SYNTHETIC_ONLY_",
  "get_safe_report",
  "auditSink",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.29 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["remote URL", /https?:\/\//],
  ["sensitive role literal", new RegExp(["service", "role"].join("_"), "i")],
]) {
  if (regex.test(read(testPath))) fail(`Forbidden 2C.29 test content: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
for (const scriptName of [
  "test:phase2c29-server-sync-service-local-acceptance",
  "validate:phase2c29-server-sync-service-local-acceptance",
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

if (errors.length > 0) {
  console.error("Phase 2C.29 server sync service local acceptance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.29 server sync service local acceptance validation passed.");
