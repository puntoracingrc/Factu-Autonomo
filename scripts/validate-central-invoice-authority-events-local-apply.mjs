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

const marker = "CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_APPLY_V1";
const applicator = read(
  "src/lib/central-invoice-authority/events-local-apply.ts",
);
const test = read(
  "src/lib/central-invoice-authority/events-local-apply.test.ts",
);
const types = read("src/lib/types.ts");
const store = read("src/context/AppStore.tsx");
const doc = read(
  "docs/architecture/central-invoice-authority-events-local-apply-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${applicator}\n${test}\n${types}\n${store}\n${doc}`;

for (const required of [
  marker,
  "applyCentralInvoiceAuthorityPulledEventsToDocuments",
  "DocumentCentralInvoiceAuthorityLinkV1",
  "centralInvoiceAuthority",
  "serverDocumentId",
  "identityId",
  "outboxEventId",
  "documentVersion",
  "duplicate_fiscal_number",
  "local_document_id_collision",
  "central_identity_number_mismatch",
  "rectification_original_missing",
  "rectification_original_already_linked",
  "unsupported_event_type",
  "rectification_issued",
  "originalStatusAfterRectification",
  "CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY",
  "issueDraftDocumentWithStatus",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /\bfetch\s*\(/,
  /\blocalStorage\b/,
  /getSupabaseClient/,
  /getSupabaseAdmin/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /saveData\s*\(/,
  /commitLatestAppDataDurably/,
  /commitCloudSnapshotDurably/,
  /pullCentralInvoiceAuthorityEventsFromBrowser\s*\(/,
]) {
  assert.doesNotMatch(
    applicator,
    forbidden,
    `Forbidden local apply side effect: ${forbidden}`,
  );
}

assert.match(
  doc,
  /A different local invoice with the same fiscal number creates\s+`duplicate_fiscal_number`/i,
);
assert.match(
  doc,
  /A received rectificative requires its original invoice to exist locally/i,
);
assert.equal(
  packageJson.scripts["validate:central-invoice-authority-events-local-apply"],
  "node scripts/validate-central-invoice-authority-events-local-apply.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-events-local-apply/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/events-local-apply.test.ts",
  "src/lib/central-invoice-authority/form-canary-store-contract.test.ts",
]);

console.log("central invoice authority events local apply: OK");
