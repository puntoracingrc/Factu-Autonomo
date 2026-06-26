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

const route = read("src/app/api/document-sync/route.ts");
const doc = read("docs/phase2c32-disabled-sync-route-shell-http-v1.md");
const packageJson = JSON.parse(read("package.json") || "{}");

if (!route.includes("PHASE2C32_DISABLED_SYNC_ROUTE_SHELL_HTTP_V1")) {
  fail("Missing 2C.32 marker in route shell.");
}
if (!route.includes("export async function GET") || !route.includes("export async function POST")) {
  fail("Route shell must expose GET and POST handlers.");
}
if (!route.includes("evaluateDocumentSyncRouteShellFlag(process.env)")) {
  fail("Route boundary must evaluate the private flag from process.env.");
}
if (!route.includes("buildDocumentSyncRouteDisabledResponse")) {
  fail("Route shell must build disabled responses.");
}
if (!route.includes("route_shell_enabled_but_operations_disabled")) {
  fail("Local shell path must keep operations disabled.");
}
for (const [label, regex] of [
  ["Supabase import", /@supabase/i],
  ["client factory", /createClient\s*\(/],
  ["server service creation", /createDocumentSyncServerService/],
  ["document mutation adapter", /applySingle|applyBatch|handle\(/],
]) {
  if (regex.test(route)) fail(`Forbidden route operation: ${label}.`);
}
if (!doc.includes("PHASE2C32_DISABLED_SYNC_ROUTE_SHELL_HTTP_V1")) {
  fail("Missing 2C.32 doc marker.");
}
if (!packageJson.scripts?.["validate:phase2c32-disabled-sync-route-shell-http"]) {
  fail("Missing npm validator script for 2C.32.");
}

if (errors.length > 0) {
  console.error("Phase 2C.32 disabled sync route shell HTTP validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.32 disabled sync route shell HTTP validation passed.");
