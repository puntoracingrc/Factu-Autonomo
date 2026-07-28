import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function runBin(bin, args) {
  execFileSync(bin, args, {
    encoding: "utf8",
    stdio: "pipe",
  });
}

function includes(source, text, label) {
  assert.match(
    source,
    new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `${label} must contain ${text}`,
  );
}

function excludes(source, pattern, label) {
  assert.doesNotMatch(source, pattern, `${label} must not match ${pattern}`);
}

const marker = "CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE_V1";
const readinessMarker = "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1";
const readiness = read(
  "src/lib/central-invoice-authority/status-readiness.ts",
);
const readinessTest = read(
  "src/lib/central-invoice-authority/status-readiness.test.ts",
);
const handler = read(
  "src/lib/central-invoice-authority/status-route-handler.ts",
);
const handlerTest = read(
  "src/lib/central-invoice-authority/status-route-handler.test.ts",
);
const route = read("src/app/api/central-invoice-authority/status/route.ts");
const doc = read(
  "docs/architecture/central-invoice-authority-status-preflight-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${readiness}\n${readinessTest}\n${handler}\n${handlerTest}\n${route}\n${doc}`;

for (const required of [
  marker,
  readinessMarker,
  "getUserSessionFromBearer",
  "ensureCloudDeviceAccess",
  "hashCloudDeviceToken",
  "checkRateLimit",
  "getSupabaseAdmin",
  "select(\"id\", { count: \"exact\", head: true })",
  "issue_central_invoice_v1",
  "list_central_invoice_events_v1",
  "invalid central invoice issue command",
  "invalid central invoice event pull request",
  "fiscalWritesPossible",
  "no fiscal writes",
]) {
  includes(body, required, "status preflight");
}

for (const forbidden of [
  /request\.json\(/,
  /issueCentralInvoiceWithAuthority/,
  /issueCentralInvoiceThroughRpc/,
  /listCentralInvoiceAuthorityEventsThroughRpc/,
  /documentPayload/,
  /emittedSnapshot/,
  /setInterval/,
  /localStorage/,
  /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/,
]) {
  excludes(handler, forbidden, "status route handler");
  excludes(route, forbidden, "status route");
}

includes(
  readiness,
  "p_kind: \"__factu_status_preflight_invalid__\"",
  "status readiness dry-run",
);
includes(readiness, "p_document_payload: null", "status readiness dry-run");
includes(readiness, "p_emitted_snapshot: null", "status readiness dry-run");
includes(readiness, "noBusinessRows: true", "status readiness");
includes(readiness, "destructive: false", "status readiness");
includes(route, "dynamic = \"force-dynamic\"", "status route");
includes(route, "export async function GET", "status route");
includes(route, "export async function OPTIONS", "status route");
includes(route, "export async function POST", "status route");

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-status-preflight"],
  "node scripts/validate-central-invoice-authority-status-preflight.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-status-preflight/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/status-readiness.test.ts",
  "src/lib/central-invoice-authority/status-route-handler.test.ts",
]);

console.log("central invoice authority status preflight: OK");
