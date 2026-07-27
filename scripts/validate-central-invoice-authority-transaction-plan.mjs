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

const marker = "CENTRAL_INVOICE_AUTHORITY_TRANSACTION_PLAN_V1";
const source = read("src/lib/central-invoice-authority/issue-transaction-plan.ts");
const test = read("src/lib/central-invoice-authority/issue-transaction-plan.test.ts");
const doc = read(
  "docs/architecture/central-invoice-authority-transaction-plan-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${source}\n${test}\n${doc}`;

for (const required of [
  marker,
  "buildCentralInvoiceAuthorityTransactionPlan",
  "derive_server_context",
  "reserve_idempotency_command",
  "lock_local_draft",
  "verify_expected_draft_version",
  "lock_series_scope",
  "allocate_next_identity",
  "freeze_document_snapshot",
  "commit_command_result",
  "enqueue_sync_outbox",
  "publish_realtime_hint",
  "clientProvidedFiscalIdentityAllowed",
]) {
  assert.match(body, new RegExp(required));
}

assert.match(
  body,
  /reserve_idempotency_command[\s\S]+lock_local_draft[\s\S]+verify_expected_draft_version[\s\S]+lock_series_scope[\s\S]+allocate_next_identity/,
);

for (const [label, regex] of [
  ["Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["API route", /app\/api|route\.ts/],
  ["migration", /supabase\/migrations|create\s+table|create\s+or\s+replace\s+function/i],
  ["client fiscal identity allowed", /clientProvidedFiscalIdentityAllowed:\s*true/],
  ["full PDF body", /%PDF/],
  ["XML body", /<\?xml/i],
]) {
  assert.doesNotMatch(source, regex, `Forbidden transaction-plan source content: ${label}`);
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-transaction-plan"],
  "node scripts/validate-central-invoice-authority-transaction-plan.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-transaction-plan/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/issue-transaction-plan.test.ts",
]);

console.log("central invoice authority transaction plan: OK");
