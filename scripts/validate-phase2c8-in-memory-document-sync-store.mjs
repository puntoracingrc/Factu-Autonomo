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
  "src/lib/document-sync-integrity/sync-store.ts",
  "src/lib/document-sync-integrity/sync-store.test.ts",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const runtime = read("src/lib/document-sync-integrity/sync-store.ts");
const body = `${runtime}\n${read("src/lib/document-sync-integrity/sync-store.test.ts")}`;

for (const marker of [
  "PHASE2C8_IN_MEMORY_DOCUMENT_SYNC_STORE_V1",
  "createInMemoryDocumentSyncStore",
  "getById",
  "listByScope",
  "putDraft",
  "updateDraft",
  "deleteDraft",
  "recordConflict",
  "getConflicts",
  "reset",
]) {
  if (!body.includes(marker)) fail(`2C.8 marker missing: ${marker}`);
}

for (const [label, regex] of [
  ["Supabase", /@supabase|createClient\(|supabase\//i],
  ["fetch", /\bfetch\s*\(/],
  ["axios", /\baxios\b/],
  ["http", /node:http|node:https/],
  ["filesystem import", /from ["']node:fs|require\(["']node:fs/],
  ["localStorage", /\blocalStorage\b/],
]) {
  if (regex.test(runtime)) fail(`Forbidden store runtime pattern: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c8-in-memory-document-sync-store"]) {
  fail("Missing npm script validate:phase2c8-in-memory-document-sync-store.");
}

if (errors.length > 0) {
  console.error("Phase 2C.8 in-memory document sync store validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.8 in-memory document sync store validation passed.");
