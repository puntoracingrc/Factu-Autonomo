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

const marker = "CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT_V1";
const source = read("src/lib/central-invoice-authority/issue-command.ts");
const test = read("src/lib/central-invoice-authority/issue-command.test.ts");
const doc = read(
  "docs/architecture/central-invoice-authority-issue-command-contract-v1.md",
);
const schema = read("docs/architecture/central-invoice-authority-schema-v1.md");
const packageJson = JSON.parse(read("package.json"));

const body = `${source}\n${test}\n${doc}`;

for (const required of [
  marker,
  "CentralInvoiceAuthorityIssueInput",
  "CentralInvoiceAuthorityIssueCommand",
  "CentralInvoiceAuthorityIssueCommandSafeSummary",
  "idempotencyKey",
  "requestHash",
  "expectedVersion",
  "draftHash",
  "deviceId",
  "sessionId",
  "rectifiesIdentityId",
  "summarizeCentralInvoiceAuthorityIssueCommand",
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
  assert.doesNotMatch(source, regex, `Forbidden issue-command source content: ${label}`);
}

assert.match(schema, /issue_invoice_v1/);
assert.match(schema, /bloquea la cabecera de serie/i);
assert.match(schema, /asigna la secuencia siguiente/i);
assert.equal(
  packageJson.scripts["validate:central-invoice-authority-issue-command"],
  "node scripts/validate-central-invoice-authority-issue-command.mjs",
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/issue-command.test.ts",
]);

console.log("central invoice authority issue command contract: OK");
