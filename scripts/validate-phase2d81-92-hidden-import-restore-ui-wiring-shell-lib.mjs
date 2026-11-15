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
    phase: "81",
    marker: "PHASE2D81_HIDDEN_IMPORT_RESTORE_UI_SHELL_FLAG_CONTRACT_V1",
    code: "src/lib/local-data-safety/hidden-ui-shell-flag.ts",
    test: "src/lib/local-data-safety/hidden-ui-shell-flag.test.ts",
    doc: "docs/phase2d81-hidden-import-restore-ui-shell-flag-contract-v1.md",
    script: "validate:phase2d81-hidden-import-restore-ui-shell-flag-contract",
  },
  {
    phase: "82",
    marker: "PHASE2D82_ROUTELESS_IMPORT_RESTORE_COMPOSITION_ROOT_V1",
    code: "src/components/local-data-safety/ImportRestoreRoutelessShell.tsx",
    test: "src/components/local-data-safety/ImportRestoreRoutelessShell.test.tsx",
    doc: "docs/phase2d82-routeless-import-restore-composition-root-v1.md",
    script: "validate:phase2d82-routeless-import-restore-composition-root",
  },
  {
    phase: "83",
    marker: "PHASE2D83_SYNTHETIC_IMPORT_RESTORE_FIXTURE_SELECTOR_MODEL_V1",
    code: "src/lib/local-data-safety/synthetic-fixture-selector.ts",
    test: "src/lib/local-data-safety/synthetic-fixture-selector.test.ts",
    doc: "docs/phase2d83-synthetic-import-restore-fixture-selector-model-v1.md",
    script: "validate:phase2d83-synthetic-import-restore-fixture-selector-model",
  },
  {
    phase: "84",
    marker: "PHASE2D84_IMPORT_RESTORE_PREVIEW_PANEL_COMPOSITION_V1",
    code: "src/components/local-data-safety/ImportRestorePreviewPanel.tsx",
    test: "src/components/local-data-safety/ImportRestorePreviewPanel.test.tsx",
    doc: "docs/phase2d84-import-restore-preview-panel-composition-v1.md",
    script: "validate:phase2d84-import-restore-preview-panel-composition",
  },
  {
    phase: "85",
    marker: "PHASE2D85_IMPORT_RESTORE_RISK_PANEL_COMPOSITION_V1",
    code: "src/components/local-data-safety/ImportRestoreRiskPanel.tsx",
    test: "src/components/local-data-safety/ImportRestoreRiskPanel.test.tsx",
    doc: "docs/phase2d85-import-restore-risk-panel-composition-v1.md",
    script: "validate:phase2d85-import-restore-risk-panel-composition",
  },
  {
    phase: "86",
    marker: "PHASE2D86_IMPORT_RESTORE_DECISION_PACKET_PANEL_COMPOSITION_V1",
    code: "src/components/local-data-safety/ImportRestoreDecisionPacketPanel.tsx",
    test: "src/components/local-data-safety/ImportRestoreDecisionPacketPanel.test.tsx",
    doc: "docs/phase2d86-import-restore-decision-packet-panel-composition-v1.md",
    script: "validate:phase2d86-import-restore-decision-packet-panel-composition",
  },
  {
    phase: "87",
    marker: "PHASE2D87_IMPORT_RESTORE_DISABLED_ACTION_BAR_COMPOSITION_V1",
    code: "src/components/local-data-safety/ImportRestoreDisabledActionBar.tsx",
    test: "src/components/local-data-safety/ImportRestoreDisabledActionBar.test.tsx",
    doc: "docs/phase2d87-import-restore-disabled-action-bar-composition-v1.md",
    script: "validate:phase2d87-import-restore-disabled-action-bar-composition",
  },
  {
    phase: "88",
    marker: "PHASE2D88_HIDDEN_IMPORT_RESTORE_UI_SHELL_RENDER_HARNESS_V1",
    code: "src/lib/local-data-safety/hidden-ui-shell-render-harness.ts",
    test: "src/lib/local-data-safety/hidden-ui-shell-render-harness.test.ts",
    doc: "docs/phase2d88-hidden-import-restore-ui-shell-render-harness-v1.md",
    script: "validate:phase2d88-hidden-import-restore-ui-shell-render-harness",
  },
  {
    phase: "89",
    marker: "PHASE2D89_HIDDEN_IMPORT_RESTORE_UI_NO_ROUTE_ACCEPTANCE_V1",
    test: "scripts/phase2d89-hidden-import-restore-ui-no-route-acceptance.test.ts",
    doc: "docs/phase2d89-hidden-import-restore-ui-no-route-acceptance-v1.md",
    script: "validate:phase2d89-hidden-import-restore-ui-no-route-acceptance",
    testScript: "test:phase2d89-hidden-import-restore-ui-no-route-acceptance",
  },
  {
    phase: "90",
    marker: "PHASE2D90_HIDDEN_IMPORT_RESTORE_UI_NO_APPLY_STORAGE_ACCEPTANCE_V1",
    test: "scripts/phase2d90-hidden-import-restore-ui-no-apply-storage-acceptance.test.ts",
    doc: "docs/phase2d90-hidden-import-restore-ui-no-apply-storage-acceptance-v1.md",
    script: "validate:phase2d90-hidden-import-restore-ui-no-apply-storage-acceptance",
    testScript: "test:phase2d90-hidden-import-restore-ui-no-apply-storage-acceptance",
  },
  {
    phase: "92",
    marker: "PHASE2D92_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL_CHECKPOINT_V1",
    doc: "docs/phase2d92-hidden-import-restore-ui-wiring-shell-checkpoint-v1.md",
    script: "validate:phase2d81-92-hidden-import-restore-ui-wiring-shell",
  },
];

