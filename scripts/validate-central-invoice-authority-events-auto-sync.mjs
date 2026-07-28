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

const helper = read("src/lib/central-invoice-authority/events-auto-sync.ts");
const helperTest = read(
  "src/lib/central-invoice-authority/events-auto-sync.test.ts",
);
const component = read(
  "src/components/cloud/CentralInvoiceAuthorityEventsAutoSync.tsx",
);
const componentTest = read(
  "src/components/cloud/central-authority-events-auto-sync.test.ts",
);
const appShell = read("src/components/layout/AppShell.tsx");
const doc = read(
  "docs/architecture/central-invoice-authority-events-auto-sync-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${helper}\n${helperTest}\n${component}\n${componentTest}\n${appShell}\n${doc}`;

for (const required of [
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC_V1",
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC",
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_CANARY_USERS",
  "isCentralInvoiceAuthorityEventsAutoSyncEnabled",
  "isCentralInvoiceAuthorityEventsCanaryUserAllowed",
  "shouldRunCentralInvoiceAuthorityEventsAutoSync",
  "nextCentralInvoiceAuthorityEventsAutoSyncDelay",
  "syncCentralInvoiceAuthorityEvents",
  "commitDurableAppData",
  "conflict_paused",
  "user_not_allowlisted",
  "CentralInvoiceAuthorityEventsAutoSync",
  "disabled by default",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /forceDownloadFromCloud/,
  /prepareCloudRepairPreview/,
  /replaceCloudSnapshotDurably/,
  /commitCloudSnapshotDurably/,
  /getSupabaseAdmin/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /documentPayload/,
  /emittedHash/,
  /safeSummary/,
]) {
  assert.doesNotMatch(
    component,
    forbidden,
    `Forbidden auto-sync coupling or fiscal payload exposure: ${forbidden}`,
  );
}

assert.match(doc, /commitDurableAppData/);
assert.match(doc, /central local conflict pauses automatic polling/i);
assert.match(doc, /optional canary scope/i);
assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-events-auto-sync"
  ],
  "node scripts/validate-central-invoice-authority-events-auto-sync.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-events-auto-sync/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/events-auto-sync.test.ts",
  "src/components/cloud/central-authority-events-auto-sync.test.ts",
]);

console.log("central invoice authority events auto sync contract ok");
