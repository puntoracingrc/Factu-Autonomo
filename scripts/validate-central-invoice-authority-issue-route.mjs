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

const marker = "CENTRAL_INVOICE_AUTHORITY_ISSUE_ROUTE_V1";
const handler = read("src/lib/central-invoice-authority/issue-route-handler.ts");
const route = read("src/app/api/central-invoice-authority/issue/route.ts");
const test = read("src/lib/central-invoice-authority/issue-route-handler.test.ts");
const doc = read("docs/architecture/central-invoice-authority-issue-route-v1.md");
const packageJson = JSON.parse(read("package.json"));
const body = `${handler}\n${route}\n${test}\n${doc}`;

for (const required of [
  marker,
  "getUserSessionFromBearer",
  "ensureCloudDeviceAccess",
  "hashCloudDeviceToken",
  "checkRateLimit",
  "getSupabaseAdmin",
  "issueCentralInvoiceWithAuthority",
  "userIdSource: \"server\"",
  "documentPayload",
  "emittedSnapshot",
  "commandSafeSummary",
  "rpcResult",
]) {
  assert.match(body, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

for (const forbidden of [
  /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/,
  /localStorage/,
  /window\./,
  /request\.json\(/,
  /body\.userId/,
  /body\.sessionId/,
  /body\.deviceId/,
]) {
  assert.doesNotMatch(handler, forbidden, `Forbidden issue route coupling: ${forbidden}`);
}

assert.match(route, /export\s+async\s+function\s+POST\b/);
assert.match(route, /export\s+async\s+function\s+OPTIONS\b/);
assert.match(route, /dynamic\s*=\s*["']force-dynamic["']/);
assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-issue-route"],
  "node scripts/validate-central-invoice-authority-issue-route.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-issue-route/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/issue-route-handler.test.ts",
]);

console.log("central invoice authority issue route: OK");