const runtimeFiles = phases.map((entry) => entry.code).filter(Boolean);

function validateNoRedLines() {
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
      `Unexpected path touched in 2D.81-2D.92: ${changedPath}.`,
    );
    assert(!/^supabase\//.test(changedPath), `Supabase path touched: ${changedPath}.`);
    assert(!/vida/i.test(changedPath), `ViDA path touched: ${changedPath}.`);
    assert(!/^(?:src\/app|app|pages|public)\//.test(changedPath), `Route/public path touched: ${changedPath}.`);
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
    ["storage write method", /\.(?:setItem|removeItem|clear)\s*\(/],
    ["real file reader", /\bFileReader\b|showOpenFilePicker|type\s*=\s*["']file["']/],
    ["binary download API", /\bBlob\b|createObjectURL|document\.createElement\(["']a["']\)|\.click\(\)/],
    ["Supabase package", /@supabase\/supabase-js/i],
    ["network fetch", /\bfetch\s*\(/],
    ["http module", /node:http|node:https|from ["']http["']|from ["']https["']/],
    ["axios", /\baxios\b/],
    ["environment read", /process\.env/],
    ["Next router", /next\/link|next\/navigation|useRouter|redirect\(|router\./],
    ["route attribute", /href\s*=|data-route/],
    ["real data shaped echo", /documentSnapshot|pdfSnapshot|rawJson|fullPayload|authorization|cookie|privateKey/i],
    ["external fiscal boundary", /AEAT|VeriFactu|ViDA|certificado|transporte|firma|<\?xml/i],
    ["Vercel config surface", /vercel\.json|domains|aliases|promote/i],
  ];

  for (const relativePath of runtimeFiles) {
    const source = read(relativePath);
    for (const [label, pattern] of forbidden) {
      assert(!pattern.test(source), `${relativePath} contains forbidden ${label}.`);
    }
    if (relativePath.startsWith("src/lib/local-data-safety/")) {
      assert(/applyImportAllowed:\s*false/.test(source) || relativePath.includes("fixture-selector"), `${relativePath} must keep import apply false.`);
      assert(/applyRestoreAllowed:\s*false/.test(source) || relativePath.includes("fixture-selector"), `${relativePath} must keep restore apply false.`);
    }
  }
}

function validateExports() {
  const libIndex = read("src/lib/local-data-safety/index.ts");
  const componentIndex = read("src/components/local-data-safety/index.ts");
  assert(libIndex.includes("PHASE2D81_92_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL_V1"), "Local data safety index missing 2D.81-92 marker.");
  for (const symbol of [
    "evaluateHiddenImportRestoreUiShellFlag",
    "buildSyntheticImportRestoreFixtureSelector",
    "buildHiddenImportRestoreUiShellHarnessProps",
  ]) {
    assert(libIndex.includes(symbol), `Local data safety index missing export ${symbol}.`);
  }
  for (const symbol of [
    "ImportRestoreRoutelessShell",
    "ImportRestorePreviewPanel",
    "ImportRestoreRiskPanel",
    "ImportRestoreDecisionPacketPanel",
    "ImportRestoreDisabledActionBar",
  ]) {
    assert(componentIndex.includes(symbol), `Component index missing export ${symbol}.`);
  }
}

function validateNoAppConnection() {
  const appFiles = gitLines(["ls-files", "src/app"]).map((filePath) => [filePath, read(filePath)]);
  for (const [filePath, body] of appFiles) {
    assert(!/ImportRestoreRoutelessShell|ImportRestorePreviewPanel|ImportRestoreRiskPanel/.test(body), `Hidden shell connected from app path ${filePath}.`);
  }
}

function validateDossierAndCheckpoint() {
  assertIncludes("docs/compliance-evidence-v1.md", "PHASE2D81_92_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL_V1");
  assertIncludes(
    "docs/phase2d92-hidden-import-restore-ui-wiring-shell-checkpoint-v1.md",
    "PHASE2D_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL:",
  );
  assertIncludes(
    "docs/phase2d92-hidden-import-restore-ui-wiring-shell-checkpoint-v1.md",
    "READY FOR EXPLICIT HIDDEN_UI_ENABLEMENT_REVIEW / NO APPLY",
  );
}

export function validatePhase2D81To92(options = {}) {
  const selected = options.phase ? phases.filter((entry) => entry.phase === options.phase) : phases;
  assert(selected.length > 0, `Unknown phase ${options.phase}.`);

  for (const entry of selected) {
    if (entry.code) assertIncludes(entry.code, entry.marker);
    if (entry.test) assertIncludes(entry.test, entry.marker);
    if (entry.doc) assertIncludes(entry.doc, entry.marker);
    if (entry.script) assertPackageScript(entry.script);
    if (entry.testScript) assertPackageScript(entry.testScript);
  }

  validateNoRedLines();
  validateNoRuntimeSideEffects();
  validateExports();
  validateNoAppConnection();
  if (!options.phase || options.phase === "92") validateDossierAndCheckpoint();

  const selectedTests = selected.map((entry) => entry.test).filter(Boolean);
  if (selectedTests.length > 0) runVitest(selectedTests);
  if (!options.phase || options.phase === "89") runNpm("test:phase2d89-hidden-import-restore-ui-no-route-acceptance");
  if (!options.phase || options.phase === "90") runNpm("test:phase2d90-hidden-import-restore-ui-no-apply-storage-acceptance");
}

export function runValidator(label, validator) {
  try {
    validator();
    console.log(`${label}: OK`);
  } catch (error) {
    console.error(`${label}: FAIL`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
