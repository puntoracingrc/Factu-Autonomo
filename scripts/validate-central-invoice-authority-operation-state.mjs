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

const marker = "CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE_V1";
const helper = read("src/lib/central-invoice-authority/operation-state.ts");
const helperTest = read(
  "src/lib/central-invoice-authority/operation-state.test.ts",
);
const statusActions = read("src/lib/invoice-status-actions.ts");
const statusActionsTest = read("src/lib/invoice-status-actions.test.ts");
const documentList = read("src/components/documents/DocumentList.tsx");
const doc = read(
  "docs/architecture/central-invoice-authority-operation-state-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${helper}\n${helperTest}\n${statusActions}\n${statusActionsTest}\n${documentList}\n${doc}`;

for (const required of [
  marker,
  "getCentralInvoiceAuthorityOperationState",
  "server_issued",
  "server_rectification_issued",
  "server_repaired",
  "requires_review",
  "Servidor central",
  "Revisar servidor",
  "no escribe datos",
  "no llama a `fetch`",
  "no usa `localStorage`",
  "no abre Supabase",
]) {
  includes(body, required, "operation state");
}

for (const forbidden of [
  /fetch\s*\(/,
  /localStorage/,
  /getSupabase(Client|Admin)/,
  /issueCentralInvoiceAuthorityFromBrowser/,
  /issueCentralInvoiceWithAuthority/,
  /addDocumentWithCentralIdentity/,
  /\/api\/central-invoice-authority\/issue/,
]) {
  excludes(helper, forbidden, "operation state helper");
}

includes(
  statusActions,
  "getCentralInvoiceAuthorityOperationState",
  "status actions",
);
includes(statusActions, "centralAuthorityState.requiresReview", "status actions");
includes(documentList, "getCentralInvoiceAuthorityOperationState", "document list");
includes(documentList, "centralAuthorityState?.badgeLabel", "document list");

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-operation-state"],
  "node scripts/validate-central-invoice-authority-operation-state.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-operation-state/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/operation-state.test.ts",
  "src/lib/invoice-status-actions.test.ts",
]);

console.log("central invoice authority operation state: OK");
