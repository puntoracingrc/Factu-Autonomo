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

function runVitest(testPath) {
  runBin("npx", ["vitest", "run", testPath]);
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

const phases = [
  {
    phase: "57",
    marker: "PHASE2D57_SYNTHETIC_BACKUP_CORPUS_REGISTRY_V1",
    code: "src/lib/local-data-safety/synthetic-backup-corpus.ts",
    test: "src/lib/local-data-safety/synthetic-backup-corpus.test.ts",
    doc: "docs/phase2d57-synthetic-backup-corpus-registry-v1.md",
    script: "validate:phase2d57-synthetic-backup-corpus-registry",
  },
  {
    phase: "58",
    marker: "PHASE2D58_DOCUMENT_LIFECYCLE_RISK_MATRIX_V1",
    code: "src/lib/local-data-safety/document-lifecycle-risk-matrix.ts",
    test: "src/lib/local-data-safety/document-lifecycle-risk-matrix.test.ts",
    doc: "docs/phase2d58-document-lifecycle-risk-matrix-v1.md",
    script: "validate:phase2d58-document-lifecycle-risk-matrix",
  },
  {
    phase: "59",
    marker: "PHASE2D59_NUMBERING_COUNTERS_RISK_ANALYZER_V1",
    code: "src/lib/local-data-safety/numbering-counters-risk.ts",
    test: "src/lib/local-data-safety/numbering-counters-risk.test.ts",
    doc: "docs/phase2d59-numbering-counters-risk-analyzer-v1.md",
    script: "validate:phase2d59-numbering-counters-risk-analyzer",
  },
  {
    phase: "60",
    marker: "PHASE2D60_SNAPSHOT_PDF_HASH_RISK_ANALYZER_V1",
    code: "src/lib/local-data-safety/snapshot-pdf-hash-risk.ts",
    test: "src/lib/local-data-safety/snapshot-pdf-hash-risk.test.ts",
    doc: "docs/phase2d60-snapshot-pdf-hash-risk-analyzer-v1.md",
    script: "validate:phase2d60-snapshot-pdf-hash-risk-analyzer",
  },
  {
    phase: "61",
    marker: "PHASE2D61_CUSTOMER_IDENTITY_IMPORT_RISK_ANALYZER_V1",
    code: "src/lib/local-data-safety/customer-identity-risk.ts",
    test: "src/lib/local-data-safety/customer-identity-risk.test.ts",
    doc: "docs/phase2d61-customer-identity-import-risk-analyzer-v1.md",
    script: "validate:phase2d61-customer-identity-import-risk-analyzer",
  },
  {
    phase: "62",
    marker: "PHASE2D62_LEGACY_BACKUP_COMPATIBILITY_CLASSIFIER_V1",
    code: "src/lib/local-data-safety/legacy-backup-compatibility.ts",
    test: "src/lib/local-data-safety/legacy-backup-compatibility.test.ts",
    doc: "docs/phase2d62-legacy-backup-compatibility-classifier-v1.md",
    script: "validate:phase2d62-legacy-backup-compatibility-classifier",
  },
  {
    phase: "63",
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    code: "src/lib/local-data-safety/adversarial-backup-corpus.ts",
    test: "src/lib/local-data-safety/adversarial-backup-corpus.test.ts",
    doc: "docs/phase2d63-adversarial-malformed-backup-corpus-v1.md",
    script: "validate:phase2d63-adversarial-malformed-backup-corpus",
  },
  {
    phase: "64",
    marker: "PHASE2D64_LARGE_BACKUP_BOUNDARY_MODEL_V1",
    code: "src/lib/local-data-safety/large-backup-boundary.ts",
    test: "src/lib/local-data-safety/large-backup-boundary.test.ts",
    doc: "docs/phase2d64-large-backup-boundary-model-v1.md",
    script: "validate:phase2d64-large-backup-boundary-model",
  },
  {
    phase: "65",
    marker: "PHASE2D65_COMPOSITE_DATA_LOSS_RISK_AGGREGATOR_V1",
    code: "src/lib/local-data-safety/composite-data-loss-risk.ts",
    test: "src/lib/local-data-safety/composite-data-loss-risk.test.ts",
    doc: "docs/phase2d65-composite-data-loss-risk-aggregator-v1.md",
    script: "validate:phase2d65-composite-data-loss-risk-aggregator",
  },
  {
    phase: "66",
    marker: "PHASE2D66_LOCAL_DATA_SAFETY_CORPUS_REGRESSION_ACCEPTANCE_V1",
    test: "scripts/phase2d66-local-data-safety-corpus-regression-acceptance.test.ts",
    doc: "docs/phase2d66-local-data-safety-corpus-regression-acceptance-v1.md",
    script: "validate:phase2d66-local-data-safety-corpus-regression-acceptance",
  },
  {
    phase: "68",
    marker: "PHASE2D68_LOCAL_DATA_SAFETY_REGRESSION_CORPUS_CHECKPOINT_V1",
    doc: "docs/phase2d68-local-data-safety-regression-corpus-checkpoint-v1.md",
    script: "validate:phase2d57-68-local-data-safety-regression-corpus",
  },
];

const newRuntimeFiles = phases.map((entry) => entry.code).filter(Boolean);

function validateNoRedLines() {
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
      `Unexpected path touched in 2D.57-2D.68: ${changedPath}.`,
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
  ];

  for (const filePath of newRuntimeFiles) {
    const body = read(filePath);
    for (const [label, regex] of forbidden) {
      assert(!regex.test(body), `Forbidden ${label} in ${filePath}.`);
    }
  }
}

