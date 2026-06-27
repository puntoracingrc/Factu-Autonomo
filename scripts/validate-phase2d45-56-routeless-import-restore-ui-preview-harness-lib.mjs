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

function componentFiles() {
  const base = "src/components/local-data-safety";
  return fs
    .readdirSync(absolute(base))
    .filter((file) => (file.endsWith(".ts") || file.endsWith(".tsx")) && !file.includes(".test."))
    .map((file) => `${base}/${file}`);
}

function changedPaths() {
  return new Set([
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["diff", "--name-only", "--cached"]),
    ...gitLines(["diff", "--name-only", "main...HEAD"]),
    ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]);
}

function validateNoRuntimeSideEffects() {
  const forbidden = [
    ["browser storage global", /\blocalStorage\b/],
    ["storage write method", /\.(?:setItem|removeItem|clear)\s*\(/],
    ["real file reader", /\bFileReader\b|showOpenFilePicker|type\s*=\s*["']file["']/],
    ["binary download API", /\bBlob\b|createObjectURL|document\.createElement\(["']a["']\)|\.click\(\)/],
    ["Supabase package", /@supabase\/supabase-js/i],
    ["client factory", /createClient\s*\(/],
    ["network fetch", /\bfetch\s*\(/],
    ["http module", /node:http|node:https|from ["']http["']|from ["']https["']/],
    ["axios", /\baxios\b/],
    ["filesystem", /node:fs|from ["']fs["']|\bwriteFile(?:Sync)?\b|\breadFile(?:Sync)?\b|\bappendFile(?:Sync)?\b/],
    ["environment read", /process\.env/],
    ["Next response", /NextResponse/],
    ["UI import in local model", /from ["'](?:react|next\/|lucide-react)/],
  ];

  for (const filePath of runtimeFiles()) {
    const body = read(filePath);
    for (const [label, regex] of forbidden) {
      assert(!regex.test(body), `Forbidden ${label} in ${filePath}.`);
    }
  }
}

function validateComponentShell() {
  for (const filePath of componentFiles()) {
    const body = read(filePath);
    for (const [label, regex] of [
      ["navigation import", /next\/navigation|next\/router|next\/link/],
      ["route href", /\bhref\s*=/],
      ["click handler", /\bonClick\s*=/],
      ["file picker", /type\s*=\s*["']file["']|showOpenFilePicker/],
      ["browser storage write", /localStorage\s*\.\s*(?:setItem|removeItem|clear)/],
      ["Supabase package", /@supabase\/supabase-js/i],
      ["network fetch", /\bfetch\s*\(/],
      ["axios", /\baxios\b/],
      ["app route", /src\/app|app\/api|NextResponse/],
    ]) {
      assert(!regex.test(body), `Forbidden ${label} in ${filePath}.`);
    }
  }
}

function validateNoConnectedUi() {
  const hits = gitLines(["grep", "-n", "ImportRestoreReviewShell", "--", "src"]);
  for (const hit of hits) {
    const changedPath = hit.split(":")[0];
    if (/^src\/lib\/local-data-safety\/.*\.test\.tsx?$/.test(changedPath)) continue;
    assert(
      changedPath.startsWith("src/components/local-data-safety/"),
      `ImportRestoreReviewShell is connected outside its disabled component folder: ${hit}.`,
    );
  }
}

function validateNoRedLines() {
  const fiscalTransportTable = ["fiscal", "transport", "attempts"].join("_");
  const allowedPatterns = [
    /^src\/lib\/local-data-safety\//,
    /^src\/components\/local-data-safety\//,
    /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78|89|90)-.*\.test\.ts$/,
    /^scripts\/validate-phase2d(?:[1-9]|[1-8][0-9]|9[0-2]|1-10|11-20|21-32|33-44|45-56|57-68|69-80|81-92)-.*\.mjs$/,
    /^scripts\/validate-phase2[bc].*\.mjs$/,
    /^scripts\/validate-audit-export-v1-compliance-dossier-snapshot\.mjs$/,
    /^docs\/phase2d(?:[1-9]|[1-8][0-9]|9[0-2])-.*$/,
    /^docs\/compliance-evidence-v1\.md$/,
    /^package\.json$/,
  ];

  for (const changedPath of changedPaths()) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    if (changedPath.startsWith("docs/audit/exports/")) continue;
    assert(
      allowedPatterns.some((pattern) => pattern.test(changedPath)),
      `Unexpected path touched in 2D.45-2D.56: ${changedPath}.`,
    );
    assert(!/^supabase\//.test(changedPath), `Supabase path touched: ${changedPath}.`);
    assert(!/vida/i.test(changedPath), `ViDA path touched: ${changedPath}.`);
    assert(!/^(?:src\/app|app|pages|public)\//.test(changedPath), `Route/public path touched: ${changedPath}.`);
    assert(
      !/^src\/components\//.test(changedPath) || /^src\/components\/local-data-safety\//.test(changedPath),
      `Connected component path touched: ${changedPath}.`,
    );
    assert(!/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath), `Vercel config touched: ${changedPath}.`);
    assert(!/(?:stripe|openai|importers|aeat|(?:^|[\/_-])qr(?:[\/_.-]|$)|(?:^|[\/_-])firma(?:[\/_.-]|$)|certificado|transport)/i.test(changedPath), `Forbidden product path touched: ${changedPath}.`);
    assert(!(new RegExp(fiscalTransportTable, "i")).test(changedPath), `Fiscal transport path touched: ${changedPath}.`);
    assert(!changedPath.toLowerCase().endsWith(".pdf"), `PDF binary is not authorized: ${changedPath}.`);
  }
}

function validateApplyBlocked() {
  const bodies = [
    read("src/lib/local-data-safety/routeless-ui-harness-scope.ts"),
    read("src/lib/local-data-safety/import-restore-preview-state-machine.ts"),
    read("src/lib/local-data-safety/import-restore-review-session.ts"),
    read("src/lib/local-data-safety/recovery-snapshot-download-placeholder.ts"),
    read("src/lib/local-data-safety/import-restore-ux-legal-review-packet.ts"),
  ].join("\n");

  for (const required of [
    "importApplyAllowed: false",
    "restoreApplyAllowed: false",
    "applyImportAllowed: false",
    "applyRestoreAllowed: false",
    "mutated: false",
    "canStartDownload: false",
    "rawDataIncluded: false",
  ]) {
    assert(bodies.includes(required), `Final blocker evidence missing ${required}.`);
  }
  assert(!bodies.includes("importApplyAllowed: true"), "Import apply must not be enabled.");
  assert(!bodies.includes("restoreApplyAllowed: true"), "Restore apply must not be enabled.");
  assert(!bodies.includes("applyImportAllowed: true"), "Import apply must not be enabled.");
  assert(!bodies.includes("applyRestoreAllowed: true"), "Restore apply must not be enabled.");
  assert(!bodies.includes("canStartDownload: true"), "Recovery snapshot download must not be enabled.");
}

function validateFixturesSafe() {
  const body = read("src/lib/local-data-safety/import-restore-ui-fixtures.ts");
  for (const required of [
    "SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW",
    "SYNTHETIC_ONLY_PROTECTED_OVERWRITE_WARNING",
    "SYNTHETIC_ONLY_MALFORMED_BACKUP_REJECTED",
    "SYNTHETIC_ONLY_SNAPSHOT_MISMATCH_MANUAL_REVIEW",
    "SYNTHETIC_ONLY_NUMBERING_RISK_MANUAL_REVIEW",
    "SYNTHETIC_ONLY_EMPTY_BACKUP",
    "SYNTHETIC_ONLY_LARGE_LIST_PAGINATED",
  ]) {
    assert(body.includes(required), `Missing synthetic fixture ${required}.`);
  }
  assert(!new RegExp(`${"document" + "Snapshot"}\\s*:`).test(body), "Fixtures must not include full document snapshots.");
  assert(!new RegExp(`${"pdf" + "Snapshot"}\\s*:`).test(body), "Fixtures must not include full PDF snapshots.");
}

function validateDossier() {
  const compliance = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "routeless UI preview harness 2D.45-2D.56",
    "evidencia tecnica interna",
    "routeless UI preview harness",
    "fixtures sinteticos",
    "state machine de preview",
    "no UI conectada",
    "no ruta",
    "no navegación",
    "no localStorage write",
    "no import/restore apply",
    "sin producción",
    "sin Supabase",
    "sin documentos reales",
    "PHASE2D_ROUTELESS_IMPORT_RESTORE_UI_PREVIEW_HARNESS: READY FOR UX_LEGAL_REVIEW / NO WIRING / NO APPLY",
  ]) {
    assert(compliance.includes(required), `Compliance dossier missing ${required}.`);
  }
  for (const forbidden of [
    "UI productiva",
    "import aplicado",
    "restore aplicado",
    "backup automático productivo",
    "cumplimiento cerrado",
    "certificación cerrada",
    "declaración responsable lista",
  ]) {
    assert(!compliance.includes(forbidden), `Compliance dossier contains forbidden productive claim: ${forbidden}.`);
  }
}

function validateCheckpoint() {
  const checkpoint = read("docs/phase2d56-routeless-import-restore-ui-preview-harness-checkpoint-v1.md");
  for (const required of [
    "PHASE2D56_ROUTELESS_IMPORT_RESTORE_UI_PREVIEW_HARNESS_CHECKPOINT_V1",
    "PHASE2D_ROUTELESS_IMPORT_RESTORE_UI_PREVIEW_HARNESS: READY FOR UX_LEGAL_REVIEW / NO WIRING / NO APPLY",
    "NO ROUTE",
    "NO NAVIGATION",
    "NO LOCALSTORAGE READ",
    "NO LOCALSTORAGE WRITE",
    "NO FILE PICKER REAL",
    "NO DOWNLOAD",
    "NO IMPORT APPLY",
    "NO RESTORE APPLY",
    "NO REAL DATA",
    "NO SUPABASE",
    "NO PRODUCTION",
  ]) {
    assert(checkpoint.includes(required), `Checkpoint missing ${required}.`);
  }
}

function validateCommon() {
  validateNoRedLines();
  validateNoRuntimeSideEffects();
  validateComponentShell();
  validateNoConnectedUi();
  validateApplyBlocked();
}

export function runValidator(label, validate) {
  const errors = [];
  try {
    validateCommon();
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

export function validatePhase2D45() {
  assertPackageScript("validate:phase2d45-routeless-import-restore-ui-harness-scope");
  assertIncludes("src/lib/local-data-safety/routeless-ui-harness-scope.ts", "PHASE2D45_ROUTELESS_IMPORT_RESTORE_UI_HARNESS_SCOPE_V1");
  assertIncludes("docs/phase2d45-routeless-import-restore-ui-harness-scope-v1.md", "PHASE2D45_ROUTELESS_IMPORT_RESTORE_UI_HARNESS_SCOPE_V1");
  for (const required of [
    "evaluateRoutelessImportRestoreUiHarnessScope",
    "buildRoutelessImportRestoreUiHarnessBlockers",
    "summarizeRoutelessImportRestoreUiHarnessScope",
    "blocked_by_default",
    "preview_harness_ready",
    "ready_for_ux_review",
    "rejected",
  ]) {
    assertIncludes("src/lib/local-data-safety/routeless-ui-harness-scope.ts", required);
  }
  runVitest("src/lib/local-data-safety/routeless-ui-harness-scope.test.ts");
}

export function validatePhase2D46() {
  assertPackageScript("validate:phase2d46-import-restore-synthetic-ui-fixtures");
  assertIncludes("src/lib/local-data-safety/import-restore-ui-fixtures.ts", "PHASE2D46_IMPORT_RESTORE_SYNTHETIC_UI_FIXTURES_V1");
  assertIncludes("docs/phase2d46-import-restore-synthetic-ui-fixtures-v1.md", "PHASE2D46_IMPORT_RESTORE_SYNTHETIC_UI_FIXTURES_V1");
  for (const required of [
    "getImportRestoreSyntheticUiFixture",
    "listImportRestoreSyntheticUiFixtures",
    "validateImportRestoreSyntheticUiFixture",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-ui-fixtures.ts", required);
  }
  validateFixturesSafe();
  runVitest("src/lib/local-data-safety/import-restore-ui-fixtures.test.ts");
}

export function validatePhase2D47() {
  assertPackageScript("validate:phase2d47-import-restore-preview-flow-state-machine");
  assertIncludes("src/lib/local-data-safety/import-restore-preview-state-machine.ts", "PHASE2D47_IMPORT_RESTORE_PREVIEW_FLOW_STATE_MACHINE_V1");
  assertIncludes("docs/phase2d47-import-restore-preview-flow-state-machine-v1.md", "PHASE2D47_IMPORT_RESTORE_PREVIEW_FLOW_STATE_MACHINE_V1");
  for (const required of [
    "idle_disabled",
    "fixture_selected",
    "parsing_preview",
    "validation_ready",
    "review_ready",
    "manual_review_required",
    "apply_blocked",
    "error_safe",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-preview-state-machine.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-preview-state-machine.test.ts");
}

export function validatePhase2D48() {
  assertPackageScript("validate:phase2d48-import-restore-review-session-model");
  assertIncludes("src/lib/local-data-safety/import-restore-review-session.ts", "PHASE2D48_IMPORT_RESTORE_REVIEW_SESSION_MODEL_V1");
  assertIncludes("docs/phase2d48-import-restore-review-session-model-v1.md", "PHASE2D48_IMPORT_RESTORE_REVIEW_SESSION_MODEL_V1");
  for (const required of [
    "createImportRestoreReviewSession",
    "updateImportRestoreReviewSession",
    "summarizeImportRestoreReviewSession",
    "persisted: false",
    "fullBackupIncluded: false",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-review-session.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-review-session.test.ts");
}

export function validatePhase2D49() {
  assertPackageScript("validate:phase2d49-import-restore-data-loss-warning-model");
  assertIncludes("src/lib/local-data-safety/import-restore-data-loss-warning.ts", "PHASE2D49_IMPORT_RESTORE_DATA_LOSS_WARNING_MODEL_V1");
  assertIncludes("docs/phase2d49-import-restore-data-loss-warning-model-v1.md", "PHASE2D49_IMPORT_RESTORE_DATA_LOSS_WARNING_MODEL_V1");
  for (const required of [
    "buildImportRestoreDataLossWarnings",
    "summarizeImportRestoreDataLossWarnings",
    "protected_documents",
    "snapshot_mismatch",
    "numbering_risk",
    "backup_older_or_unknown",
    "malformed_backup",
    "apply_disabled",
    "backup_before_future_actions",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-data-loss-warning.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-data-loss-warning.test.ts");
}

export function validatePhase2D50() {
  assertPackageScript("validate:phase2d50-disabled-recovery-snapshot-download-placeholder");
  assertIncludes("src/lib/local-data-safety/recovery-snapshot-download-placeholder.ts", "PHASE2D50_DISABLED_RECOVERY_SNAPSHOT_DOWNLOAD_PLACEHOLDER_V1");
  assertIncludes("docs/phase2d50-disabled-recovery-snapshot-download-placeholder-v1.md", "PHASE2D50_DISABLED_RECOVERY_SNAPSHOT_DOWNLOAD_PLACEHOLDER_V1");
  for (const required of [
    "buildDisabledRecoverySnapshotDownloadPlaceholder",
    "assertRecoverySnapshotDownloadDisabled",
    "summarizeRecoverySnapshotDownloadPlaceholder",
    "canStartDownload: false",
  ]) {
    assertIncludes("src/lib/local-data-safety/recovery-snapshot-download-placeholder.ts", required);
  }
  runVitest("src/lib/local-data-safety/recovery-snapshot-download-placeholder.test.ts");
}

export function validatePhase2D51() {
  assertPackageScript("validate:phase2d51-import-restore-ux-legal-review-packet");
  assertIncludes("src/lib/local-data-safety/import-restore-ux-legal-review-packet.ts", "PHASE2D51_IMPORT_RESTORE_UX_LEGAL_REVIEW_PACKET_V1");
  assertIncludes("docs/phase2d51-import-restore-ux-legal-review-packet-v1.md", "PHASE2D51_IMPORT_RESTORE_UX_LEGAL_REVIEW_PACKET_V1");
  for (const required of [
    "buildImportRestoreUxLegalReviewPacket",
    "redactImportRestoreUxLegalReviewPacket",
    "assertImportRestoreUxLegalReviewPacketSafe",
    "rawDataIncluded: false",
    "imageIncluded: false",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-ux-legal-review-packet.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-ux-legal-review-packet.test.ts");
}

export function validatePhase2D52() {
  assertPackageScript("validate:phase2d52-routeless-import-restore-ui-interaction-acceptance");
  assertPackageScript("test:phase2d52-routeless-import-restore-ui-interaction-acceptance");
  assertIncludes("scripts/phase2d52-routeless-import-restore-ui-interaction-acceptance.test.ts", "PHASE2D52_ROUTELESS_IMPORT_RESTORE_UI_INTERACTION_ACCEPTANCE_V1");
  assertIncludes("docs/phase2d52-routeless-import-restore-ui-interaction-acceptance-v1.md", "PHASE2D52_ROUTELESS_IMPORT_RESTORE_UI_INTERACTION_ACCEPTANCE_V1");
  runVitest("scripts/phase2d52-routeless-import-restore-ui-interaction-acceptance.test.ts");
}

export function validatePhase2D53() {
  assertPackageScript("validate:phase2d53-import-restore-visual-copy-regression-acceptance");
  assertPackageScript("test:phase2d53-import-restore-visual-copy-regression-acceptance");
  assertIncludes("scripts/phase2d53-import-restore-visual-copy-regression-acceptance.test.ts", "PHASE2D53_IMPORT_RESTORE_VISUAL_COPY_REGRESSION_ACCEPTANCE_V1");
  assertIncludes("docs/phase2d53-import-restore-visual-copy-regression-acceptance-v1.md", "PHASE2D53_IMPORT_RESTORE_VISUAL_COPY_REGRESSION_ACCEPTANCE_V1");
  runVitest("scripts/phase2d53-import-restore-visual-copy-regression-acceptance.test.ts");
}

export function validatePhase2D54() {
  assertPackageScript("validate:phase2d54-import-restore-wiring-final-blockers");
  assertPackageScript("test:phase2d54-import-restore-wiring-final-blockers");
  assertIncludes("scripts/phase2d54-import-restore-wiring-final-blockers.test.ts", "PHASE2D54_IMPORT_RESTORE_WIRING_FINAL_BLOCKERS_V1");
  assertIncludes("docs/phase2d54-import-restore-wiring-final-blockers-v1.md", "PHASE2D54_IMPORT_RESTORE_WIRING_FINAL_BLOCKERS_V1");
  runVitest("scripts/phase2d54-import-restore-wiring-final-blockers.test.ts");
}

export function validatePhase2D56() {
  assertPackageScript("validate:phase2d45-56-routeless-import-restore-ui-preview-harness");
  assertIncludes("src/lib/local-data-safety/index.ts", "PHASE2D45_56_ROUTELESS_IMPORT_RESTORE_UI_PREVIEW_HARNESS_V1");
  validateCheckpoint();
  validateDossier();
}

export function validatePhase2D45To56() {
  validatePhase2D45();
  validatePhase2D46();
  validatePhase2D47();
  validatePhase2D48();
  validatePhase2D49();
  validatePhase2D50();
  validatePhase2D51();
  validatePhase2D52();
  validatePhase2D53();
  validatePhase2D54();
  validatePhase2D56();
}
