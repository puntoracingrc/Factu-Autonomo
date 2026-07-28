import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(
  "scripts/test-central-invoice-authority-restore-drill.mjs",
  "utf8",
);
const evidence = JSON.parse(
  readFileSync(
    "docs/architecture/central-invoice-authority-recovery-evidence-2026-07-28.json",
    "utf8",
  ),
);
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

assert.equal(
  evidence.marker,
  "CENTRAL_INVOICE_AUTHORITY_RECOVERY_EVIDENCE_V1",
);
assert.equal(evidence.project.ref, "rnbmkkzptxbvtchluqrx");
assert.equal(evidence.productionBackup.pitrEnabled, false);
assert.equal(evidence.productionBackup.scheduledPhysicalBackupVisible, true);
assert.equal(evidence.productionBackup.restoreActionAvailable, true);
assert.equal(evidence.productionBackup.businessRowsRead, false);
assert.equal(
  evidence.productionBackup.result,
  "restorable_backup_verified",
);
assert.equal(evidence.isolatedRestoreDrill.syntheticOnly, true);
assert.equal(evidence.isolatedRestoreDrill.result, "passed");
assert.equal(evidence.activationBoundary.productionSchemaApplied, false);
assert.equal(evidence.activationBoundary.canaryFiscalWritesEnabled, false);
assert.equal(evidence.activationBoundary.requiredModeEnabled, false);

for (const required of [
  "CENTRAL_INVOICE_AUTHORITY_TEST_DATABASE_URL",
  "CENTRAL_INVOICE_AUTHORITY_ALLOW_REMOTE_TEST",
  "pg_dump",
  "pg_restore",
  "--format=custom",
  "--no-owner",
  "--exit-on-error",
  "create extension if not exists pgcrypto with schema extensions",
  "safeCounts",
  "identityDigest",
  "test-central-invoice-authority-postgres.mjs",
  "rmSync(temporaryDirectory",
]) {
  assert.match(
    script,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
}

assert.match(
  script,
  /\["127\.0\.0\.1",\s*"localhost",\s*"::1"\]/,
);
assert.doesNotMatch(script, /\b(?:select|returning)\s+\*/i);

assert.equal(
  packageJson.scripts["test:central-invoice-authority-restore-drill"],
  "node scripts/test-central-invoice-authority-restore-drill.mjs",
);
assert.equal(
  packageJson.scripts["validate:central-invoice-authority-recovery-evidence"],
  "node scripts/validate-central-invoice-authority-recovery-evidence.mjs",
);
assert.match(
  packageJson.scripts["check:authority-central-release-gate"],
  /validate:central-invoice-authority-recovery-evidence/,
);

console.log("central invoice authority recovery evidence: OK");
