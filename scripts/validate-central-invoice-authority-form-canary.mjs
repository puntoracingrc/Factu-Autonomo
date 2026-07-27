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

const marker = "CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT_V1";
const client = read("src/lib/central-invoice-authority/form-canary-client.ts");
const store = read("src/context/AppStore.tsx");
const doc = read("docs/architecture/central-invoice-authority-form-canary-bridge-v1.md");
const packageJson = JSON.parse(read("package.json"));

for (const required of [
  marker,
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY",
  "getSupabaseClientAsync",
  "getLocalCloudDeviceToken",
  "CLOUD_DEVICE_TOKEN_HEADER",
  "/api/central-invoice-authority/issue",
  "CENTRAL_AUTHORITY_INVALID_RESPONSE",
]) {
  assert.match(`${client}\n${doc}`, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const bridgeStart = store.indexOf("const addDocumentWithCentralIdentity");
const bridgeEnd = store.indexOf("const updateDocument", bridgeStart);
assert.ok(bridgeStart >= 0, "Missing addDocumentWithCentralIdentity");
assert.ok(bridgeEnd > bridgeStart, "Cannot isolate central identity bridge");
const bridge = store.slice(bridgeStart, bridgeEnd);

assert.match(bridge, /identity\.fullNumber/);
assert.match(bridge, /centralInvoiceAuthority/);
assert.match(bridge, /identity\.serverDocumentId/);
assert.match(bridge, /identity\.identityId/);
assert.match(bridge, /identity\.outboxEventId/);
assert.match(bridge, /identity\.documentVersion/);
assert.match(bridge, /options\.localDocumentId/);
assert.match(bridge, /bumpNumberingAfterAssign/);
assert.doesNotMatch(bridge, /assignNextDocumentNumber/);
assert.match(store, /addDocumentWithCentralIdentity,/);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-form-canary"],
  "node scripts/validate-central-invoice-authority-form-canary.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-form-canary/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/form-canary-client.test.ts",
  "src/lib/central-invoice-authority/form-canary-store-contract.test.ts",
]);

console.log("central invoice authority form canary bridge: OK");
