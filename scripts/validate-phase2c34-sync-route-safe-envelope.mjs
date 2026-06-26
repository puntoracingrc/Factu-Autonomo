import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

const source = read("src/lib/document-sync-integrity/route-envelope.ts");
const test = read("src/lib/document-sync-integrity/route-envelope.test.ts");
const doc = read("docs/phase2c34-sync-route-safe-envelope-v1.md");
const packageJson = JSON.parse(read("package.json") || "{}");

if (!source.includes("PHASE2C34_SYNC_ROUTE_SAFE_ENVELOPE_V1")) {
  fail("Missing 2C.34 marker.");
}
for (const required of [
  "DOCUMENT_SYNC_ROUTE_ENVELOPE_MAX_BYTES",
  "parseDocumentSyncRouteEnvelope",
  "buildDocumentSyncRouteDisabledResponse",
  "buildDocumentSyncRouteErrorResponse",
  "buildDocumentSyncRouteSafeResponse",
  "PAYLOAD_TOO_LARGE",
  "UNSAFE_BODY",
]) {
  if (!source.includes(required)) fail(`Missing safe envelope contract ${required}.`);
}
if (/process\.env|createClient\s*\(|@supabase/.test(source)) {
  fail("Envelope must not read env or create/import Supabase clients.");
}
if (!test.includes("oversized") || !test.includes("UNSAFE_BODY")) {
  fail("Envelope tests must cover oversized and unsafe bodies.");
}
if (!doc.includes("PHASE2C34_SYNC_ROUTE_SAFE_ENVELOPE_V1")) {
  fail("Missing 2C.34 doc marker.");
}
if (!packageJson.scripts?.["validate:phase2c34-sync-route-safe-envelope"]) {
  fail("Missing npm validator script for 2C.34.");
}

if (errors.length > 0) {
  console.error("Phase 2C.34 sync route safe envelope validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.34 sync route safe envelope validation passed.");
