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

const preflight = read(
  "src/lib/central-invoice-authority/form-series-preflight.ts",
);
const inventory = read(
  "src/lib/central-invoice-authority/account-series-inventory.ts",
);
const documentForm = read("src/components/forms/DocumentForm.tsx");
const rectificationForm = read(
  "src/components/forms/RectificativaForm.tsx",
);
const doc = read(
  "docs/architecture/central-invoice-authority-form-series-preflight-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${preflight}\n${inventory}\n${documentForm}\n${rectificationForm}\n${doc}`;

for (const required of [
  "CENTRAL_INVOICE_AUTHORITY_FORM_SERIES_PREFLIGHT_V1",
  "buildCentralInvoiceAuthorityAccountSeriesInventory",
  "requiredSeries",
  "CENTRAL_AUTHORITY_FORM_SERIES_DUPLICATE",
  "CENTRAL_AUTHORITY_FORM_SERIES_PREFLIGHT_INVALID",
  "reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser",
  "preflightCentralInvoiceAuthorityFormSeries",
  "runCentralInvoiceAuthorityClientOperation",
  "issueCentralInvoiceAuthorityFromBrowser",
  "if (!seriesPreflight.ok) return seriesPreflight",
  "greatest(actual, observado)",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const form of [documentForm, rectificationForm]) {
  const operation = form.slice(
    form.indexOf(
      "const centralSave = await runCentralInvoiceAuthorityClientOperation",
    ),
  );
  assert.ok(
    operation.indexOf("preflightCentralInvoiceAuthorityFormSeries") <
      operation.indexOf("issueCentralInvoiceAuthorityFromBrowser"),
    "series preflight must execute before central issue",
  );
}

assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-form-series-preflight"
  ],
  "node scripts/validate-central-invoice-authority-form-series-preflight.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-form-series-preflight/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/account-series-inventory.test.ts",
  "src/lib/central-invoice-authority/form-series-preflight.test.ts",
  "src/lib/central-invoice-authority/document-form-canary-wiring.test.ts",
  "src/lib/central-invoice-authority/rectification-form-canary-wiring.test.ts",
  "src/components/cloud/central-authority-account-reconciliation-card.test.ts",
]);

console.log("central invoice authority form series preflight: OK");
