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
    ["storage write method", /\.(?:setItem|removeItem|clear)\s*\(/],
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
    /^src\/components\/local-data-safety\//,
    /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66)-.*\.test\.ts$/,
    /^scripts\/validate-phase2d(?:[1-9]|[1-4][0-9]|5[0-9]|6[0-8]|1-10|11-20|21-32|33-44|45-56|57-68)-.*\.mjs$/,
    /^scripts\/validate-phase2[bc].*\.mjs$/,
    /^scripts\/validate-audit-export-v1-compliance-dossier-snapshot\.mjs$/,
    /^docs\/phase2d(?:[1-9]|[1-4][0-9]|5[0-9]|6[0-8])-.*$/,
    /^docs\/compliance-evidence-v1\.md$/,
    /^package\.json$/,
  ];

  for (const changedPath of changedPaths) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    if (changedPath.startsWith("docs/audit/exports/")) continue;
    assert(
      allowedPatterns.some((pattern) => pattern.test(changedPath)),
      `Unexpected path touched in 2D.11-2D.20: ${changedPath}.`,
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
    "backup/import review flow 2D.11-2D.20",
    "UI-facing contracts",
    "no UI real",
    "no localStorage write",
    "no import/restore apply",
    "sin produccion",
    "sin Supabase",
    "sin documentos reales",
    "PHASE2D_IMPORT_RESTORE_REVIEW_FLOW: READY FOR DISABLED UI SHELL DESIGN / NO APPLY",
  ]) {
    assert(compliance.includes(required), `Compliance dossier missing ${required}.`);
  }
}

function validateTemplate() {
  const template = JSON.parse(
    read("docs/phase2d14-import-restore-human-confirmation-checklist.template.json"),
  );
  for (const key of [
    "backupReviewed",
    "protectedDocumentsReviewed",
    "numberingRisksReviewed",
    "snapshotRisksReviewed",
    "dryRunReportReviewed",
    "externalReviewAccepted",
  ]) {
    assert(template[key] === false, `Checklist template must default ${key} to false.`);
  }
}

