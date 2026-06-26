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
  "src/lib/document-sync-integrity/sync-conflicts.ts",
  "src/lib/document-sync-integrity/sync-conflicts.test.ts",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}`);
}

const body = `${read("src/lib/document-sync-integrity/sync-conflicts.ts")}\n${read("src/lib/document-sync-integrity/sync-conflicts.test.ts")}`;
for (const marker of [
  "PHASE2C4_SYNC_CONFLICT_VERSIONING_V1",
  "buildDocumentSyncConflict",
  "compareDocumentSyncVersions",
  "isExpectedVersionSatisfied",
  "localVersion",
  "remoteVersion",
  "expectedVersion",
  "conflictReason",
]) {
  if (!body.includes(marker)) fail(`2C.4 marker missing: ${marker}`);
}

for (const [label, regex] of [
  ["fetch", /\bfetch\s*\(/],
  ["axios", /\baxios\b/],
  ["node http", /node:http|node:https/],
  ["Supabase", /@supabase|createClient\(/i],
]) {
  if (regex.test(read("src/lib/document-sync-integrity/sync-conflicts.ts"))) {
    fail(`Forbidden conflict runtime pattern: ${label}`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c4-sync-conflict-versioning"]) {
  fail("Missing npm script validate:phase2c4-sync-conflict-versioning.");
}

if (errors.length > 0) {
  console.error("Phase 2C.4 sync conflict versioning validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.4 sync conflict versioning validation passed.");
