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

const marker = "CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC_V1";
const source = read("src/lib/central-invoice-authority/events-local-sync.ts");
const test = read("src/lib/central-invoice-authority/events-local-sync.test.ts");
const doc = read(
  "docs/architecture/central-invoice-authority-events-local-sync-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${source}\n${test}\n${doc}`;

for (const required of [
  marker,
  "syncCentralInvoiceAuthorityPulledEventsIntoDocuments",
  "pullCentralInvoiceAuthorityEventsFromBrowser",
  "applyCentralInvoiceAuthorityPulledEventsToDocuments",
  "cursorToPersist",
  "serverNextCursor",
  "CENTRAL_AUTHORITY_EVENTS_LOCAL_CONFLICT",
  "duplicate_fiscal_number",
  "documents: input.documents",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /\bfetch\s*\(/,
  /\blocalStorage\b/,
  /saveData\s*\(/,
  /commitLatestAppDataDurably/,
  /commitCloudSnapshotDurably/,
  /getSupabaseAdmin/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /CloudSyncContext/,
  /AppStore/,
  /src\/lib\/cloud/,
]) {
  assert.doesNotMatch(
    source,
    forbidden,
    `Forbidden local sync side effect or coupling: ${forbidden}`,
  );
}

assert.match(doc, /no durable writes/i);
assert.match(doc, /cursorToPersist` never advances/i);
assert.equal(
  packageJson.scripts["validate:central-invoice-authority-events-local-sync"],
  "node scripts/validate-central-invoice-authority-events-local-sync.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-events-local-sync/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/events-local-sync.test.ts",
]);

console.log("central invoice authority events local sync: OK");
