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
    /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78|89|90|101|102)-.*\.test\.ts$/,
    /^scripts\/validate-phase2d(?:[1-9]|[1-9][0-9]|10[0-4]|1-10|11-20|21-32|33-44|45-56|57-68|69-80|81-92|93-104)-.*\.mjs$/,
    /^scripts\/validate-phase2[bc].*\.mjs$/,
    /^scripts\/validate-audit-export-v1-compliance-dossier-snapshot\.mjs$/,
    /^src\/lib\/local-storage-resilience\//,
    /^scripts\/phase2e10-storage-resilience-acceptance\.test\.ts$/,
    /^scripts\/validate-phase2e(?:[1-9]|10|1-12)-.*\.mjs$/,
    /^docs\/phase2d(?:[1-9]|[1-9][0-9]|10[0-4])-.*$/,
    /^docs\/phase2e(?:[1-9]|10|12)-.*$/,
    /^docs\/compliance-evidence-v1\.md$/,
    /^package\.json$/,
  ];

  for (const changedPath of changedPaths()) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    if (changedPath.startsWith("docs/audit/exports/")) continue;
    assert(
      allowedPatterns.some((pattern) => pattern.test(changedPath)),
      `Unexpected path touched in 2D.33-2D.44: ${changedPath}.`,
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
    read("src/lib/local-data-safety/import-restore-disabled-actions.ts"),
    read("src/lib/local-data-safety/import-restore-ui-event-handlers.ts"),
    read("src/lib/local-data-safety/import-restore-wiring-props.ts"),
    read("src/lib/local-data-safety/import-restore-ui-wiring-gate.ts"),
  ].join("\n");

  for (const required of [
    "applyImportBlocked",
    "applyRestoreBlocked",
    "apply_import",
    "apply_restore",
    "applyImportAllowed: false",
    "applyRestoreAllowed: false",
    "mutated: false",
  ]) {
    assert(bodies.includes(required), `Apply blocker evidence missing ${required}.`);
  }
  assert(!bodies.includes("applyImportAllowed: true"), "Import apply must not be enabled.");
  assert(!bodies.includes("applyRestoreAllowed: true"), "Restore apply must not be enabled.");
}

