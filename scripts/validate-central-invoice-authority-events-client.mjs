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

const marker = "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1";
const client = read("src/lib/central-invoice-authority/events-client.ts");
const test = read("src/lib/central-invoice-authority/events-client.test.ts");
const doc = read(
  "docs/architecture/central-invoice-authority-events-client-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${client}\n${test}\n${doc}`;

for (const required of [
  marker,
  "use client",
  "pullCentralInvoiceAuthorityEventsFromBrowser",
  "/api/central-invoice-authority/events",
  "method: \"GET\"",
  "cache: \"no-store\"",
  "CLOUD_DEVICE_TOKEN_HEADER",
  "getLocalCloudDeviceToken",
  "getSupabaseClientAsync",
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE_V1",
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1",
  "nextCursor",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /getSupabaseAdmin\(/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /list_central_invoice_events_v1/,
  /method:\s*["']POST["']/,
  /body:\s*JSON\.stringify/,
  /\bemittedSnapshot\b/,
  /\bemitted_snapshot\b/,
  /\blocalStorage\.setItem\b/,
]) {
  assert.doesNotMatch(client, forbidden, `Forbidden events client coupling: ${forbidden}`);
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-events-client"],
  "node scripts/validate-central-invoice-authority-events-client.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-events-client/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/events-client.test.ts",
]);

console.log("central invoice authority events client: OK");
