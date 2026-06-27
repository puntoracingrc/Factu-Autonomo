import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  const filePath = absolute(relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function gitLines(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function runBin(bin, args) {
  execFileSync(bin, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertFile(relativePath) {
  assert(exists(relativePath), `Missing required file ${relativePath}.`);
}

function assertIncludes(relativePath, marker) {
  assertFile(relativePath);
  assert(read(relativePath).includes(marker), `${relativePath} missing ${marker}.`);
}

function assertPackageScript(scriptName) {
  const packageJson = JSON.parse(read("package.json") || "{}");
  assert(packageJson.scripts?.[scriptName], `Missing npm script ${scriptName}.`);
}

function runVitest(testPath) {
  runBin("npx", ["vitest", "run", testPath]);
}

function runtimeFiles() {
  const base = "src/lib/local-data-safety";
  return fs
    .readdirSync(absolute(base))
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => `${base}/${file}`);
}

function validateNoRuntimeSideEffects() {
  const forbidden = [
    ["localStorage", /\blocalStorage\b/],
    ["Supabase package", /@supabase\/supabase-js/i],
    ["client factory", /createClient\s*\(/],
    ["network fetch", /\bfetch\s*\(/],
    ["http module", /node:http|node:https|from ["']http["']|from ["']https["']/],
    ["filesystem", /node:fs|from ["']fs["']|\bwriteFile(?:Sync)?\b|\breadFile(?:Sync)?\b|\bappendFile(?:Sync)?\b/],
    ["environment read", /process\.env/],
    ["Next response", /NextResponse/],
    ["UI import", /from ["'](?:react|next\/|lucide-react)/],
  ];

  for (const filePath of runtimeFiles()) {
    const body = read(filePath);
    for (const [label, regex] of forbidden) {
      assert(!regex.test(body), `Forbidden ${label} in ${filePath}.`);
    }
  }
}

function validateNoRedLines() {
  const changedPaths = new Set([
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["diff", "--name-only", "--cached"]),
    ...gitLines(["diff", "--name-only", "main...HEAD"]),
    ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]);

  const allowedPatterns = [
    /^src\/lib\/local-data-safety\//,
    /^scripts\/phase2d(?:9-local-data-backup-restore-safety-acceptance|19-import-restore-review-flow-acceptance)\.test\.ts$/,
    /^scripts\/validate-phase2d(?:[1-9]|1[0-9]|20|1-10|11-20)-.*\.mjs$/,
    /^scripts\/validate-phase2[bc].*\.mjs$/,
    /^scripts\/validate-audit-export-v1-compliance-dossier-snapshot\.mjs$/,
    /^docs\/phase2d(?:[1-9]|1[0-9]|20)-.*$/,
    /^docs\/compliance-evidence-v1\.md$/,
    /^package\.json$/,
  ];

  for (const changedPath of changedPaths) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    if (changedPath.startsWith("docs/audit/exports/")) continue;
    assert(
      allowedPatterns.some((pattern) => pattern.test(changedPath)),
      `Unexpected path touched in 2D.1-2D.10: ${changedPath}.`,
    );
    assert(!/^supabase\//.test(changedPath), `Supabase path touched: ${changedPath}.`);
    assert(!/vida/i.test(changedPath), `ViDA path touched: ${changedPath}.`);
    assert(!/^(?:src\/app|app|pages|components|public)\//.test(changedPath), `UI/public path touched: ${changedPath}.`);
    assert(!/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath), `Vercel config touched: ${changedPath}.`);
    assert(!/(?:stripe|openai|importers|aeat|(?:^|[\/_-])qr(?:[\/_.-]|$)|(?:^|[\/_-])firma(?:[\/_.-]|$)|certificado|transport)/i.test(changedPath), `Forbidden product path touched: ${changedPath}.`);
    assert(!changedPath.toLowerCase().endsWith(".pdf"), `PDF binary is not authorized: ${changedPath}.`);
  }
}

function validateDossier() {
  const compliance = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "local data safety / backup restore 2D.1-2D.10",
    "Fase 2D.1-2D.10",
    "backup integrity",
    "import dry-run",
    "restore planning",
    "sin produccion",
    "sin Supabase",
    "sin documentos reales",
    "sin UI",
    "sin mutaciones reales",
    "PHASE2D_LOCAL_DATA_BACKUP_RESTORE_SAFETY: READY FOR UI INTEGRATION DESIGN / NO DATA MUTATION",
  ]) {
    assert(compliance.includes(required), `Compliance dossier missing ${required}.`);
  }
}

export function runValidator(label, validate) {
  const errors = [];
  try {
    validateNoRedLines();
    validateNoRuntimeSideEffects();
    validate();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  if (errors.length > 0) {
    console.error(`${label} validation failed:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`${label} validation passed.`);
}

export function validatePhase2D1() {
  assertPackageScript("validate:phase2d1-local-data-backup-import-surface-audit");
  assertIncludes(
    "docs/phase2d1-local-data-backup-import-surface-audit-v1.md",
    "PHASE2D1_LOCAL_DATA_BACKUP_IMPORT_SURFACE_AUDIT_V1",
  );
}

export function validatePhase2D2() {
  assertPackageScript("validate:phase2d2-backup-manifest-contract");
  assertIncludes("src/lib/local-data-safety/backup-manifest.ts", "PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1");
  assertIncludes("src/lib/local-data-safety/types.ts", "PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1");
  assertIncludes("docs/phase2d2-backup-manifest-contract-v1.md", "PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1");
  for (const required of [
    "buildLocalDataBackupManifest",
    "validateLocalDataBackupManifest",
    "summarizeLocalDataBackupManifest",
  ]) {
    assertIncludes("src/lib/local-data-safety/backup-manifest.ts", required);
  }
  runVitest("src/lib/local-data-safety/backup-manifest.test.ts");
}

export function validatePhase2D3() {
  assertPackageScript("validate:phase2d3-backup-integrity-hash");
  assertIncludes("src/lib/local-data-safety/backup-integrity.ts", "PHASE2D3_BACKUP_INTEGRITY_HASH_V1");
  assertIncludes("docs/phase2d3-backup-integrity-hash-v1.md", "PHASE2D3_BACKUP_INTEGRITY_HASH_V1");
  for (const required of [
    "canonicalizeLocalDataBackupForHash",
    "buildLocalDataBackupIntegrityDigest",
    "verifyLocalDataBackupIntegrity",
  ]) {
    assertIncludes("src/lib/local-data-safety/backup-integrity.ts", required);
  }
  runVitest("src/lib/local-data-safety/backup-integrity.test.ts");
}

export function validatePhase2D4() {
  assertPackageScript("validate:phase2d4-import-dry-run-planner");
  assertIncludes("src/lib/local-data-safety/import-dry-run.ts", "PHASE2D4_IMPORT_DRY_RUN_PLANNER_V1");
  assertIncludes("docs/phase2d4-import-dry-run-planner-v1.md", "PHASE2D4_IMPORT_DRY_RUN_PLANNER_V1");
  assertIncludes("src/lib/local-data-safety/import-dry-run.ts", "planLocalDataImportDryRun");
  assertIncludes("src/lib/local-data-safety/import-dry-run.ts", "summarizeLocalDataImportDryRun");
  runVitest("src/lib/local-data-safety/import-dry-run.test.ts");
}

export function validatePhase2D5() {
  assertPackageScript("validate:phase2d5-pre-import-recovery-snapshot-builder");
  assertIncludes("src/lib/local-data-safety/recovery-snapshot.ts", "PHASE2D5_PRE_IMPORT_RECOVERY_SNAPSHOT_BUILDER_V1");
  assertIncludes("docs/phase2d5-pre-import-recovery-snapshot-builder-v1.md", "PHASE2D5_PRE_IMPORT_RECOVERY_SNAPSHOT_BUILDER_V1");
  for (const required of [
    "buildPreImportRecoverySnapshot",
    "validatePreImportRecoverySnapshot",
    "summarizePreImportRecoverySnapshot",
  ]) {
    assertIncludes("src/lib/local-data-safety/recovery-snapshot.ts", required);
  }
  runVitest("src/lib/local-data-safety/recovery-snapshot.test.ts");
}

export function validatePhase2D6() {
  assertPackageScript("validate:phase2d6-restore-planner-document-protection");
  assertIncludes("src/lib/local-data-safety/restore-planner.ts", "PHASE2D6_RESTORE_PLANNER_DOCUMENT_PROTECTION_V1");
  assertIncludes("docs/phase2d6-restore-planner-document-protection-v1.md", "PHASE2D6_RESTORE_PLANNER_DOCUMENT_PROTECTION_V1");
  assertIncludes("src/lib/local-data-safety/restore-planner.ts", "planLocalDataRestore");
  assertIncludes("src/lib/local-data-safety/restore-planner.ts", "summarizeLocalDataRestorePlan");
  runVitest("src/lib/local-data-safety/restore-planner.test.ts");
}

export function validatePhase2D7() {
  assertPackageScript("validate:phase2d7-local-data-safety-report");
  assertIncludes("src/lib/local-data-safety/local-data-safety-report.ts", "PHASE2D7_LOCAL_DATA_SAFETY_REPORT_V1");
  assertIncludes("docs/phase2d7-local-data-safety-report-v1.md", "PHASE2D7_LOCAL_DATA_SAFETY_REPORT_V1");
  for (const required of [
    "buildLocalDataSafetyReport",
    "redactLocalDataSafetyReport",
    "assertLocalDataSafetyReportSafe",
  ]) {
    assertIncludes("src/lib/local-data-safety/local-data-safety-report.ts", required);
  }
  runVitest("src/lib/local-data-safety/local-data-safety-report.test.ts");
}

export function validatePhase2D8() {
  assertPackageScript("validate:phase2d8-local-data-safety-audit-events");
  assertIncludes("src/lib/local-data-safety/local-data-safety-audit.ts", "PHASE2D8_LOCAL_DATA_SAFETY_AUDIT_EVENTS_V1");
  assertIncludes("docs/phase2d8-local-data-safety-audit-events-v1.md", "PHASE2D8_LOCAL_DATA_SAFETY_AUDIT_EVENTS_V1");
  for (const required of [
    "backup_manifest_built",
    "backup_integrity_verified",
    "import_dry_run_planned",
    "import_risk_detected",
    "recovery_snapshot_built",
    "restore_plan_built",
    "restore_blocked",
  ]) {
    assertIncludes("src/lib/local-data-safety/types.ts", required);
  }
  runVitest("src/lib/local-data-safety/local-data-safety-audit.test.ts");
}

export function validatePhase2D9() {
  assertPackageScript("validate:phase2d9-local-data-backup-restore-safety-acceptance");
  assertPackageScript("test:phase2d9-local-data-backup-restore-safety-acceptance");
  assertIncludes(
    "scripts/phase2d9-local-data-backup-restore-safety-acceptance.test.ts",
    "PHASE2D9_LOCAL_DATA_BACKUP_RESTORE_SAFETY_ACCEPTANCE_V1",
  );
  assertIncludes(
    "docs/phase2d9-local-data-backup-restore-safety-acceptance-v1.md",
    "PHASE2D9_LOCAL_DATA_BACKUP_RESTORE_SAFETY_ACCEPTANCE_V1",
  );
  runVitest("scripts/phase2d9-local-data-backup-restore-safety-acceptance.test.ts");
}

export function validatePhase2D10() {
  assertPackageScript("validate:phase2d1-10-local-data-backup-restore-safety");
  assertIncludes(
    "docs/phase2d10-local-data-backup-restore-safety-checkpoint-v1.md",
    "PHASE2D10_LOCAL_DATA_BACKUP_RESTORE_SAFETY_CHECKPOINT_V1",
  );
  const checkpoint = read("docs/phase2d10-local-data-backup-restore-safety-checkpoint-v1.md");
  for (const required of [
    "PHASE2D_LOCAL_DATA_BACKUP_RESTORE_SAFETY: READY FOR UI INTEGRATION DESIGN / NO DATA MUTATION",
    "NO PRODUCTION",
    "NO SUPABASE",
    "NO LOCALSTORAGE WRITE",
    "NO UI",
    "NO REAL DATA",
    "NO REAL RESTORE",
    "NO REAL IMPORT APPLY",
    "PURE PLANNING ONLY",
  ]) {
    assert(checkpoint.includes(required), `Checkpoint missing ${required}.`);
  }
  validateDossier();
}

export function validatePhase2D1To10() {
  validatePhase2D1();
  validatePhase2D2();
  validatePhase2D3();
  validatePhase2D4();
  validatePhase2D5();
  validatePhase2D6();
  validatePhase2D7();
  validatePhase2D8();
  validatePhase2D9();
  validatePhase2D10();
}
