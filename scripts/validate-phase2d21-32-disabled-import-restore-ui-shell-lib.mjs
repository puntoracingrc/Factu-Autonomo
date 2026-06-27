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

function validateNoRuntimeSideEffects() {
  const forbidden = [
    ["browser storage global", /\blocalStorage\b/],
    ["storage write method", /\.(?:setItem|removeItem|clear)\s*\(/],
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
    /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78)-.*\.test\.ts$/,
    /^scripts\/validate-phase2d(?:[1-9]|[1-7][0-9]|80|1-10|11-20|21-32|33-44|45-56|57-68|69-80)-.*\.mjs$/,
    /^scripts\/validate-phase2[bc].*\.mjs$/,
    /^scripts\/validate-audit-export-v1-compliance-dossier-snapshot\.mjs$/,
    /^docs\/phase2d(?:[1-9]|[1-7][0-9]|80)-.*$/,
    /^docs\/compliance-evidence-v1\.md$/,
    /^package\.json$/,
  ];

  for (const changedPath of changedPaths) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    if (changedPath.startsWith("docs/audit/exports/")) continue;
    assert(
      allowedPatterns.some((pattern) => pattern.test(changedPath)),
      `Unexpected path touched in 2D.21-2D.32: ${changedPath}.`,
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
    assert(!/fiscal_transport_attempts/i.test(changedPath), `Fiscal transport path touched: ${changedPath}.`);
    assert(!changedPath.toLowerCase().endsWith(".pdf"), `PDF binary is not authorized: ${changedPath}.`);
  }
}

function validateApplyBlocked() {
  const disabledActions = read("src/lib/local-data-safety/import-restore-disabled-actions.ts");
  const viewModel = read("src/lib/local-data-safety/import-restore-view-model.ts");
  for (const required of [
    "applyImportBlocked: true",
    "applyRestoreBlocked: true",
    "apply_import",
    "apply_restore",
    "blocked",
  ]) {
    assert(disabledActions.includes(required) || viewModel.includes(required), `Apply blocker evidence missing ${required}.`);
  }
  assert(!disabledActions.includes("disabled: false"), "Disabled action model must not enable actions.");
  assert(!viewModel.includes("allowApplyImport: true"), "View model must not allow import apply.");
  assert(!viewModel.includes("allowApplyRestore: true"), "View model must not allow restore apply.");
}

