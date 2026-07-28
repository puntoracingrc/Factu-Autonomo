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

const marker = "CENTRAL_INVOICE_AUTHORITY_DOCUMENT_STATE_V1";
const component = read(
  "src/components/documents/CentralInvoiceAuthorityDocumentState.tsx",
);
const componentTest = read(
  "src/components/documents/central-invoice-authority-document-state.test.ts",
);
const list = read("src/components/documents/DocumentList.tsx");
const detail = read("src/components/documents/DocumentReadOnlyActions.tsx");
const doc = read(
  "docs/architecture/central-invoice-authority-document-state-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${component}\n${componentTest}\n${list}\n${detail}\n${doc}`;

for (const required of [
  marker,
  "CentralInvoiceAuthorityBadge",
  "CentralInvoiceAuthorityNotice",
  "getCentralInvoiceAuthorityOperationState",
  "Servidor central",
  "Revisar servidor",
  "no escribe datos",
  "no llama a `fetch`",
  "no usa `localStorage`",
  "no abre Supabase",
]) {
  includes(body, required, "central authority document state");
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
  excludes(component, forbidden, "central authority document state component");
}

includes(
  list,
  "CentralInvoiceAuthorityBadge",
  "document list central state",
);
includes(
  detail,
  "CentralInvoiceAuthorityNotice",
  "document detail central state",
);
includes(
  detail,
  'doc.type === "factura"',
  "document detail central state",
);
includes(
  detail,
  "getCentralInvoiceAuthorityOperationState(doc)",
  "document detail central state",
);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-document-state"],
  "node scripts/validate-central-invoice-authority-document-state.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-document-state/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/components/documents/central-invoice-authority-document-state.test.ts",
  "src/lib/central-invoice-authority/operation-state.test.ts",
]);

console.log("central invoice authority document state: OK");
