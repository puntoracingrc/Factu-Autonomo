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

const source = read("src/lib/document-sync-integrity/route-auth-context.ts");
const test = read("src/lib/document-sync-integrity/route-auth-context.test.ts");
const doc = read("docs/phase2c33-sync-route-auth-context-adapter-v1.md");
const packageJson = JSON.parse(read("package.json") || "{}");

if (!source.includes("PHASE2C33_SYNC_ROUTE_AUTH_CONTEXT_ADAPTER_V1")) {
  fail("Missing 2C.33 marker.");
}
for (const required of [
  "buildDisabledRouteAuthContext",
  "rejectMissingRouteAuthContext",
  "summarizeRouteAuthContext",
  "payload_identity_rejected",
  "synthetic_local_context",
]) {
  if (!source.includes(required)) fail(`Missing auth context contract ${required}.`);
}
if (/process\.env|createClient\s*\(|@supabase/.test(source)) {
  fail("Auth adapter must not read env or create/import Supabase clients.");
}
if (!test.includes("payloadUserId") || !test.includes("synthetic_local_context")) {
  fail("Auth tests must cover payload identity rejection and synthetic local context.");
}
if (!doc.includes("PHASE2C33_SYNC_ROUTE_AUTH_CONTEXT_ADAPTER_V1")) {
  fail("Missing 2C.33 doc marker.");
}
if (!packageJson.scripts?.["validate:phase2c33-sync-route-auth-context-adapter"]) {
  fail("Missing npm validator script for 2C.33.");
}

if (errors.length > 0) {
  console.error("Phase 2C.33 sync route auth context adapter validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.33 sync route auth context adapter validation passed.");
