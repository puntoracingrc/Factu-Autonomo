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
  "src/lib/document-sync-integrity/sync-planner.ts",
  "src/lib/document-sync-integrity/sync-planner.test.ts",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}`);
}

const body = `${read("src/lib/document-sync-integrity/sync-planner.ts")}\n${read("src/lib/document-sync-integrity/sync-planner.test.ts")}`;
for (const marker of [
  "PHASE2C3_SYNC_MUTATION_DRY_RUN_PLANNER_V1",
  "planDocumentSyncMutation",
  "evaluateDocumentSyncPolicy",
  "allowedMutation",
  "rejectedMutation",
  "conflict",
  "noop",
  "dryRun: true",
  "safeSummary",
]) {
  if (!body.includes(marker)) fail(`2C.3 marker missing: ${marker}`);
}

for (const [label, regex] of [
  ["fetch", /\bfetch\s*\(/],
  ["axios", /\baxios\b/],
  ["node http", /node:http|node:https/],
  ["Supabase", /@supabase|createClient\(/i],
]) {
  if (regex.test(read("src/lib/document-sync-integrity/sync-planner.ts"))) {
    fail(`Forbidden planner runtime pattern: ${label}`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c3-sync-mutation-dry-run-planner"]) {
  fail("Missing npm script validate:phase2c3-sync-mutation-dry-run-planner.");
}

if (errors.length > 0) {
  console.error("Phase 2C.3 sync mutation dry-run planner validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.3 sync mutation dry-run planner validation passed.");
