import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const adr = read("docs/architecture/ADR-0010-central-invoice-authority.md");
const schema = read("docs/architecture/central-invoice-authority-schema-v1.md");
const registry = read("docs/architecture/PROTECTED-SYSTEM-INVARIANTS.md");
const codeowners = read(".github/CODEOWNERS");
const activation = read("src/lib/central-invoice-authority/activation.ts");
const baseline = JSON.parse(
  read(
    "docs/architecture/central-invoice-authority-production-baseline-2026-07-23.json",
  ),
);

assert.match(adr, /unica autoridad/i);
assert.match(adr, /nunca devolver esa serie a numeracion local/i);
assert.match(adr, /PITR es recomendable, no obligatorio/i);
assert.match(schema, /FOR UPDATE/);
assert.match(
  schema,
  /user_id, environment, issuer_nif, series_code, fiscal_year, sequence/,
);
assert.match(schema, /service_role/);
assert.match(registry, /ADR-0010-central-invoice-authority\.md/);
assert.match(registry, /autoridad central/i);
assert.match(codeowners, /ADR-0010-central-invoice-authority\.md/);
assert.match(codeowners, /central-invoice-authority/);
assert.match(activation, /CENTRAL_INVOICE_AUTHORITY_MODE/);
assert.match(activation, /fiscalWritesEnabled: false/);
assert.doesNotMatch(activation, /NEXT_PUBLIC_/);

assert.equal(
  baseline.schemaVersion,
  "central-invoice-authority-production-baseline-v1",
);
assert.equal(baseline.migrationHistory.baselineReconciledWithGit, false);
assert.equal(baseline.currentSync.realtimeEnabled, false);
assert.equal(baseline.centralAuthority.tablesPresent, false);
assert.equal(baseline.centralAuthority.issueRpcPresent, false);
assert.equal(baseline.recovery.pitrRequiredByArchitecture, false);
assert.equal(baseline.recovery.verifiedRestorableBackup, false);
assert.equal(baseline.decision, "no-go-for-production-schema");

console.log("central invoice authority phase 1 contract: OK");
