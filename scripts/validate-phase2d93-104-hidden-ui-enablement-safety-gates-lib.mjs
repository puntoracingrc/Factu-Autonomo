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
  execFileSync(bin, args, { cwd: root, encoding: "utf8", stdio: "pipe" });
}

function runNpm(scriptName) {
  runBin("npm", ["run", scriptName]);
}

function runVitest(paths) {
  runBin("npx", ["vitest", "run", ...paths]);
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

function packageJson() {
  return JSON.parse(read("package.json") || "{}");
}

function assertPackageScript(scriptName) {
  assert(packageJson().scripts?.[scriptName], `Missing npm script ${scriptName}.`);
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

const fiscalTransportTable = ["fiscal", "transport", "attempts"].join("_");

export const phases = [
  {
    phase: "93",
    marker: "PHASE2D93_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_GATE_V1",
    code: "src/lib/local-data-safety/hidden-ui-enablement-gate.ts",
    test: "src/lib/local-data-safety/hidden-ui-enablement-gate.test.ts",
    doc: "docs/phase2d93-hidden-import-restore-ui-enablement-gate-v1.md",
    script: "validate:phase2d93-hidden-import-restore-ui-enablement-gate",
  },
  {
    phase: "94",
    marker: "PHASE2D94_HIDDEN_UI_ENABLEMENT_ENVIRONMENT_CONTRACT_V1",
    code: "src/lib/local-data-safety/hidden-ui-enablement-environment.ts",
    test: "src/lib/local-data-safety/hidden-ui-enablement-environment.test.ts",
    doc: "docs/phase2d94-hidden-ui-enablement-environment-contract-v1.md",
    script: "validate:phase2d94-hidden-ui-enablement-environment-contract",
  },
  {
    phase: "95",
    marker: "PHASE2D95_HIDDEN_UI_ENABLEMENT_APPROVAL_CHECKLIST_V1",
    doc: "docs/phase2d95-hidden-ui-enablement-approval-checklist-v1.md",
    script: "validate:phase2d95-hidden-ui-enablement-approval-checklist",
  },
  {
    phase: "96",
    marker: "PHASE2D96_IMPORT_RESTORE_UX_LEGAL_DATA_LOSS_FINAL_REVIEW_PACK_V1",
    code: "src/lib/local-data-safety/import-restore-final-review-pack.ts",
    test: "src/lib/local-data-safety/import-restore-final-review-pack.test.ts",
    doc: "docs/phase2d96-import-restore-ux-legal-data-loss-final-review-pack-v1.md",
    script: "validate:phase2d96-import-restore-ux-legal-data-loss-final-review-pack",
  },
  {
    phase: "97",
    marker: "PHASE2D97_IMPORT_RESTORE_NO_GO_CONDITIONS_REGISTRY_V1",
    code: "src/lib/local-data-safety/import-restore-no-go-conditions.ts",
    test: "src/lib/local-data-safety/import-restore-no-go-conditions.test.ts",
    doc: "docs/phase2d97-import-restore-no-go-conditions-registry-v1.md",
    script: "validate:phase2d97-import-restore-no-go-conditions-registry",
  },
  {
    phase: "98",
    marker: "PHASE2D98_HIDDEN_IMPORT_RESTORE_SHELL_READINESS_REPORT_V1",
    code: "src/lib/local-data-safety/hidden-shell-readiness-report.ts",
    test: "src/lib/local-data-safety/hidden-shell-readiness-report.test.ts",
    doc: "docs/phase2d98-hidden-import-restore-shell-readiness-report-v1.md",
    script: "validate:phase2d98-hidden-import-restore-shell-readiness-report",
  },
  {
    phase: "99",
    marker: "PHASE2D99_HIDDEN_UI_OWNER_DECISION_PACKET_V1",
    code: "src/lib/local-data-safety/hidden-ui-owner-decision-packet.ts",
    test: "src/lib/local-data-safety/hidden-ui-owner-decision-packet.test.ts",
    doc: "docs/phase2d99-hidden-ui-owner-decision-packet-v1.md",
    script: "validate:phase2d99-hidden-ui-owner-decision-packet",
  },
  {
    phase: "100",
    marker: "PHASE2D100_HIDDEN_UI_ENABLEMENT_DRY_RUN_STATE_MACHINE_V1",
    code: "src/lib/local-data-safety/hidden-ui-enablement-state-machine.ts",
    test: "src/lib/local-data-safety/hidden-ui-enablement-state-machine.test.ts",
    doc: "docs/phase2d100-hidden-ui-enablement-dry-run-state-machine-v1.md",
    script: "validate:phase2d100-hidden-ui-enablement-dry-run-state-machine",
  },
  {
    phase: "101",
    marker: "PHASE2D101_IMPORT_RESTORE_GLOBAL_NO_ROUTE_NO_STORAGE_REGRESSION_V1",
    test: "scripts/phase2d101-import-restore-global-no-route-no-storage-regression.test.ts",
    doc: "docs/phase2d101-import-restore-global-no-route-no-storage-regression-v1.md",
    script: "validate:phase2d101-import-restore-global-no-route-no-storage-regression",
    testScript: "test:phase2d101-import-restore-global-no-route-no-storage-regression",
  },
  {
    phase: "102",
    marker: "PHASE2D102_HIDDEN_UI_ENABLEMENT_BLOCKED_ACCEPTANCE_V1",
    test: "scripts/phase2d102-hidden-ui-enablement-blocked-acceptance.test.ts",
    doc: "docs/phase2d102-hidden-ui-enablement-blocked-acceptance-v1.md",
    script: "validate:phase2d102-hidden-ui-enablement-blocked-acceptance",
    testScript: "test:phase2d102-hidden-ui-enablement-blocked-acceptance",
  },
  {
    phase: "104",
    marker: "PHASE2D104_HIDDEN_UI_ENABLEMENT_SAFETY_GATES_CHECKPOINT_V1",
    doc: "docs/phase2d104-hidden-ui-enablement-safety-gates-checkpoint-v1.md",
    script: "validate:phase2d93-104-hidden-ui-enablement-safety-gates",
  },
];

const runtimeFiles = phases.map((entry) => entry.code).filter(Boolean);

function validateNoRedLines() {
  const allowedPatterns = [
    /^src\/lib\/local-data-safety\//,
    /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78|89|90|101|102)-.*\.test\.ts$/,
    /^scripts\/validate-phase2d(?:[1-9]|[1-9][0-9]|10[0-4]|1-10|11-20|21-32|33-44|45-56|57-68|69-80|81-92|93-104|93-104)-.*\.mjs$/,
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
      `Unexpected path touched in 2D.93-2D.104: ${changedPath}.`,
    );
    assert(!/^supabase\//.test(changedPath), `Supabase path touched: ${changedPath}.`);
    assert(!/vida/i.test(changedPath), `ViDA path touched: ${changedPath}.`);
    assert(!/^(?:src\/app|app|pages|public)\//.test(changedPath), `Route/public path touched: ${changedPath}.`);
    assert(!/^src\/components\//.test(changedPath), `Component path touched: ${changedPath}.`);
    assert(!/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath), `Vercel config touched: ${changedPath}.`);
    assert(!/(?:stripe|openai|importers|aeat|(?:^|[\/_-])qr(?:[\/_.-]|$)|(?:^|[\/_-])firma(?:[\/_.-]|$)|certificado|transport)/i.test(changedPath), `Forbidden product path touched: ${changedPath}.`);
    assert(!(new RegExp(fiscalTransportTable, "i")).test(changedPath), `Fiscal transport path touched: ${changedPath}.`);
    assert(!changedPath.toLowerCase().endsWith(".pdf"), `PDF binary is not authorized: ${changedPath}.`);
    assert(!changedPath.toLowerCase().endsWith(".xml"), `XML file is not authorized: ${changedPath}.`);
  }
}

function validateNoRuntimeSideEffects() {
  const forbidden = [
    ["browser storage global", /\blocalStorage\b/],
    ["real file reader", /\bFileReader\b|showOpenFilePicker|type\s*=\s*["']file["']/],
    ["binary download API", /\bBlob\b|createObjectURL|document\.createElement\(["']a["']\)|\.click\(\)/],
    ["Supabase package", /@supabase\/supabase-js/i],
    ["network fetch", /\bfetch\s*\(/],
    ["http module", /node:http|node:https|from ["']http["']|from ["']https["']/],
    ["axios", /\baxios\b/],
    ["environment read", /process\.env/],
    ["Next router", /next\/link|next\/navigation|useRouter|redirect\(|router\./],
    ["route attribute", /href\s*=|data-route/],
    ["enabled apply flag", /applyImportAllowed:\s*true|applyRestoreAllowed:\s*true/],
    ["external fiscal boundary", /AEAT|VeriFactu|ViDA|certificado|transporte|firma|<\?xml/i],
    ["Vercel config surface", /vercel\.json|domains|aliases|promote/i],
  ];

  for (const relativePath of runtimeFiles) {
    const source = read(relativePath);
    for (const [label, pattern] of forbidden) {
      assert(!pattern.test(source), `${relativePath} contains forbidden ${label}.`);
    }
    assert(
      /enablementAllowed:\s*false/.test(source) ||
        /authorizesEnablement:\s*false/.test(source) ||
        /applyImportAllowed:\s*false/.test(source),
      `${relativePath} must keep enablement or apply false.`,
    );
    assert(/safe:\s*true/.test(source), `${relativePath} must expose safe true.`);
  }
}

function validateChecklist() {
  const checklistPath = "docs/phase2d95-hidden-ui-enablement-approval-checklist.template.json";
  assertFile(checklistPath);
  const checklist = JSON.parse(read(checklistPath));
  assert(checklist.marker === "PHASE2D95_HIDDEN_UI_ENABLEMENT_APPROVAL_CHECKLIST_V1", "Approval checklist marker mismatch.");
  for (const [key, value] of Object.entries(checklist)) {
    if (key === "marker") continue;
    assert(value === false, `Approval checklist ${key} must default to false.`);
  }
  assert(!JSON.stringify(checklist).match(/https?:\/\/|token|secret|production/i), "Approval checklist contains forbidden material.");
}

function validateExports() {
  const libIndex = read("src/lib/local-data-safety/index.ts");
  assert(libIndex.includes("PHASE2D93_104_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_SAFETY_GATES_V1"), "Local data safety index missing 2D.93-104 marker.");
  for (const symbol of [
    "evaluateHiddenImportRestoreUiEnablementGate",
    "evaluateHiddenUiEnablementEnvironment",
    "buildImportRestoreFinalReviewPack",
    "evaluateImportRestoreNoGoConditions",
    "buildHiddenImportRestoreShellReadinessReport",
    "buildHiddenUiOwnerDecisionPacket",
    "createHiddenUiEnablementDryRunStateMachine",
  ]) {
    assert(libIndex.includes(symbol), `Local data safety index missing export ${symbol}.`);
  }
}

function validateDossier() {
  const dossier = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "2D.93-2D.104",
    "PHASE2D93_104_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_SAFETY_GATES_V1",
    "hidden UI enablement safety gates",
    "UI routeless",
    "no UI activa",
    "no ruta",
    "no navegación",
    "no localStorage read/write",
    "sin producción",
    "sin Supabase",
    "sin documentos reales",
  ]) {
    assert(dossier.includes(required), `Compliance dossier missing ${required}.`);
  }
  assert(!/cumplimiento cerrado|declaraci[oó]n responsable lista|UI productiva|import aplicado|restore aplicado/i.test(dossier), "Compliance dossier contains forbidden claim.");
}

function validateFilesAndScripts(selectedPhase) {
  for (const entry of phases) {
    if (selectedPhase && entry.phase !== selectedPhase) continue;
    assertIncludes(entry.doc, entry.marker);
    if (entry.code) assertIncludes(entry.code, entry.marker);
    if (entry.test) assertIncludes(entry.test, entry.marker);
    assertPackageScript(entry.script);
    if (entry.testScript) assertPackageScript(entry.testScript);
  }
  assertPackageScript("validate:phase2d93-104-hidden-ui-enablement-safety-gates");
}

function validateNoAppConnection() {
  const appFiles = gitLines(["ls-files", "src/app"]);
  for (const filePath of appFiles) {
    assert(!/HiddenImportRestore|hidden-ui-enablement/i.test(read(filePath)), `App route references hidden UI enablement: ${filePath}.`);
  }
}

export function runPhase2D93To104Validation(options = {}) {
  validateFilesAndScripts(options.phase);
  validateChecklist();
  validateExports();
  validateDossier();
  validateNoRedLines();
  validateNoRuntimeSideEffects();
  validateNoAppConnection();
  if (options.runTests !== false) {
    const testFiles = phases.filter((entry) => entry.test?.startsWith("src/")).map((entry) => entry.test);
    runVitest(testFiles);
    runNpm("test:phase2d101-import-restore-global-no-route-no-storage-regression");
    runNpm("test:phase2d102-hidden-ui-enablement-blocked-acceptance");
  }
}
