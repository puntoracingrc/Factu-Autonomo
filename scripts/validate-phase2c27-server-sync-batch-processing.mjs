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

const sourcePath = "src/lib/document-sync-integrity/server-sync-batch.ts";
const testPath = "src/lib/document-sync-integrity/server-sync-batch.test.ts";
const docPath = "docs/phase2c27-server-sync-batch-processing-v1.md";

for (const filePath of [sourcePath, testPath, docPath]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const body = `${read(sourcePath)}\n${read(testPath)}\n${read(docPath)}`;

for (const marker of [
  "PHASE2C27_SERVER_SYNC_BATCH_PROCESSING_V1",
  "planDocumentSyncBatch",
  "applyDocumentSyncBatch",
  "summarizeDocumentSyncBatchResult",
  "stopOnFirstError",
  "stoppedEarly",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.27 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["env read", /process\.env/],
  ["remote URL", /https?:\/\//],
  ["endpoint path", /app\/api|route\.ts/],
]) {
  if (regex.test(read(sourcePath))) fail(`Forbidden 2C.27 batch content: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c27-server-sync-batch-processing"]) {
  fail("Missing npm script validate:phase2c27-server-sync-batch-processing.");
}

if (errors.length > 0) {
  console.error("Phase 2C.27 server sync batch processing validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.27 server sync batch processing validation passed.");
