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

const marker = "CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY_V1";
const helper = read("src/lib/central-invoice-authority/document-form-canary.ts");
const form = read("src/components/forms/DocumentForm.tsx");
const doc = read("docs/architecture/central-invoice-authority-document-form-canary-v1.md");
const packageJson = JSON.parse(read("package.json"));

for (const required of [
  marker,
  "CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER",
  "deriveCentralInvoiceAuthorityInvoiceSeries",
  "shouldUseCentralInvoiceAuthorityDocumentFormCanary",
  "buildCentralInvoiceAuthorityDocumentFormIssueRequest",
  "stableStringifySnapshot",
  "sha256Hex",
]) {
  assert.match(
    `${helper}\n${doc}`,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
}

for (const required of [
  "isCentralInvoiceAuthorityFormCanaryEnabled",
  "issueCentralInvoiceAuthorityFromBrowser",
  "addDocumentWithCentralIdentity",
  "centralCanaryEnabled",
  "crypto.randomUUID()",
  "setFormError(centralResult.message)",
]) {
  assert.match(form, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

assert.match(form, /shouldUseCentralInvoiceAuthorityDocumentFormCanary\(\{/);
assert.match(form, /saved = addDocumentWithCentralIdentity\(/);
assert.match(form, /saved = addDocument\(payload\)/);
assert.match(doc, /no cae a numeracion local si la autoridad central rechaza/);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-document-form-canary"],
  "node scripts/validate-central-invoice-authority-document-form-canary.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-document-form-canary/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/document-form-canary.test.ts",
  "src/lib/central-invoice-authority/document-form-canary-wiring.test.ts",
]);

console.log("central invoice authority document form canary: OK");
