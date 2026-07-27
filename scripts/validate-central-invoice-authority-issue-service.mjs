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

const marker = "CENTRAL_INVOICE_AUTHORITY_ISSUE_SERVICE_V1";
const source = read("src/lib/central-invoice-authority/issue-service.ts");
const test = read("src/lib/central-invoice-authority/issue-service.test.ts");
const doc = read("docs/architecture/central-invoice-authority-issue-service-v1.md");
const packageJson = JSON.parse(read("package.json"));
const body = `${source}\n${test}\n${doc}`;

for (const required of [
  marker,
  "evaluateCentralInvoiceAuthorityActivation",
  "buildCentralInvoiceAuthorityIssueCommand",
  "buildCentralInvoiceAuthorityTransactionPlan",
  "issueCentralInvoiceThroughRpc",
  "CENTRAL_AUTHORITY_DISABLED",
  "CENTRAL_AUTHORITY_SHADOW_ONLY",
  "fiscalWritesEnabled",
  "transactionStepIds",
]) {
  assert.match(body, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

for (const forbidden of [
  /getSupabaseAdmin\(/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /NEXT_PUBLIC_SUPABASE_URL/,
  /export\s+async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/,
  /from\s+["']next\/server["']/,
  /src\/app\/api/,
  /localStorage/,
  /window\./,
  /createClient\s*\(/,
]) {
  assert.doesNotMatch(source, forbidden, `Forbidden issue service coupling: ${forbidden}`);
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-issue-service"],
  "node scripts/validate-central-invoice-authority-issue-service.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-issue-service/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/issue-service.test.ts",
]);

console.log("central invoice authority issue service: OK");
