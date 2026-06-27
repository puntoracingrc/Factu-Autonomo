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
    phase: "69",
    marker: "PHASE2D69_IMPORT_RESTORE_WIRING_DECISION_GATE_V1",
    code: "src/lib/local-data-safety/import-restore-wiring-decision-gate.ts",
    test: "src/lib/local-data-safety/import-restore-wiring-decision-gate.test.ts",
    doc: "docs/phase2d69-import-restore-wiring-decision-gate-v1.md",
    script: "validate:phase2d69-import-restore-wiring-decision-gate",
  },
  {
    phase: "70",
    marker: "PHASE2D70_CORPUS_SCENARIO_DECISION_MATRIX_V1",
    code: "src/lib/local-data-safety/corpus-scenario-decision-matrix.ts",
    test: "src/lib/local-data-safety/corpus-scenario-decision-matrix.test.ts",
    doc: "docs/phase2d70-corpus-scenario-decision-matrix-v1.md",
    script: "validate:phase2d70-corpus-scenario-decision-matrix",
  },
  {
    phase: "71",
    marker: "PHASE2D71_UX_DATA_LOSS_DECISION_PACKET_BUILDER_V1",
    code: "src/lib/local-data-safety/ux-data-loss-decision-packet.ts",
    test: "src/lib/local-data-safety/ux-data-loss-decision-packet.test.ts",
    doc: "docs/phase2d71-ux-data-loss-decision-packet-builder-v1.md",
    script: "validate:phase2d71-ux-data-loss-decision-packet-builder",
  },
  {
    phase: "72",
    marker: "PHASE2D72_CORPUS_TO_VIEW_MODEL_CATALOG_V1",
    code: "src/lib/local-data-safety/corpus-view-model-catalog.ts",
    test: "src/lib/local-data-safety/corpus-view-model-catalog.test.ts",
    doc: "docs/phase2d72-corpus-to-view-model-catalog-v1.md",
    script: "validate:phase2d72-corpus-to-view-model-catalog",
  },
  {
    phase: "73",
    marker: "PHASE2D73_IMPORT_RESTORE_REVIEW_BOARD_PACKET_V1",
    code: "src/lib/local-data-safety/import-restore-review-board-packet.ts",
    test: "src/lib/local-data-safety/import-restore-review-board-packet.test.ts",
    doc: "docs/phase2d73-import-restore-review-board-packet-v1.md",
    script: "validate:phase2d73-import-restore-review-board-packet",
  },
  {
    phase: "74",
    marker: "PHASE2D74_IMPORT_RESTORE_APPROVAL_STATE_MACHINE_V1",
    code: "src/lib/local-data-safety/import-restore-approval-state-machine.ts",
    test: "src/lib/local-data-safety/import-restore-approval-state-machine.test.ts",
    doc: "docs/phase2d74-import-restore-approval-state-machine-v1.md",
    script: "validate:phase2d74-import-restore-approval-state-machine",
  },
  {
    phase: "75",
    marker: "PHASE2D75_IMPORT_RESTORE_SAFE_REVIEWER_NOTES_MODEL_V1",
    code: "src/lib/local-data-safety/import-restore-reviewer-notes.ts",
    test: "src/lib/local-data-safety/import-restore-reviewer-notes.test.ts",
    doc: "docs/phase2d75-import-restore-safe-reviewer-notes-model-v1.md",
    script: "validate:phase2d75-import-restore-safe-reviewer-notes-model",
  },
  {
    phase: "76",
    marker: "PHASE2D76_IMPORT_RESTORE_DECISION_REPORT_GENERATOR_V1",
    code: "src/lib/local-data-safety/import-restore-decision-report.ts",
    test: "src/lib/local-data-safety/import-restore-decision-report.test.ts",
    doc: "docs/phase2d76-import-restore-decision-report-generator-v1.md",
    script: "validate:phase2d76-import-restore-decision-report-generator",
  },
  {
    phase: "77",
    marker: "PHASE2D77_IMPORT_RESTORE_DECISION_PACKAGE_ACCEPTANCE_V1",
    test: "scripts/phase2d77-import-restore-decision-package-acceptance.test.ts",
    doc: "docs/phase2d77-import-restore-decision-package-acceptance-v1.md",
    script: "validate:phase2d77-import-restore-decision-package-acceptance",
    testScript: "test:phase2d77-import-restore-decision-package-acceptance",
  },
  {
    phase: "78",
    marker: "PHASE2D78_IMPORT_RESTORE_FULL_CORPUS_DECISION_REGRESSION_V1",
    test: "scripts/phase2d78-import-restore-full-corpus-decision-regression.test.ts",
    doc: "docs/phase2d78-import-restore-full-corpus-decision-regression-v1.md",
    script: "validate:phase2d78-import-restore-full-corpus-decision-regression",
    testScript: "test:phase2d78-import-restore-full-corpus-decision-regression",
  },
  {
    phase: "80",
    marker: "PHASE2D80_IMPORT_RESTORE_WIRING_DECISION_PACKAGE_CHECKPOINT_V1",
    doc: "docs/phase2d80-import-restore-wiring-decision-package-checkpoint-v1.md",
    script: "validate:phase2d69-80-import-restore-wiring-decision-package",
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
    /^docs\/phase2d(?:[1-9]|[1-9][0-9]|10[0-4])-.*$/,
    /^docs\/compliance-evidence-v1\.md$/,
    /^package\.json$/,
  ];

  for (const changedPath of changedPaths()) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    if (changedPath.startsWith("docs/audit/exports/")) continue;
    assert(
      allowedPatterns.some((pattern) => pattern.test(changedPath)),
      `Unexpected path touched in 2D.69-2D.80: ${changedPath}.`,
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
    ["client factory", /createClient\s*\(/],
    ["network fetch", /\bfetch\s*\(/],
    ["http module", /node:http|node:https|from ["']http["']|from ["']https["']/],
    ["axios", /\baxios\b/],
    ["filesystem", /node:fs|from ["']fs["']|\bwriteFile(?:Sync)?\b|\breadFile(?:Sync)?\b|\bappendFile(?:Sync)?\b/],
    ["environment read", /process\.env/],
    ["Next response", /NextResponse/],
    ["UI import in local model", /from ["'](?:react|next\/|lucide-react)/],
    ["real data shaped echo", /documentSnapshot|pdfSnapshot|rawJson|fullPayload|authorization|cookie|privateKey/i],
    ["external fiscal boundary", /AEAT|VeriFactu|ViDA|certificado|transporte|firma|<\?xml/i],
    ["Vercel config surface", /vercel\.json|domains|aliases|promote/i],
  ];

  for (const relativePath of runtimeFiles) {
    const source = read(relativePath);
    for (const [label, pattern] of forbidden) {
      assert(!pattern.test(source), `${relativePath} contains forbidden ${label}.`);
    }
    if (!relativePath.includes("reviewer-notes")) {
      assert(/applyImportAllowed:\s*false/.test(source) || /allowApplyImport:\s*false/.test(source) || /applyAllowed:\s*false/.test(source), `${relativePath} must keep import apply false.`);
      assert(/applyRestoreAllowed:\s*false/.test(source) || /allowApplyRestore:\s*false/.test(source) || /restoreAllowed:\s*false/.test(source), `${relativePath} must keep restore apply false.`);
    }
  }
}

function validateExports() {
  const index = read("src/lib/local-data-safety/index.ts");
  assert(index.includes("PHASE2D69_80_IMPORT_RESTORE_WIRING_DECISION_PACKAGE_V1"), "Index missing 2D.69-80 marker.");
  for (const symbol of [
    "evaluateImportRestoreWiringDecisionGate",
    "buildCorpusScenarioDecisionMatrix",
    "buildUxDataLossDecisionPacket",
    "buildCorpusViewModelCatalog",
    "buildImportRestoreReviewBoardPacket",
    "createImportRestoreApprovalState",
    "buildSafeImportRestoreReviewerNote",
    "buildImportRestoreDecisionReport",
  ]) {
    assert(index.includes(symbol), `Index missing export ${symbol}.`);
  }
}

function validateDossierAndCheckpoint() {
  assertIncludes("docs/compliance-evidence-v1.md", "PHASE2D69_80_IMPORT_RESTORE_WIRING_DECISION_PACKAGE_V1");
  assertIncludes(
    "docs/phase2d80-import-restore-wiring-decision-package-checkpoint-v1.md",
    "PHASE2D_IMPORT_RESTORE_WIRING_DECISION_PACKAGE: READY FOR HUMAN PRODUCT_DECISION / NO WIRING / NO APPLY",
  );
}

export function validatePhase2D69To80(options = {}) {
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
  if (!options.phase || options.phase === "80") validateDossierAndCheckpoint();

  const selectedTests = selected.map((entry) => entry.test).filter(Boolean);
  if (selectedTests.length > 0) runVitest(selectedTests);
  if (!options.phase || options.phase === "77") runNpm("test:phase2d77-import-restore-decision-package-acceptance");
  if (!options.phase || options.phase === "78") runNpm("test:phase2d78-import-restore-full-corpus-decision-regression");
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
