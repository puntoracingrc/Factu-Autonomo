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

const files = [
  "src/lib/document-sync-integrity/server-sync-response.ts",
  "src/lib/document-sync-integrity/server-sync-response.test.ts",
  "src/lib/document-sync-integrity/server-sync-audit.ts",
  "src/lib/document-sync-integrity/server-sync-audit.test.ts",
  "docs/phase2c28-server-sync-safe-response-audit-v1.md",
];

for (const filePath of files) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const body = files.map(read).join("\n");

for (const marker of [
  "PHASE2C28_SERVER_SYNC_SAFE_RESPONSE_AUDIT_V1",
  "serializeDocumentSyncServerResult",
  "redactDocumentSyncServerError",
  "buildDocumentSyncServerAuditEvent",
  "createInMemoryDocumentSyncServerAuditSink",
  "server_sync_command_received",
  "persisted: false",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.28 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["env read", /process\.env/],
  ["endpoint path", /app\/api|route\.ts/],
  ["filesystem persistence", /\bwriteFile(?:Sync)?\b|\bappendFile(?:Sync)?\b/],
]) {
  if (regex.test(`${read(files[0])}\n${read(files[2])}`)) {
    fail(`Forbidden 2C.28 runtime content: ${label}.`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c28-server-sync-safe-response-audit"]) {
  fail("Missing npm script validate:phase2c28-server-sync-safe-response-audit.");
}

if (errors.length > 0) {
  console.error("Phase 2C.28 server sync safe response audit validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.28 server sync safe response audit validation passed.");