function validateApplyBlocked() {
  const applyBlocker = read("src/lib/local-data-safety/import-restore-apply-blocker.ts");
  const reviewReport = read("src/lib/local-data-safety/import-restore-review-report.ts");
  for (const required of [
    "APPLY_DISABLED_PENDING_UI_AND_EXTERNAL_REVIEW",
    "blocked: true",
    "operation",
    "safe: true",
  ]) {
    assert(applyBlocker.includes(required), `Apply blocker missing ${required}.`);
  }
  assert(reviewReport.includes("applyAllowed: false"), "Review report must keep applyAllowed false.");
  assert(reviewReport.includes("restoreAllowed: false"), "Review report must keep restoreAllowed false.");
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

export function validatePhase2D11() {
  assertPackageScript("validate:phase2d11-backup-file-intake-contract");
  assertIncludes("src/lib/local-data-safety/backup-intake.ts", "PHASE2D11_BACKUP_FILE_INTAKE_CONTRACT_V1");
  assertIncludes("docs/phase2d11-backup-file-intake-contract-v1.md", "PHASE2D11_BACKUP_FILE_INTAKE_CONTRACT_V1");
  for (const required of ["inspectLocalDataBackupIntakeCandidate", "summarizeLocalDataBackupIntake"]) {
    assertIncludes("src/lib/local-data-safety/backup-intake.ts", required);
  }
  runVitest("src/lib/local-data-safety/backup-intake.test.ts");
}

export function validatePhase2D12() {
  assertPackageScript("validate:phase2d12-backup-validation-pipeline");
  assertIncludes("src/lib/local-data-safety/backup-validation-pipeline.ts", "PHASE2D12_BACKUP_VALIDATION_PIPELINE_V1");
  assertIncludes("docs/phase2d12-backup-validation-pipeline-v1.md", "PHASE2D12_BACKUP_VALIDATION_PIPELINE_V1");
  for (const required of ["runLocalDataBackupValidationPipeline", "summarizeLocalDataBackupValidationPipeline"]) {
    assertIncludes("src/lib/local-data-safety/backup-validation-pipeline.ts", required);
  }
  runVitest("src/lib/local-data-safety/backup-validation-pipeline.test.ts");
}

export function validatePhase2D13() {
  assertPackageScript("validate:phase2d13-import-restore-review-model");
  assertIncludes("src/lib/local-data-safety/import-restore-review-model.ts", "PHASE2D13_IMPORT_RESTORE_REVIEW_MODEL_V1");
  assertIncludes("docs/phase2d13-import-restore-review-model-v1.md", "PHASE2D13_IMPORT_RESTORE_REVIEW_MODEL_V1");
  for (const required of ["buildLocalDataImportRestoreReviewModel", "summarizeLocalDataImportRestoreReviewModel"]) {
    assertIncludes("src/lib/local-data-safety/import-restore-review-model.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-review-model.test.ts");
}

export function validatePhase2D14() {
  assertPackageScript("validate:phase2d14-import-restore-human-confirmation-gate");
  assertIncludes("src/lib/local-data-safety/import-restore-confirmation-gate.ts", "PHASE2D14_IMPORT_RESTORE_HUMAN_CONFIRMATION_GATE_V1");
  assertIncludes("docs/phase2d14-import-restore-human-confirmation-gate-v1.md", "PHASE2D14_IMPORT_RESTORE_HUMAN_CONFIRMATION_GATE_V1");
  validateTemplate();
  for (const required of [
    "evaluateLocalDataImportRestoreHumanConfirmation",
    "buildLocalDataImportRestoreConfirmationChecklist",
    "summarizeLocalDataImportRestoreConfirmation",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-confirmation-gate.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-confirmation-gate.test.ts");
}

export function validatePhase2D15() {
  assertPackageScript("validate:phase2d15-import-restore-apply-blocker");
  assertIncludes("src/lib/local-data-safety/import-restore-apply-blocker.ts", "PHASE2D15_IMPORT_RESTORE_APPLY_BLOCKER_V1");
  assertIncludes("docs/phase2d15-import-restore-apply-blocker-v1.md", "PHASE2D15_IMPORT_RESTORE_APPLY_BLOCKER_V1");
  validateApplyBlocked();
  runVitest("src/lib/local-data-safety/import-restore-apply-blocker.test.ts");
}

export function validatePhase2D16() {
  assertPackageScript("validate:phase2d16-disabled-localstorage-adapter-contract");
  assertIncludes("src/lib/local-data-safety/localstorage-adapter-contract.ts", "PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1");
  assertIncludes("docs/phase2d16-disabled-localstorage-adapter-contract-v1.md", "PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1");
  for (const required of [
    "createDisabledLocalDataStorageAdapter",
    "evaluateLocalDataStorageAdapterReadiness",
    "summarizeLocalDataStorageAdapter",
  ]) {
    assertIncludes("src/lib/local-data-safety/localstorage-adapter-contract.ts", required);
  }
  runVitest("src/lib/local-data-safety/localstorage-adapter-contract.test.ts");
}

export function validatePhase2D17() {
  assertPackageScript("validate:phase2d17-malformed-backup-hardening");
  assertIncludes("src/lib/local-data-safety/malformed-backup-hardening.ts", "PHASE2D17_MALFORMED_BACKUP_HARDENING_V1");
  assertIncludes("docs/phase2d17-malformed-backup-hardening-v1.md", "PHASE2D17_MALFORMED_BACKUP_HARDENING_V1");
  for (const required of [
    "detectMalformedLocalDataBackup",
    "assertSafeParsedLocalDataBackupObject",
    "summarizeMalformedBackupFindings",
  ]) {
    assertIncludes("src/lib/local-data-safety/malformed-backup-hardening.ts", required);
  }
  runVitest("src/lib/local-data-safety/malformed-backup-hardening.test.ts");
}

export function validatePhase2D18() {
  assertPackageScript("validate:phase2d18-import-restore-review-flow-safe-report");
  assertIncludes("src/lib/local-data-safety/import-restore-review-report.ts", "PHASE2D18_IMPORT_RESTORE_REVIEW_FLOW_SAFE_REPORT_V1");
  assertIncludes("docs/phase2d18-import-restore-review-flow-safe-report-v1.md", "PHASE2D18_IMPORT_RESTORE_REVIEW_FLOW_SAFE_REPORT_V1");
  for (const required of [
    "buildLocalDataImportRestoreReviewReport",
    "redactLocalDataImportRestoreReviewReport",
    "assertLocalDataImportRestoreReviewReportSafe",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-review-report.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-review-report.test.ts");
}

export function validatePhase2D19() {
  assertPackageScript("validate:phase2d19-import-restore-review-flow-acceptance");
  assertPackageScript("test:phase2d19-import-restore-review-flow-acceptance");
  assertIncludes(
    "scripts/phase2d19-import-restore-review-flow-acceptance.test.ts",
    "PHASE2D19_IMPORT_RESTORE_REVIEW_FLOW_ACCEPTANCE_V1",
  );
  assertIncludes(
    "docs/phase2d19-import-restore-review-flow-acceptance-v1.md",
    "PHASE2D19_IMPORT_RESTORE_REVIEW_FLOW_ACCEPTANCE_V1",
  );
  runVitest("scripts/phase2d19-import-restore-review-flow-acceptance.test.ts");
}

export function validatePhase2D20() {
  assertPackageScript("validate:phase2d11-20-import-restore-review-flow");
  assertIncludes(
    "docs/phase2d20-import-restore-review-flow-checkpoint-v1.md",
    "PHASE2D20_IMPORT_RESTORE_REVIEW_FLOW_CHECKPOINT_V1",
  );
  const checkpoint = read("docs/phase2d20-import-restore-review-flow-checkpoint-v1.md");
  for (const required of [
    "PHASE2D_IMPORT_RESTORE_REVIEW_FLOW: READY FOR DISABLED UI SHELL DESIGN / NO APPLY",
    "NO UI",
    "NO LOCALSTORAGE WRITE",
    "NO IMPORT APPLY",
    "NO RESTORE APPLY",
    "NO REAL DATA",
    "NO SUPABASE",
    "NO PRODUCTION",
  ]) {
    assert(checkpoint.includes(required), `Checkpoint missing ${required}.`);
  }
  validateDossier();
}

export function validatePhase2D11To20() {
  validatePhase2D11();
  validatePhase2D12();
  validatePhase2D13();
  validatePhase2D14();
  validatePhase2D15();
  validatePhase2D16();
  validatePhase2D17();
  validatePhase2D18();
  validatePhase2D19();
  validatePhase2D20();
}