function validateDossier() {
  const compliance = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "disabled UI shell 2D.21-2D.32",
    "evidencia tecnica interna",
    "disabled UI shell",
    "view models seguros",
    "no UI conectada",
    "no rutas",
    "no navegación",
    "no localStorage write",
    "no import/restore apply",
    "sin producción",
    "sin Supabase",
    "sin documentos reales",
    "PHASE2D_DISABLED_IMPORT_RESTORE_UI_SHELL: READY FOR EXPLICIT UI WIRING DECISION / NO APPLY",
  ]) {
    assert(compliance.includes(required), `Compliance dossier missing ${required}.`);
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

export function validatePhase2D21() {
  assertPackageScript("validate:phase2d21-disabled-import-restore-ui-shell-scope");
  assertIncludes("src/lib/local-data-safety/ui-shell-scope.ts", "PHASE2D21_DISABLED_IMPORT_RESTORE_UI_SHELL_SCOPE_V1");
  assertIncludes("docs/phase2d21-disabled-import-restore-ui-shell-scope-v1.md", "PHASE2D21_DISABLED_IMPORT_RESTORE_UI_SHELL_SCOPE_V1");
  for (const required of ["evaluateLocalDataSafetyUiShellScope", "summarizeLocalDataSafetyUiShellScope"]) {
    assertIncludes("src/lib/local-data-safety/ui-shell-scope.ts", required);
  }
  runVitest("src/lib/local-data-safety/ui-shell-scope.test.ts");
}

export function validatePhase2D22() {
  assertPackageScript("validate:phase2d22-import-restore-review-view-model");
  assertIncludes("src/lib/local-data-safety/import-restore-view-model.ts", "PHASE2D22_IMPORT_RESTORE_REVIEW_VIEW_MODEL_V1");
  assertIncludes("docs/phase2d22-import-restore-review-view-model-v1.md", "PHASE2D22_IMPORT_RESTORE_REVIEW_VIEW_MODEL_V1");
  for (const required of ["buildImportRestoreReviewViewModel", "summarizeImportRestoreReviewViewModel", "assertImportRestoreReviewViewModelSafe"]) {
    assertIncludes("src/lib/local-data-safety/import-restore-view-model.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-view-model.test.ts");
}

export function validatePhase2D23() {
  assertPackageScript("validate:phase2d23-import-restore-disabled-action-model");
  assertIncludes("src/lib/local-data-safety/import-restore-disabled-actions.ts", "PHASE2D23_IMPORT_RESTORE_DISABLED_ACTION_MODEL_V1");
  assertIncludes("docs/phase2d23-import-restore-disabled-action-model-v1.md", "PHASE2D23_IMPORT_RESTORE_DISABLED_ACTION_MODEL_V1");
  for (const required of ["buildImportRestoreDisabledActions", "assertImportRestoreActionBlocked", "summarizeImportRestoreDisabledActions"]) {
    assertIncludes("src/lib/local-data-safety/import-restore-disabled-actions.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-disabled-actions.test.ts");
}

export function validatePhase2D24() {
  assertPackageScript("validate:phase2d24-disabled-import-restore-react-shell");
  assertIncludes("src/components/local-data-safety/ImportRestoreReviewShell.tsx", "PHASE2D24_DISABLED_IMPORT_RESTORE_REACT_SHELL_V1");
  assertIncludes("docs/phase2d24-disabled-import-restore-react-shell-v1.md", "PHASE2D24_DISABLED_IMPORT_RESTORE_REACT_SHELL_V1");
  assertIncludes("src/components/local-data-safety/index.ts", "ImportRestoreReviewShell");
  runVitest("src/components/local-data-safety/ImportRestoreReviewShell.test.tsx");
}

export function validatePhase2D25() {
  assertPackageScript("validate:phase2d25-import-restore-copy-accessibility-contract");
  assertIncludes("src/lib/local-data-safety/import-restore-copy.ts", "PHASE2D25_IMPORT_RESTORE_COPY_ACCESSIBILITY_CONTRACT_V1");
  assertIncludes("docs/phase2d25-import-restore-copy-accessibility-contract-v1.md", "PHASE2D25_IMPORT_RESTORE_COPY_ACCESSIBILITY_CONTRACT_V1");
  for (const required of ["Vista previa", "No se aplicaran cambios", "validateImportRestoreReviewCopy"]) {
    assertIncludes("src/lib/local-data-safety/import-restore-copy.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-copy.test.ts");
}

export function validatePhase2D26() {
  assertPackageScript("validate:phase2d26-import-restore-preview-list-model");
  assertIncludes("src/lib/local-data-safety/import-restore-preview-list.ts", "PHASE2D26_IMPORT_RESTORE_PREVIEW_LIST_MODEL_V1");
  assertIncludes("docs/phase2d26-import-restore-preview-list-model-v1.md", "PHASE2D26_IMPORT_RESTORE_PREVIEW_LIST_MODEL_V1");
  for (const required of ["buildImportRestorePreviewList", "paginateImportRestorePreviewItems", "summarizeImportRestorePreviewList"]) {
    assertIncludes("src/lib/local-data-safety/import-restore-preview-list.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-preview-list.test.ts");
}

export function validatePhase2D27() {
  assertPackageScript("validate:phase2d27-import-restore-safe-error-presenter");
  assertIncludes("src/lib/local-data-safety/import-restore-error-presenter.ts", "PHASE2D27_IMPORT_RESTORE_SAFE_ERROR_PRESENTER_V1");
  assertIncludes("docs/phase2d27-import-restore-safe-error-presenter-v1.md", "PHASE2D27_IMPORT_RESTORE_SAFE_ERROR_PRESENTER_V1");
  for (const required of ["buildImportRestoreSafeErrorPresentation", "redactImportRestoreErrorForDisplay", "assertImportRestoreErrorPresentationSafe"]) {
    assertIncludes("src/lib/local-data-safety/import-restore-error-presenter.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-error-presenter.test.ts");
}

export function validatePhase2D28() {
  assertPackageScript("validate:phase2d28-import-restore-ui-audit-event-model");
  assertIncludes("src/lib/local-data-safety/import-restore-ui-audit.ts", "PHASE2D28_IMPORT_RESTORE_UI_AUDIT_EVENT_MODEL_V1");
  assertIncludes("docs/phase2d28-import-restore-ui-audit-event-model-v1.md", "PHASE2D28_IMPORT_RESTORE_UI_AUDIT_EVENT_MODEL_V1");
  for (const required of ["buildImportRestoreUiAuditEvent", "assertImportRestoreUiAuditEventSafe", "createInMemoryImportRestoreUiAuditSink"]) {
    assertIncludes("src/lib/local-data-safety/import-restore-ui-audit.ts", required);
  }
  runVitest("src/lib/local-data-safety/import-restore-ui-audit.test.ts");
}

export function validatePhase2D29() {
  assertPackageScript("validate:phase2d29-import-restore-ui-facing-data-hardening");
  assertPackageScript("test:phase2d29-import-restore-ui-facing-data-hardening");
  assertIncludes("scripts/phase2d29-import-restore-ui-facing-data-hardening.test.ts", "PHASE2D29_IMPORT_RESTORE_UI_FACING_DATA_HARDENING_V1");
  assertIncludes("docs/phase2d29-import-restore-ui-facing-data-hardening-v1.md", "PHASE2D29_IMPORT_RESTORE_UI_FACING_DATA_HARDENING_V1");
  runVitest("scripts/phase2d29-import-restore-ui-facing-data-hardening.test.ts");
}

export function validatePhase2D30() {
  assertPackageScript("validate:phase2d30-disabled-import-restore-ui-shell-acceptance");
  assertPackageScript("test:phase2d30-disabled-import-restore-ui-shell-acceptance");
  assertIncludes("scripts/phase2d30-disabled-import-restore-ui-shell-acceptance.test.ts", "PHASE2D30_DISABLED_IMPORT_RESTORE_UI_SHELL_ACCEPTANCE_V1");
  assertIncludes("docs/phase2d30-disabled-import-restore-ui-shell-acceptance-v1.md", "PHASE2D30_DISABLED_IMPORT_RESTORE_UI_SHELL_ACCEPTANCE_V1");
  runVitest("scripts/phase2d30-disabled-import-restore-ui-shell-acceptance.test.ts");
}

export function validatePhase2D32() {
  assertPackageScript("validate:phase2d21-32-disabled-import-restore-ui-shell");
  assertIncludes("docs/phase2d32-disabled-import-restore-ui-shell-checkpoint-v1.md", "PHASE2D32_DISABLED_IMPORT_RESTORE_UI_SHELL_CHECKPOINT_V1");
  const checkpoint = read("docs/phase2d32-disabled-import-restore-ui-shell-checkpoint-v1.md");
  for (const required of [
    "PHASE2D_DISABLED_IMPORT_RESTORE_UI_SHELL: READY FOR EXPLICIT UI WIRING DECISION / NO APPLY",
    "NO ROUTE",
    "NO NAVIGATION",
    "NO LOCALSTORAGE WRITE",
    "NO IMPORT APPLY",
    "NO RESTORE APPLY",
    "NO REAL DATA",
    "NO SUPABASE",
    "NO PRODUCTION",
    "COMPONENTS NOT WIRED",
  ]) {
    assert(checkpoint.includes(required), `Checkpoint missing ${required}.`);
  }
  validateDossier();
}

export function validatePhase2D21To32() {
  validatePhase2D21();
  validatePhase2D22();
  validatePhase2D23();
  validatePhase2D24();
  validatePhase2D25();
  validatePhase2D26();
  validatePhase2D27();
  validatePhase2D28();
  validatePhase2D29();
  validatePhase2D30();
  validatePhase2D32();
}
