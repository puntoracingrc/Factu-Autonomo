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

const marker = "CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1";
const client = read("src/lib/central-invoice-authority/status-client.ts");
const clientTest = read("src/lib/central-invoice-authority/status-client.test.ts");
const component = read("src/components/cloud/CentralInvoiceAuthorityStatusCard.tsx");
const presentation = read(
  "src/components/cloud/central-authority-status-presentation.ts",
);
const componentTest = read(
  "src/components/cloud/central-authority-status-card.test.ts",
);
const accountPage = read("src/app/cuenta/page.tsx");
const doc = read(
  "docs/architecture/central-invoice-authority-status-client-ui-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${client}\n${clientTest}\n${component}\n${presentation}\n${componentTest}\n${accountPage}\n${doc}`;

for (const required of [
  marker,
  "use client",
  "fetchCentralInvoiceAuthorityStatusFromBrowser",
  "/api/central-invoice-authority/status",
  "method: \"GET\"",
  "cache: \"no-store\"",
  "CLOUD_DEVICE_TOKEN_HEADER",
  "getLocalCloudDeviceToken",
  "getSupabaseClientAsync",
  "CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE_V1",
  "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
  "noBusinessRows: true",
  "destructive: false",
  "centralAuthorityStatusBlockerLabel",
  "CentralInvoiceAuthorityStatusCard",
  "Comprobar servidor central",
  "no automatic polling",
]) {
  includes(body, required, "status client UI");
}

for (const forbidden of [
  /getSupabaseAdmin\(/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /issue_central_invoice_v1/,
  /list_central_invoice_events_v1/,
  /issueCentralInvoiceAuthorityFromBrowser/,
  /syncCentralInvoiceAuthorityEvents\(/,
  /syncNow\(/,
  /forceDownloadFromCloud/,
  /prepareCloudRepairPreview/,
  /method:\s*["']POST["']/,
  /body:\s*JSON\.stringify/,
  /\bdocumentPayload\b/,
  /\bemittedSnapshot\b/,
  /setInterval/,
]) {
  excludes(client, forbidden, "status client");
  excludes(component, forbidden, "status card");
}

includes(accountPage, "CentralInvoiceAuthorityStatusCard", "Cuenta");
assert(
  accountPage.indexOf("<CentralInvoiceAuthorityStatusCard />") <
    accountPage.indexOf("<CentralInvoiceAuthorityEventsSyncCard />"),
  "status card must appear before event pull card in Cuenta sync section",
);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-status-client-ui"],
  "node scripts/validate-central-invoice-authority-status-client-ui.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-status-client-ui/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/status-client.test.ts",
  "src/components/cloud/central-authority-status-card.test.ts",
]);

console.log("central invoice authority status client UI: OK");
