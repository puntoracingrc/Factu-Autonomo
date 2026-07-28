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
    new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `${label} must contain ${text}`,
  );
}

function excludes(source, pattern, label) {
  assert.doesNotMatch(source, pattern, `${label} must not match ${pattern}`);
}

const marker = "CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_STORE_BRIDGE_V1";
const store = read("src/context/AppStore.tsx");
const test = read(
  "src/lib/central-invoice-authority/form-canary-store-contract.test.ts",
);
const doc = read(
  "docs/architecture/central-invoice-authority-rectification-store-bridge-v1.md",
);
const packageJson = JSON.parse(read("package.json"));

const bridgeStart = store.indexOf("const addDocumentWithCentralIdentity");
const bridgeEnd = store.indexOf("const updateDocument", bridgeStart);
assert.ok(bridgeStart >= 0, "Missing addDocumentWithCentralIdentity");
assert.ok(bridgeEnd > bridgeStart, "Cannot isolate central identity bridge");
const bridge = store.slice(bridgeStart, bridgeEnd);
const rectificationStart = bridge.indexOf("if (doc.rectification)");
const invoiceStart = bridge.indexOf("const createdDraft", rectificationStart);
assert.ok(rectificationStart >= 0, "Missing central rectification branch");
assert.ok(invoiceStart > rectificationStart, "Cannot isolate rectification branch");
const rectificationBranch = bridge.slice(rectificationStart, invoiceStart);
const body = `${rectificationBranch}\n${test}\n${doc}`;

for (const required of [
  marker,
  "identity.kind",
  "factura_rectificativa",
  "identity.fullNumber",
  "centralInvoiceAuthority",
  "requireUniqueRectificationOriginal",
  "resolveCanonicalRectificationSource",
  "canonicalRectificationReference",
  "canonicalRectificationItems",
  "assertRectificationEmissionAllowed",
  "assertDocumentEmissionValid",
  "materializeRectificationDocument",
  "applyEmittedRectificationToOriginal",
  "hasPendingRectificationDraft",
  "bumpNumberingAfterAssign",
  "falla cerrado",
]) {
  includes(body, required, "central authority rectification store bridge");
}

for (const forbidden of [
  /assignNextDocumentNumber/,
  /fetch\s*\(/,
  /localStorage/,
  /getSupabase(Client|Admin|Async)/,
  /\/api\/central-invoice-authority\/issue/,
]) {
  excludes(
    rectificationBranch,
    forbidden,
    "central authority rectification store branch",
  );
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-rectification-store-bridge"],
  "node scripts/validate-central-invoice-authority-rectification-store-bridge.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-rectification-store-bridge/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/form-canary-store-contract.test.ts",
]);

console.log("central invoice authority rectification store bridge: OK");