function validateMarkersAndScripts() {
  assertIncludes("src/lib/local-data-safety/index.ts", "PHASE2D57_68_LOCAL_DATA_SAFETY_REGRESSION_CORPUS_V1");
  for (const entry of phases) {
    if (entry.code) assertIncludes(entry.code, entry.marker);
    if (entry.test) assertIncludes(entry.test, entry.marker);
    assertIncludes(entry.doc, entry.marker);
    assertPackageScript(entry.script);
  }
  assertPackageScript("test:phase2d66-local-data-safety-corpus-regression-acceptance");
}

function validateCorpusRules() {
  const corpus = read("src/lib/local-data-safety/synthetic-backup-corpus.ts");
  for (const required of [
    "SYNTHETIC_ONLY_EMPTY_APP_BACKUP",
    "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
    "SYNTHETIC_ONLY_ISSUED_LOCKED_BACKUP",
    "SYNTHETIC_ONLY_LEGACY_PROTECTED_BACKUP",
    "SYNTHETIC_ONLY_COUNTERS_MISMATCH_BACKUP",
    "SYNTHETIC_ONLY_SNAPSHOT_HASH_MISMATCH_BACKUP",
    "SYNTHETIC_ONLY_PDF_HASH_MISMATCH_BACKUP",
    "SYNTHETIC_ONLY_DUPLICATE_DOCUMENT_IDS_BACKUP",
    "SYNTHETIC_ONLY_DUPLICATE_CUSTOMER_IDS_BACKUP",
    "SYNTHETIC_ONLY_MIXED_VALID_AND_BLOCKED_BACKUP",
    "SYNTHETIC_ONLY_LARGE_LIST_BACKUP",
    "SYNTHETIC_ONLY_MALFORMED_SHAPE_BACKUP",
  ]) {
    assert(corpus.includes(required), `Missing synthetic corpus case ${required}.`);
  }
  assert(!corpus.includes("documentSnapshot:"), "Synthetic corpus must not include full document snapshot payloads.");
  assert(!corpus.includes("pdfSnapshot:"), "Synthetic corpus must not include PDF snapshot payloads.");

  const composite = read("src/lib/local-data-safety/composite-data-loss-risk.ts");
  for (const required of ["applyAllowed: false", "restoreAllowed: false", "manualReviewRequired", "recommendedNextSteps"]) {
    assert(composite.includes(required), `Composite risk output missing ${required}.`);
  }

  const checkpoint = read("docs/phase2d68-local-data-safety-regression-corpus-checkpoint-v1.md");
  for (const required of [
    "READY FOR UI WIRING DECISION / NO APPLY / SYNTHETIC ONLY",
    "NO UI ROUTE",
    "NO NAVIGATION",
    "NO LOCALSTORAGE READ",
    "NO LOCALSTORAGE WRITE",
    "NO IMPORT APPLY",
    "NO RESTORE APPLY",
    "NO REAL DATA",
    "NO SUPABASE",
    "NO PRODUCTION",
  ]) {
    assert(checkpoint.includes(required), `Checkpoint missing ${required}.`);
  }
}

