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

const source = read("src/lib/document-sync-integrity/route-shell-flag.ts");
const test = read("src/lib/document-sync-integrity/route-shell-flag.test.ts");
const doc = read("docs/phase2c31-disabled-sync-route-private-flag-contract-v1.md");
const packageJson = JSON.parse(read("package.json") || "{}");

if (!source.includes("PHASE2C31_DISABLED_SYNC_ROUTE_PRIVATE_FLAG_CONTRACT_V1")) {
  fail("Missing 2C.31 marker in route-shell-flag.ts.");
}
if (!source.includes("evaluateDocumentSyncRouteShellFlag")) {
  fail("Missing flag evaluator.");
}
if (!source.includes("assertDocumentSyncRouteShellDisabledByDefault")) {
  fail("Missing disabled-by-default assertion.");
}
if (!source.includes("DOCUMENT_SYNC_ROUTE_SHELL_ENABLED")) {
  fail("Missing enabled flag key.");
}
if (!source.includes("DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE")) {
  fail("Missing private mode flag key.");
}
if (!source.includes("local_staging_only")) {
  fail("Missing exact local staging private mode.");
}
if (/process\.env/.test(source)) {
  fail("Flag contract must not read process.env directly.");
}
if (/createClient\s*\(|@supabase/.test(source)) {
  fail("Flag contract must not create or import Supabase clients.");
}
if (!test.includes("missing_enabled_flag") || !test.includes("production_environment")) {
  fail("Flag tests must cover default disabled and production disabled.");
}
if (!doc.includes("PHASE2C31_DISABLED_SYNC_ROUTE_PRIVATE_FLAG_CONTRACT_V1")) {
  fail("Missing 2C.31 doc marker.");
}
if (!packageJson.scripts?.["validate:phase2c31-disabled-sync-route-private-flag-contract"]) {
  fail("Missing npm validator script for 2C.31.");
}

if (errors.length > 0) {
  console.error("Phase 2C.31 disabled sync route private flag validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.31 disabled sync route private flag validation passed.");
