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

const migration = read(
  "supabase/migrations/20260728100752_central_invoice_authority_realtime_wakeups.sql",
);
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
const doc = read(
  "docs/architecture/central-invoice-authority-events-realtime-wakeups-v1.md",
);
const autoDoc = read(
  "docs/architecture/central-invoice-authority-events-auto-sync-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${migration}\n${helper}\n${helperTest}\n${component}\n${componentTest}\n${doc}\n${autoDoc}`;

for (const required of [
  "CENTRAL_INVOICE_AUTHORITY_REALTIME_WAKEUPS_V1",
  "central_invoice_event_wakeups",
  "central_invoice_authority_insert_wakeup_v1",
  "central_invoice_outbox_wakeups_ai_v1",
  "supabase_realtime",
  "NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS",
  "isCentralInvoiceAuthorityEventsRealtimeWakeupsEnabled",
  "shouldSubscribeCentralInvoiceAuthorityEventsRealtimeWakeups",
  "centralInvoiceAuthorityEventsRealtimeWakeupsSubscription",
  "postgres_changes",
  "syncCentralInvoiceAuthorityEvents",
  "commitDurableAppData",
  "Realtime is a wakeup only",
  "disabled by default",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const requiredMigrationPattern of [
  /alter table public\.central_invoice_event_wakeups enable row level security/i,
  /revoke all on table public\.central_invoice_event_wakeups from public, anon, authenticated/i,
  /grant select on table public\.central_invoice_event_wakeups to authenticated/i,
  /create policy central_invoice_event_wakeups_owner_select_v1[\s\S]*?to authenticated[\s\S]*?auth\.uid\(\)\) = user_id/i,
  /alter publication supabase_realtime[\s\S]*?add table public\.central_invoice_event_wakeups/i,
]) {
  assert.match(migration, requiredMigrationPattern);
}

for (const forbiddenMigrationPattern of [
  /grant .*central_invoice_outbox.*authenticated/i,
  /grant .*central_invoice_outbox.*anon/i,
  /alter publication supabase_realtime[\s\S]*?central_invoice_outbox/i,
]) {
  assert.doesNotMatch(
    migration,
    forbiddenMigrationPattern,
    `Forbidden protected outbox browser exposure: ${forbiddenMigrationPattern}`,
  );
}

for (const forbiddenComponentPattern of [
  /from "@\/lib\/supabase\/client"/,
  /forceDownloadFromCloud/,
  /prepareCloudRepairPreview/,
  /replaceCloudSnapshotDurably/,
  /getSupabaseAdmin/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /documentPayload/,
  /emittedHash/,
  /safeSummary/,
]) {
  assert.doesNotMatch(
    component,
    forbiddenComponentPattern,
    `Forbidden realtime coupling or fiscal payload exposure: ${forbiddenComponentPattern}`,
  );
}

assert.match(component, /void import\("@\/lib\/supabase\/client"\)/);
assert.match(component, /event:\s*"INSERT"/);
assert.match(component, /filter:\s*subscription\.filter/);
assert.match(helper, /user_id=eq\.\$\{userId\}/);
assert.match(doc, /`central_invoice_outbox` remains private/i);
assert.match(doc, /Lost wakeups remain recoverable/i);
assert.match(autoDoc, /Realtime wakeups remain optional/i);
assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-events-realtime-wakeups"
  ],
  "node scripts/validate-central-invoice-authority-events-realtime-wakeups.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-events-realtime-wakeups/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/events-auto-sync.test.ts",
  "src/components/cloud/central-authority-events-auto-sync.test.ts",
]);

console.log("central invoice authority events realtime wakeups contract ok");
