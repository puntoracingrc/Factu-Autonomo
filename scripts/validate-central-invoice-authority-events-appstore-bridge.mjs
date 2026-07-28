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

const marker = "CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC_V1";
const source = read(
  "src/lib/central-invoice-authority/events-app-data-sync.ts",
);
const sourceTest = read(
  "src/lib/central-invoice-authority/events-app-data-sync.test.ts",
);
const appStore = read("src/context/AppStore.tsx");
const appStoreTest = read(
  "src/context/AppStore.central-authority-events-sync.test.ts",
);
const clientLock = read(
  "src/lib/central-invoice-authority/client-operation-lock.ts",
);
const clientLockTest = read(
  "src/lib/central-invoice-authority/client-operation-lock.test.ts",
);
const doc = read(
  "docs/architecture/central-invoice-authority-events-appstore-bridge-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${source}\n${sourceTest}\n${appStore}\n${appStoreTest}\n${clientLock}\n${clientLockTest}\n${doc}`;

for (const required of [
  marker,
  "pullCentralInvoiceAuthorityEventsForAppData",
  "buildCentralInvoiceAuthorityEventsAppDataTransition",
  "syncCentralInvoiceAuthorityEventsIntoAppData",
  "syncCentralInvoiceAuthorityEvents",
  "recordCentralInvoiceAuthorityEventsLocalSyncResult",
  "syncCentralInvoiceAuthorityPulledEventsIntoDocuments",
  "centralInvoiceAuthorityEventsSync?.cursor",
  "selectCentralInvoiceAuthorityEventsSyncBaseline",
  "runCentralInvoiceAuthorityClientOperation",
  "factu:central-invoice-authority:client-operation:v1",
  "commitDurableAppData(baseline, (previous) =>",
  "no automatic polling",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /\blocalStorage\b/,
  /saveData\s*\(/,
  /commitLatestAppDataDurably/,
  /commitCloudSnapshotDurably/,
  /getSupabaseAdmin/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /CloudSyncContext/,
  /\bemittedSnapshot\b/,
]) {
  assert.doesNotMatch(
    source,
    forbidden,
    `Forbidden app data event bridge side effect or payload coupling: ${forbidden}`,
  );
}

const bridgeStart = appStore.indexOf(
  "const syncCentralInvoiceAuthorityEvents = useCallback",
);
const bridgeEnd = appStore.indexOf(
  "const updateProfile = useCallback",
  bridgeStart,
);
assert.ok(bridgeStart > -1, "AppStore bridge callback must exist");
assert.ok(bridgeEnd > bridgeStart, "AppStore bridge callback must precede value");
const bridge = appStore.slice(bridgeStart, bridgeEnd);
assert.doesNotMatch(bridge, /setAppData\s*\(/);
assert.doesNotMatch(bridge, /useEffect/);
assert.doesNotMatch(bridge, /setInterval/);

assert.match(doc, /does not start timers/i);
assert.match(doc, /commitDurableAppData/i);
assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-events-appstore-bridge"
  ],
  "node scripts/validate-central-invoice-authority-events-appstore-bridge.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-events-appstore-bridge/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/events-app-data-sync.test.ts",
  "src/lib/central-invoice-authority/client-operation-lock.test.ts",
  "src/context/AppStore.central-authority-events-sync.test.ts",
]);

console.log("central invoice authority events AppStore bridge: OK");
