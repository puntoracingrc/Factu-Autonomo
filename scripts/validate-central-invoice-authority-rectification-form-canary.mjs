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

const marker = "CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_CANARY_V1";
const helper = read("src/lib/central-invoice-authority/document-form-canary.ts");
const test = read(
  "src/lib/central-invoice-authority/document-form-canary.test.ts",
);
const doc = read(
  "docs/architecture/central-invoice-authority-rectification-form-canary-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${helper}\n${test}\n${doc}`;

for (const required of [
  marker,
  "CentralInvoiceAuthorityRectificationTarget",
  "deriveCentralInvoiceAuthorityRectificationSeries",
  "resolveCentralInvoiceAuthorityRectificationTarget",
  "buildCentralInvoiceAuthorityRectificationFormIssueRequest",
  'kind: "rectification"',
  "rectifiesIdentityId",
  "factura_rectificativa",
  "FORM_CANARY_RECTIFICATION",
  "CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER",
  "centralInvoiceAuthority.fullNumber",
  "falla cerrado",
]) {
  includes(body, required, "central authority rectification form canary");
}

for (const forbidden of [
  /fetch\s*\(/,
  /localStorage/,
  /getSupabase(Client|Admin|Async)/,
  /issueCentralInvoiceAuthorityFromBrowser/,
  /addDocumentWithCentralIdentity/,
  /\/api\/central-invoice-authority\/issue/,
  /RectificativaForm/,
]) {
  excludes(helper, forbidden, "central authority rectification helper");
}

includes(doc, "no activa el formulario", "central authority rectification doc");
includes(doc, "no llama a Supabase", "central authority rectification doc");
includes(doc, "no abre rutas nuevas", "central authority rectification doc");
includes(doc, "falla cerrado", "central authority rectification doc");

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-rectification-form-canary"],
  "node scripts/validate-central-invoice-authority-rectification-form-canary.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-rectification-form-canary/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/document-form-canary.test.ts",
  "src/lib/central-invoice-authority/issue-command.test.ts",
]);

console.log("central invoice authority rectification form canary: OK");
