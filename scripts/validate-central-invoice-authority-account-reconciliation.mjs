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

const inventory = read(
  "src/lib/central-invoice-authority/account-series-inventory.ts",
);
const rpc = read(
  "src/lib/central-invoice-authority/account-series-reconciliation-rpc.ts",
);
const handler = read(
  "src/lib/central-invoice-authority/account-series-reconciliation-route-handler.ts",
);
const route = read(
  "src/app/api/central-invoice-authority/reconcile/route.ts",
);
const doc = read(
  "docs/architecture/central-invoice-authority-account-reconciliation-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${inventory}\n${rpc}\n${handler}\n${route}\n${doc}`;

for (const required of [
  "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_INVENTORY_V1",
  "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_RPC_V1",
  "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_ROUTE_V1",
  "reconcile_central_invoice_series_v1",
  "getUserSessionFromBearer",
  "ensureCloudDeviceAccess",
  "hashCloudDeviceToken",
  "checkRateLimit",
  "getSupabaseAdmin",
  "confirmed",
  "sourceDigest",
  "observedMaxSequence",
  "CENTRAL_INVOICE_AUTHORITY_CANARY_TEST_ONLY",
  "private, no-store",
]) {
  assert.match(
    body,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

for (const forbidden of [
  /request\.json\(/,
  /body\.userId/,
  /body\.sessionId/,
  /body\.deviceId/,
  /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/,
  /localStorage/,
  /clientName/,
  /documentPayload/,
  /emittedSnapshot/,
]) {
  assert.doesNotMatch(handler, forbidden);
  assert.doesNotMatch(route, forbidden);
}

assert.match(route, /export\s+async\s+function\s+POST\b/);
assert.match(route, /export\s+async\s+function\s+OPTIONS\b/);
assert.match(route, /dynamic\s*=\s*["']force-dynamic["']/);
assert.equal(
  packageJson.scripts[
    "validate:central-invoice-authority-account-reconciliation"
  ],
  "node scripts/validate-central-invoice-authority-account-reconciliation.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-account-reconciliation/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/account-series-inventory.test.ts",
  "src/lib/central-invoice-authority/account-series-reconciliation-rpc.test.ts",
  "src/lib/central-invoice-authority/account-series-reconciliation-route-handler.test.ts",
]);

console.log("central invoice authority account reconciliation: OK");
