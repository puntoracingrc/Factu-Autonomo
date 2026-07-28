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

function includes(source, text, label) {
  assert.match(
    source,
    new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `${label} must contain ${text}`,
  );
}

const marker = "CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_V1";
const client = read("src/lib/central-invoice-authority/form-canary-client.ts");
const clientTest = read(
  "src/lib/central-invoice-authority/form-canary-client.test.ts",
);
const wiringTest = read(
  "src/lib/central-invoice-authority/form-runtime-policy-wiring.test.ts",
);
const doc = read(
  "docs/architecture/central-invoice-authority-last-known-form-guard-v1.md",
);
const runtimeDoc = read(
  "docs/architecture/central-invoice-authority-form-runtime-policy-v1.md",
);
const packageJson = JSON.parse(read("package.json"));
const body = `${client}\n${clientTest}\n${wiringTest}\n${doc}\n${runtimeDoc}`;

for (const required of [
  marker,
  "CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_KEY",
  "last_known_central_authority",
  "readLastKnownCentralAuthorityFormGuard",
  "rememberCentralAuthorityFormGuard",
  "public_form_required",
  "server_required",
  "server_fiscal_writes_possible",
  "localStorage",
  "no permite volver a emitir en local",
]) {
  includes(body, required, "central authority last known form guard");
}

assert.ok(
  client.indexOf("readLastKnownCentralAuthorityFormGuard") <
    client.indexOf("if (!status.ok)"),
  "last known guard must be read before status fallback is decided",
);
assert.ok(
  client.indexOf('return enabledPolicy("last_known_central_authority")') >
    client.indexOf("if (!status.ok)"),
  "status unavailable must fail closed when last known guard exists",
);
assert.ok(
  client.indexOf(
    'return enabledPolicy("last_known_central_authority", status)',
  ) < client.indexOf('return localPolicy("central_not_requested"'),
  "central off must not be local fallback when last known guard exists",
);

assert.equal(
  packageJson.scripts["validate:central-invoice-authority-last-known-form-guard"],
  "node scripts/validate-central-invoice-authority-last-known-form-guard.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-last-known-form-guard/,
);

runBin("npx", [
  "vitest",
  "run",
  "src/lib/central-invoice-authority/form-canary-client.test.ts",
  "src/lib/central-invoice-authority/form-runtime-policy-wiring.test.ts",
]);

console.log("central invoice authority last known form guard: OK");