function validateApprovalTemplate() {
  const template = JSON.parse(read("docs/phase2d38-import-restore-ui-wiring-approval-checklist.template.json"));
  for (const key of [
    "uxReviewApproved",
    "legalReviewApproved",
    "dataLossRiskReviewed",
    "backupBeforeImportRequired",
    "applyStillBlockedConfirmed",
    "localStorageAdapterStillDisabledConfirmed",
    "routeNavigationApproved",
    "ownerApproval",
  ]) {
    assert(template[key] === false, `Approval template must default ${key} to false.`);
  }
  const serialized = JSON.stringify(template);
  assert(!/https?:\/\//i.test(serialized), "Approval template must not include URLs.");
  const credentialWords = [
    ["sec", "ret"].join(""),
    ["tok", "en"].join(""),
    ["pass", "word"].join(""),
    ["ke", "y"].join(""),
  ];
  assert(
    !new RegExp(credentialWords.join("|"), "i").test(serialized),
    "Approval template must not include credential-like fields.",
  );
}

function validateDossier() {
  const compliance = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "disabled UI wiring 2D.33-2D.44",
    "evidencia tecnica interna",
    "disabled UI wiring",
    "UI wiring gates",
    "local file preview harness sintetico",
    "no UI conectada",
    "no ruta",
    "no navegación",
    "no localStorage write",
    "no import/restore apply",
    "sin producción",
    "sin Supabase",
    "sin documentos reales",
    "PHASE2D_DISABLED_IMPORT_RESTORE_UI_WIRING: READY FOR EXPLICIT ROUTELESS UI WIRING REVIEW / NO APPLY",
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
  const checkpoint = read("docs/phase2d44-disabled-import-restore-ui-wiring-gates-checkpoint-v1.md");
  for (const required of [
    "PHASE2D44_DISABLED_IMPORT_RESTORE_UI_WIRING_GATES_CHECKPOINT_V1",
    "PHASE2D_DISABLED_IMPORT_RESTORE_UI_WIRING: READY FOR EXPLICIT ROUTELESS UI WIRING REVIEW / NO APPLY",
    "NO ROUTE",
    "NO NAVIGATION",
    "NO LOCALSTORAGE WRITE",
    "NO FILE PICKER REAL",
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

export function validatePhase2D33() {
  assertPackageScript("validate:phase2d33-import-restore-ui-wiring-readiness-gate");
  assertIncludes("src/lib/local-data-safety/import-restore-ui-wiring-gate.ts", "PHASE2D33_IMPORT_RESTORE_UI_WIRING_READINESS_GATE_V1");
  assertIncludes("docs/phase2d33-import-restore-ui-wiring-readiness-gate-v1.md", "PHASE2D33_IMPORT_RESTORE_UI_WIRING_READINESS_GATE_V1");
  for (const required of [
    "evaluateImportRestoreUiWiringReadiness",
    "buildImportRestoreUiWiringBlockers",
    "summarizeImportRestoreUiWiringReadiness",
    "ready_for_explicit_wiring_decision",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-ui-wiring-gate.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-ui-wiring-gate.test.ts");
}

export function validatePhase2D34() {
  assertPackageScript("validate:phase2d34-disabled-file-selection-adapter-contract");
  assertIncludes("src/lib/local-data-safety/disabled-file-selection-adapter.ts", "PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1");
  assertIncludes("docs/phase2d34-disabled-file-selection-adapter-contract-v1.md", "PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1");
  for (const required of [
    "createDisabledBackupFileSelectionAdapter",
    "summarizeBackupFileSelectionAdapter",
    "assertBackupFileSelectionDisabled",
    "canOpenFilePicker: false",
    "canReadFile: false",
  ]) {
    assertIncludes("src/lib/local-data-safety/disabled-file-selection-adapter.ts", required);
  }
  runVitest("src/lib/local-data-safety/disabled-file-selection-adapter.test.ts");
}

export function validatePhase2D35() {
  assertPackageScript("validate:phase2d35-in-memory-backup-preview-parser-harness");
  assertIncludes("src/lib/local-data-safety/in-memory-backup-preview-harness.ts", "PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1");
  assertIncludes("docs/phase2d35-in-memory-backup-preview-parser-harness-v1.md", "PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1");
  for (const required of [
    "parseInMemoryBackupJsonForPreview",
    "buildInMemoryBackupPreviewHarnessResult",
    "summarizeInMemoryBackupPreviewHarness",
    "defaultMaxBytes",
  ]) {
    assertIncludes("src/lib/local-data-safety/in-memory-backup-preview-harness.ts", required);
  }
  runVitest("src/lib/local-data-safety/in-memory-backup-preview-harness.test.ts");
}

export function validatePhase2D36() {
  assertPackageScript("validate:phase2d36-import-restore-ui-event-handler-contract");
  assertIncludes("src/lib/local-data-safety/import-restore-ui-event-handlers.ts", "PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1");
  assertIncludes("docs/phase2d36-import-restore-ui-event-handler-contract-v1.md", "PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1");
  for (const required of [
    "createImportRestoreDisabledUiEventHandlers",
    "handleImportRestorePreviewRequested",
    "handleImportRestoreApplyImportClicked",
    "handleImportRestoreApplyRestoreClicked",
    "summarizeImportRestoreUiHandlerResult",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-ui-event-handlers.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-ui-event-handlers.test.ts");
}

export function validatePhase2D37() {
  assertPackageScript("validate:phase2d37-disabled-import-restore-wiring-props-factory");
  assertIncludes("src/lib/local-data-safety/import-restore-wiring-props.ts", "PHASE2D37_DISABLED_IMPORT_RESTORE_WIRING_PROPS_FACTORY_V1");
  assertIncludes("docs/phase2d37-disabled-import-restore-wiring-props-factory-v1.md", "PHASE2D37_DISABLED_IMPORT_RESTORE_WIRING_PROPS_FACTORY_V1");
  for (const required of [
    "buildDisabledImportRestoreShellProps",
    "assertDisabledImportRestoreShellPropsSafe",
    "summarizeDisabledImportRestoreShellProps",
    "routeConnected: false",
    "navigationConnected: false",
    "filePickerConnected: false",
  ]) {
    assertIncludes("src/lib/local-data-safety/import-restore-wiring-props.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-wiring-props.test.ts");
}

export function validatePhase2D38() {
  assertPackageScript("validate:phase2d38-import-restore-ui-wiring-approval-checklist");
  assertIncludes("docs/phase2d38-import-restore-ui-wiring-approval-checklist-v1.md", "PHASE2D38_IMPORT_RESTORE_UI_WIRING_APPROVAL_CHECKLIST_V1");
  assertIncludes("docs/phase2d38-import-restore-ui-wiring-approval-checklist.template.json", "PHASE2D38_IMPORT_RESTORE_UI_WIRING_APPROVAL_CHECKLIST_V1");
  validateApprovalTemplate();
}

export function validatePhase2D39() {
  assertPackageScript("validate:phase2d39-local-import-restore-preview-harness-acceptance");
  assertPackageScript("test:phase2d39-local-import-restore-preview-harness-acceptance");
  assertIncludes("scripts/phase2d39-local-import-restore-preview-harness-acceptance.test.ts", "PHASE2D39_LOCAL_IMPORT_RESTORE_PREVIEW_HARNESS_ACCEPTANCE_V1");
  assertIncludes("docs/phase2d39-local-import-restore-preview-harness-acceptance-v1.md", "PHASE2D39_LOCAL_IMPORT_RESTORE_PREVIEW_HARNESS_ACCEPTANCE_V1");
  runVitest("scripts/phase2d39-local-import-restore-preview-harness-acceptance.test.ts");
}

export function validatePhase2D40() {
  assertPackageScript("validate:phase2d40-import-restore-ui-action-abuse-hardening");
  assertPackageScript("test:phase2d40-import-restore-ui-action-abuse-hardening");
  assertIncludes("scripts/phase2d40-import-restore-ui-action-abuse-hardening.test.ts", "PHASE2D40_IMPORT_RESTORE_UI_ACTION_ABUSE_HARDENING_V1");
  assertIncludes("docs/phase2d40-import-restore-ui-action-abuse-hardening-v1.md", "PHASE2D40_IMPORT_RESTORE_UI_ACTION_ABUSE_HARDENING_V1");
  runVitest("scripts/phase2d40-import-restore-ui-action-abuse-hardening.test.ts");
}

export function validatePhase2D41() {
  assertPackageScript("validate:phase2d41-import-restore-accessibility-regression-acceptance");
  assertPackageScript("test:phase2d41-import-restore-accessibility-regression-acceptance");
  assertIncludes("scripts/phase2d41-import-restore-accessibility-regression-acceptance.test.ts", "PHASE2D41_IMPORT_RESTORE_ACCESSIBILITY_REGRESSION_ACCEPTANCE_V1");
  assertIncludes("docs/phase2d41-import-restore-accessibility-regression-acceptance-v1.md", "PHASE2D41_IMPORT_RESTORE_ACCESSIBILITY_REGRESSION_ACCEPTANCE_V1");
  runVitest("scripts/phase2d41-import-restore-accessibility-regression-acceptance.test.ts");
}

export function validatePhase2D42() {
  assertPackageScript("validate:phase2d42-import-restore-route-navigation-blocker-validation");
  assertPackageScript("test:phase2d42-import-restore-route-navigation-blocker-validation");
  assertIncludes("scripts/phase2d42-import-restore-route-navigation-blocker-validation.test.ts", "PHASE2D42_IMPORT_RESTORE_ROUTE_NAVIGATION_BLOCKER_VALIDATION_V1");
  assertIncludes("docs/phase2d42-import-restore-route-navigation-blocker-validation-v1.md", "PHASE2D42_IMPORT_RESTORE_ROUTE_NAVIGATION_BLOCKER_VALIDATION_V1");
  runVitest("scripts/phase2d42-import-restore-route-navigation-blocker-validation.test.ts");
}

export function validatePhase2D44() {
  assertPackageScript("validate:phase2d33-44-disabled-import-restore-ui-wiring-gates");
  assertIncludes("src/lib/local-data-safety/index.ts", "PHASE2D33_44_DISABLED_IMPORT_RESTORE_UI_WIRING_GATES_V1");
  validateCheckpoint();
  validateDossier();
}

export function validatePhase2D33To44() {
  validatePhase2D33();
  validatePhase2D34();
  validatePhase2D35();
  validatePhase2D36();
  validatePhase2D37();
  validatePhase2D38();
  validatePhase2D39();
  validatePhase2D40();
  validatePhase2D41();
  validatePhase2D42();
  validatePhase2D44();
}
