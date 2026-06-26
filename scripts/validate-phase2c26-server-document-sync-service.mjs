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

const sourcePath = "src/lib/document-sync-integrity/server-sync-service.ts";
const testPath = "src/lib/document-sync-integrity/server-sync-service.test.ts";
const docPath = "docs/phase2c26-server-document-sync-service-v1.md";

for (const filePath of [sourcePath, testPath, docPath]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const source = read(sourcePath);
const body = `${source}\n${read(testPath)}\n${read(docPath)}`;

for (const marker of [
  "PHASE2C26_SERVER_DOCUMENT_SYNC_SERVICE_V1",
  "createDocumentSyncServerService",
  "adapter",
  "auditSink",
  "dryRunSingle",
  "applyBatch",
  "getSafeReport",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.26 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["env read", /process\.env/],
  ["fetch", /\bfetch\s*\(/],
  ["endpoint path", /app\/api|route\.ts/],
  ["UI import", /from ["'](?:@\/)?(?:components|app|public)\//i],
  ["sensitive role literal", new RegExp(["service", "role"].join("_"), "i")],
]) {
  if (regex.test(source)) fail(`Forbidden 2C.26 service content: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c26-server-document-sync-service"]) {
  fail("Missing npm script validate:phase2c26-server-document-sync-service.");
}

if (errors.length > 0) {
  console.error("Phase 2C.26 server document sync service validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.26 server document sync service validation passed.");