function validateComplianceDossier() {
  const compliance = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "2D.57-2D.68",
    "PHASE2D_LOCAL_DATA_SAFETY_REGRESSION_CORPUS",
    "evidencia tecnica interna",
    "synthetic backup corpus",
    "local data safety",
    "data-loss regression",
    "no UI conectada",
    "no ruta",
    "no navegación",
    "no localStorage read/write",
    "no import/restore apply",
    "sin producción",
    "sin Supabase",
    "sin documentos reales",
  ]) {
    assert(compliance.includes(required), `Compliance dossier missing required language: ${required}.`);
  }
  for (const forbidden of [
    "UI productiva",
    "import aplicado",
    "restore aplicado",
    "backup automático productivo",
    "cumplimiento cerrado",
    "declaración responsable lista",
  ]) {
    assert(!compliance.includes(forbidden), `Compliance dossier contains forbidden phrase: ${forbidden}.`);
  }
}

function validateAuditExportAvailable() {
  assertPackageScript("export:compliance-dossier:html");
  assertPackageScript("validate:audit-export-v1-compliance-dossier-snapshot");
}

export function runValidator(label, validate) {
  const errors = [];
  try {
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

export function validatePhase2D57To68() {
  validateNoRedLines();
  validateNoRuntimeSideEffects();
  validateMarkersAndScripts();
  validateCorpusRules();
  validateComplianceDossier();
  validateAuditExportAvailable();
  runVitest("src/lib/local-data-safety/synthetic-backup-corpus.test.ts");
  runVitest("src/lib/local-data-safety/document-lifecycle-risk-matrix.test.ts");
  runVitest("src/lib/local-data-safety/numbering-counters-risk.test.ts");
  runVitest("src/lib/local-data-safety/snapshot-pdf-hash-risk.test.ts");
  runVitest("src/lib/local-data-safety/customer-identity-risk.test.ts");
  runVitest("src/lib/local-data-safety/legacy-backup-compatibility.test.ts");
  runVitest("src/lib/local-data-safety/adversarial-backup-corpus.test.ts");
  runVitest("src/lib/local-data-safety/large-backup-boundary.test.ts");
  runVitest("src/lib/local-data-safety/composite-data-loss-risk.test.ts");
  runNpm("test:phase2d66-local-data-safety-corpus-regression-acceptance");
}

export const validatePhase2D57 = validatePhase2D57To68;
export const validatePhase2D58 = validatePhase2D57To68;
export const validatePhase2D59 = validatePhase2D57To68;
export const validatePhase2D60 = validatePhase2D57To68;
export const validatePhase2D61 = validatePhase2D57To68;
export const validatePhase2D62 = validatePhase2D57To68;
export const validatePhase2D63 = validatePhase2D57To68;
export const validatePhase2D64 = validatePhase2D57To68;
export const validatePhase2D65 = validatePhase2D57To68;
export const validatePhase2D66 = validatePhase2D57To68;
