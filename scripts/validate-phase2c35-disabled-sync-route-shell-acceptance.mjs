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

const acceptance = read("scripts/phase2c35-disabled-sync-route-shell-acceptance.test.ts");
const doc = read("docs/phase2c35-disabled-sync-route-shell-acceptance-v1.md");
const packageJson = JSON.parse(read("package.json") || "{}");

if (!acceptance.includes("PHASE2C35_DISABLED_SYNC_ROUTE_SHELL_ACCEPTANCE_V1")) {
  fail("Missing 2C.35 acceptance marker.");
}
for (const required of [
  "GET",
  "POST",
  "document_sync_route_disabled",
  "route_shell_enabled_but_operations_disabled",
  "createDocumentSyncServerService",
]) {
  if (!acceptance.includes(required)) fail(`Acceptance missing check ${required}.`);
}
if (!doc.includes("PHASE2C35_DISABLED_SYNC_ROUTE_SHELL_ACCEPTANCE_V1")) {
  fail("Missing 2C.35 doc marker.");
}
if (!packageJson.scripts?.["validate:phase2c35-disabled-sync-route-shell-acceptance"]) {
  fail("Missing npm validator script for 2C.35.");
}
if (!packageJson.scripts?.["test:phase2c35-disabled-sync-route-shell-acceptance"]) {
  fail("Missing npm acceptance test script for 2C.35.");
}

if (errors.length > 0) {
  console.error("Phase 2C.35 disabled sync route shell acceptance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.35 disabled sync route shell acceptance validation passed.");
