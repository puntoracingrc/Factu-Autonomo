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

const marker = "CENTRAL_INVOICE_AUTHORITY_EVENTS_SYNC_STATE_V1";
const source = read("src/lib/central-invoice-authority/events-sync-state.ts");
const test = read("src/lib/central-invoice-authority/events-sync-state.test.ts");
const types = read("src/lib/types.ts");
const storage = read("src/lib/storage.ts");
const doc = read(
  "docs/architecture/central-invoice-authority-events-sync-state-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${source}\n${test}\n${types}\n${storage}\n${doc}`;

for (const required of [
  marker,
  "centralInvoiceAuthorityEventsSync",
  "CentralInvoiceAuthorityEventsSyncStateV1",
  "recordCentralInvoiceAuthorityEventsLocalSyncResult",
  "cursorToPersist",
  "serverNextCursor",
  "lastConflictAt",
  "lastErrorAt",
  "centralInvoiceAuthorityEventsSync",
  "malformed_record",
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
  /\bemittedSnapshot\b/,
  /\bdocumentPayload\b/,
]) {
  assert.doesNotMatch(
    source,
    forbidden,
    `Forbidden sync state side effect or payload coupling: ${forbidden}`,
  );
}

assert.match(doc, /does not call the server/i);
assert.match(doc, /does not\s+store document payloads/i);
assert.equal(
  packageJson.scripts["validate:central-invoice-authority-events-sync-state"],
  "node scripts/validate-central-invoice-authority-events-sync-state.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-events-sync-state/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/events-sync-state.test.ts",
]);

console.log("central invoice authority events sync state: OK");
