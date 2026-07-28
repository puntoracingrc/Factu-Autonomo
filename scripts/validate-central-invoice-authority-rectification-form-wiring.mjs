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

const marker = "CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_WIRING_V1";
const form = read("src/components/forms/RectificativaForm.tsx");
const helper = read("src/lib/central-invoice-authority/document-form-canary.ts");
const wiringTest = read(
  "src/lib/central-invoice-authority/rectification-form-canary-wiring.test.ts",
);
const doc = read(
  "docs/architecture/central-invoice-authority-rectification-form-wiring-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${form}\n${helper}\n${wiringTest}\n${doc}`;

for (const required of [
  marker,
  "shouldUseCentralInvoiceAuthorityRectificationFormCanary",
  "buildCentralInvoiceAuthorityRectificationFormIssueRequest",
  "isCentralInvoiceAuthorityFormCanaryEnabled",
  "issueCentralInvoiceAuthorityFromBrowser",
  "addDocumentWithCentralIdentity",
  "crypto.randomUUID()",
  "setFormError(centralResult.message)",
  "saved = await addRectificativa(original.id, payload)",
  "rectifiesIdentityId",
  "no cae a numeracion local",
]) {
  includes(body, required, "central authority rectification form wiring");
}

const saveStart = form.indexOf("const payload = buildRectificativaPayload");
const saveEnd = form.indexOf("recordDocumentCreated();", saveStart);
assert.ok(saveStart >= 0, "Missing rectification payload before save");
assert.ok(saveEnd > saveStart, "Cannot isolate rectification save branch");
const saveBranch = form.slice(saveStart, saveEnd);
const rejectionIndex = saveBranch.indexOf("if (!centralResult.ok)");
const centralStoreIndex = saveBranch.indexOf("addDocumentWithCentralIdentity");
const localStoreIndex = saveBranch.indexOf(
  "saved = await addRectificativa(original.id, payload)",
);
assert.ok(rejectionIndex >= 0, "Missing central rejection branch");
assert.ok(
  centralStoreIndex > rejectionIndex,
  "Central store write must happen after central rejection branch",
);
assert.ok(
  localStoreIndex > centralStoreIndex,
  "Local rectification fallback must be outside central branch",
);
includes(
  saveBranch.slice(rejectionIndex, centralStoreIndex),
  "return",
  "central rejection branch",
);

assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-rectification-form-wiring"
  ],
  "node scripts/validate-central-invoice-authority-rectification-form-wiring.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-rectification-form-wiring/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/document-form-canary.test.ts",
  "src/lib/central-invoice-authority/rectification-form-canary-wiring.test.ts",
  "src/lib/central-invoice-authority/form-canary-store-contract.test.ts",
]);

console.log("central invoice authority rectification form wiring: OK");
