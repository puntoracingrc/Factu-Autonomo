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

const marker = "CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION_V1";
const source = read("src/lib/central-invoice-authority/issue-idempotency.ts");
const test = read("src/lib/central-invoice-authority/issue-idempotency.test.ts");
const doc = read(
  "docs/architecture/central-invoice-authority-idempotency-decision-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${source}\n${test}\n${doc}`;

for (const required of [
  marker,
  "decideCentralInvoiceAuthorityIdempotency",
  "buildCentralInvoiceAuthorityStoredCommand",
  "reserve_new",
  "replay_committed",
  "wait_for_pending",
  "retry_same_failed",
  "reject_conflicting_reuse",
  "reject_cross_user_reuse",
  "same_idempotency_key_different_request",
]) {
  assert.match(body, new RegExp(required));
}

for (const [label, regex] of [
  ["Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["API route", /app\/api|route\.ts/],
  ["migration", /supabase\/migrations|create\s+table|create\s+or\s+replace\s+function/i],
  ["fiscal sequence assignment", /sequence\s*[:=]\s*\d|invoiceNumber\s*[:=]|documentNumber\s*[:=]/i],
  ["full PDF body", /%PDF/],
  ["XML body", /<\?xml/i],
]) {
  assert.doesNotMatch(source, regex, `Forbidden idempotency source content: ${label}`);
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-idempotency"],
  "node scripts/validate-central-invoice-authority-idempotency.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-idempotency/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/issue-idempotency.test.ts",
]);

console.log("central invoice authority idempotency decision: OK");
