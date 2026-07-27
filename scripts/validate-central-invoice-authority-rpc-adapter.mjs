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

const marker = "CENTRAL_INVOICE_AUTHORITY_RPC_ADAPTER_V1";
const source = read("src/lib/central-invoice-authority/issue-rpc-adapter.ts");
const test = read("src/lib/central-invoice-authority/issue-rpc-adapter.test.ts");
const doc = read("docs/architecture/central-invoice-authority-rpc-adapter-v1.md");
const packageJson = JSON.parse(read("package.json"));
const body = `${source}\n${test}\n${doc}`;

for (const required of [
  marker,
  "issue_central_invoice_v1",
  "p_idempotency_key_hash",
  "p_session_hash",
  "sha256(command.sessionId)",
  "command.safeSummary.idempotencyKeyHash",
  "RPC_REJECTED",
  "INVALID_RPC_RESULT",
  "status: \"committed\"",
  "status: \"replayed\"",
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
]) {
  assert.doesNotMatch(source, forbidden, `Forbidden RPC adapter coupling: ${forbidden}`);
}

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-rpc-adapter"],
  "node scripts/validate-central-invoice-authority-rpc-adapter.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-rpc-adapter/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/issue-rpc-adapter.test.ts",
]);

console.log("central invoice authority RPC adapter: OK");
