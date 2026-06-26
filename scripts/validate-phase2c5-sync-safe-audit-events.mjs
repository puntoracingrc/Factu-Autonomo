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
  "src/lib/document-sync-integrity/sync-audit.ts",
  "src/lib/document-sync-integrity/sync-audit.test.ts",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}`);
}

const body = `${read("src/lib/document-sync-integrity/sync-audit.ts")}\n${read("src/lib/document-sync-integrity/sync-audit.test.ts")}`;
for (const marker of [
  "PHASE2C5_SYNC_SAFE_AUDIT_EVENTS_V1",
  "buildDocumentSyncAuditEvent",
  "redactDocumentSyncAuditEvent",
  "assertSafeDocumentSyncAuditEvent",
  "sync_candidate_received",
  "sync_plan_accepted",
  "sync_plan_rejected",
  "sync_conflict_detected",
  "sync_noop",
  "protected_document_mutation_blocked",
  "persisted: false",
]) {
  if (!body.includes(marker)) fail(`2C.5 marker missing: ${marker}`);
}

for (const [label, regex] of [
  ["fetch", /\bfetch\s*\(/],
  ["axios", /\baxios\b/],
  ["node http", /node:http|node:https/],
  ["Supabase", /@supabase|createClient\(/i],
]) {
  if (regex.test(read("src/lib/document-sync-integrity/sync-audit.ts"))) {
    fail(`Forbidden audit runtime pattern: ${label}`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c5-sync-safe-audit-events"]) {
  fail("Missing npm script validate:phase2c5-sync-safe-audit-events.");
}

if (errors.length > 0) {
  console.error("Phase 2C.5 sync safe audit events validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.5 sync safe audit events validation passed.");
