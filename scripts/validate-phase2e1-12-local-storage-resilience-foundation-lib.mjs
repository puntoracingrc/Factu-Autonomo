import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const fiscalTransportTable = ["fiscal", "transport", "attempts"].join("_");

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

export const phases = [
  {
    phase: "1",
    marker: "PHASE2E1_LOCAL_STORAGE_SURFACE_AUDIT_V1",
    doc: "docs/phase2e1-local-storage-surface-audit-v1.md",
    script: "validate:phase2e1-local-storage-surface-audit",
  },
  {
    phase: "2",
    marker: "PHASE2E2_STORAGE_ADAPTER_CONTRACT_DISABLED_V1",
    code: "src/lib/local-storage-resilience/storage-adapter-contract.ts",
    test: "src/lib/local-storage-resilience/storage-adapter-contract.test.ts",
    doc: "docs/phase2e2-storage-adapter-contract-disabled-v1.md",
    script: "validate:phase2e2-storage-adapter-contract-disabled",
  },
  {
    phase: "3",
    marker: "PHASE2E3_IN_MEMORY_STORAGE_ADAPTER_V1",
    code: "src/lib/local-storage-resilience/in-memory-storage-adapter.ts",
    test: "src/lib/local-storage-resilience/in-memory-storage-adapter.test.ts",
    doc: "docs/phase2e3-in-memory-storage-adapter-v1.md",
    script: "validate:phase2e3-in-memory-storage-adapter",
  },
  {
    phase: "4",
    marker: "PHASE2E4_STORAGE_ERROR_TAXONOMY_V1",
    code: "src/lib/local-storage-resilience/storage-errors.ts",
    test: "src/lib/local-storage-resilience/storage-errors.test.ts",
    doc: "docs/phase2e4-storage-error-taxonomy-v1.md",
    script: "validate:phase2e4-storage-error-taxonomy",
  },
  {
    phase: "5",
    marker: "PHASE2E5_STORAGE_OPERATION_DRY_RUN_PLANNER_V1",
    code: "src/lib/local-storage-resilience/storage-operation-dry-run.ts",
    test: "src/lib/local-storage-resilience/storage-operation-dry-run.test.ts",
    doc: "docs/phase2e5-storage-operation-dry-run-planner-v1.md",
    script: "validate:phase2e5-storage-operation-dry-run-planner",
  },
  {
    phase: "6",
    marker: "PHASE2E6_BACKUP_BEFORE_WRITE_POLICY_V1",
    code: "src/lib/local-storage-resilience/backup-before-write-policy.ts",
    test: "src/lib/local-storage-resilience/backup-before-write-policy.test.ts",
    doc: "docs/phase2e6-backup-before-write-policy-v1.md",
    script: "validate:phase2e6-backup-before-write-policy",
  },
  {
    phase: "7",
    marker: "PHASE2E7_CORRUPTION_PARSE_RECOVERY_CLASSIFIER_V1",
    code: "src/lib/local-storage-resilience/storage-corruption-recovery.ts",
    test: "src/lib/local-storage-resilience/storage-corruption-recovery.test.ts",
    doc: "docs/phase2e7-corruption-parse-recovery-classifier-v1.md",
    script: "validate:phase2e7-corruption-parse-recovery-classifier",
  },
  {
    phase: "8",
    marker: "PHASE2E8_STORAGE_RESILIENCE_SAFE_REPORT_V1",
    code: "src/lib/local-storage-resilience/storage-safe-report.ts",
    test: "src/lib/local-storage-resilience/storage-safe-report.test.ts",
    doc: "docs/phase2e8-storage-resilience-safe-report-v1.md",
    script: "validate:phase2e8-storage-resilience-safe-report",
  },
  {
    phase: "9",
    marker: "PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1",
    code: "src/lib/local-storage-resilience/storage-audit-events.ts",
    test: "src/lib/local-storage-resilience/storage-audit-events.test.ts",
    doc: "docs/phase2e9-storage-resilience-audit-events-v1.md",
    script: "validate:phase2e9-storage-resilience-audit-events",
  },
  {
    phase: "10",
    marker: "PHASE2E10_STORAGE_RESILIENCE_ACCEPTANCE_V1",
    test: "scripts/phase2e10-storage-resilience-acceptance.test.ts",
    doc: "docs/phase2e10-storage-resilience-acceptance-v1.md",
    script: "validate:phase2e10-storage-resilience-acceptance",
    testScript: "test:phase2e10-storage-resilience-acceptance",
  },
  {
    phase: "12",
    marker: "PHASE2E12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_CHECKPOINT_V1",
    doc: "docs/phase2e12-local-storage-resilience-foundation-checkpoint-v1.md",
    script: "validate:phase2e1-12-local-storage-resilience-foundation",
  },
];

const runtimeFiles = [
  "src/lib/local-storage-resilience/types.ts",
  "src/lib/local-storage-resilience/errors.ts",
  "src/lib/local-storage-resilience/storage-adapter-contract.ts",
  "src/lib/local-storage-resilience/in-memory-storage-adapter.ts",
  "src/lib/local-storage-resilience/storage-errors.ts",
  "src/lib/local-storage-resilience/storage-operation-dry-run.ts",
  "src/lib/local-storage-resilience/backup-before-write-policy.ts",
  "src/lib/local-storage-resilience/storage-corruption-recovery.ts",
  "src/lib/local-storage-resilience/storage-safe-report.ts",
  "src/lib/local-storage-resilience/storage-audit-events.ts",
  "src/lib/local-storage-resilience/index.ts",
];

function changedPaths() {
  return new Set([
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["diff", "--name-only", "--cached"]),
    ...gitLines(["diff", "--name-only", "main...HEAD"]),
    ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]);
}

function validateFilesAndScripts(selectedPhase) {
  assertIncludes("src/lib/local-storage-resilience/types.ts", "PHASE2E1_12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_V1");
  assertIncludes("src/lib/local-storage-resilience/index.ts", "PHASE2E1_12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_V1");
  assertIncludes("docs/compliance-evidence-v1.md", "PHASE2E11_COMPLIANCE_DOSSIER_STORAGE_RESILIENCE_UPDATE_V1");

  for (const entry of phases) {
    if (selectedPhase && entry.phase !== selectedPhase) continue;
    assertIncludes(entry.doc, entry.marker);
    if (entry.code) assertIncludes(entry.code, entry.marker);
    if (entry.test) assertIncludes(entry.test, entry.marker);
    assertPackageScript(entry.script);
    if (entry.testScript) assertPackageScript(entry.testScript);
  }

  for (const scriptName of [
    "validate:phase2e1-local-storage-surface-audit",
    "validate:phase2e2-storage-adapter-contract-disabled",
    "validate:phase2e3-in-memory-storage-adapter",
    "validate:phase2e4-storage-error-taxonomy",
    "validate:phase2e5-storage-operation-dry-run-planner",
    "validate:phase2e6-backup-before-write-policy",
    "validate:phase2e7-corruption-parse-recovery-classifier",
    "validate:phase2e8-storage-resilience-safe-report",
    "validate:phase2e9-storage-resilience-audit-events",
    "validate:phase2e10-storage-resilience-acceptance",
    "validate:phase2e1-12-local-storage-resilience-foundation",
  ]) {
    assertPackageScript(scriptName);
  }
}

function validateNoRedLines() {
  const allowedPatterns = [
    /^src\/lib\/local-storage-resilience\//,
    /^scripts\/phase2e10-storage-resilience-acceptance\.test\.ts$/,
    /^scripts\/validate-phase2e(?:[1-9]|10|1-12)-.*\.mjs$/,
    /^scripts\/validate-phase2(?:b7v-z|c|d).*\.mjs$/,
    /^scripts\/validate-audit-export-v1-compliance-dossier-snapshot\.mjs$/,
    /^docs\/phase2e(?:[1-9]|10|12)-.*$/,
    /^docs\/compliance-evidence-v1\.md$/,
    /^package\.json$/,
  ];

  for (const changedPath of changedPaths()) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    if (changedPath.startsWith("docs/audit/exports/")) continue;
    assert(
      allowedPatterns.some((pattern) => pattern.test(changedPath)),
      `Unexpected path touched in 2E.1-2E.12: ${changedPath}.`,
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

function validateRuntimeSideEffects() {
  const forbidden = [
    ["browser global", /\bwindow\s*\.|\bdocument\s*\./],
    ["browser storage direct call", /(^|[^A-Za-z0-9_])localStorage\s*\.|sessionStorage|indexedDB|globalThis\s*\.\s*(?:localStorage|sessionStorage|indexedDB)/],
    ["real file picker", /\bFileReader\b|showOpenFilePicker|type\s*=\s*["']file["']/],
    ["binary download API", /\bBlob\b|createObjectURL|document\.createElement\(["']a["']\)|\.click\(\)/],
    ["Supabase package", /@supabase\/supabase-js|createClient\(/i],
    ["network fetch", /\bfetch\s*\(/],
    ["http module", /node:http|node:https|from ["']http["']|from ["']https["']/],
    ["axios", /\baxios\b/],
    ["filesystem", /from ["']node:fs["']|from ["']fs["']|fs\./],
    ["environment read", /process\.env/],
    ["Next UI/router", /next\/link|next\/navigation|useRouter|redirect\(|router\.|src\/components|src\/app/],
    ["apply/write authorization", /applyAllowed:\s*true|writeAllowed:\s*true|dataMutationAllowed:\s*true|realStorageTouched:\s*true/],
    ["external fiscal boundary", /\b(?:AEAT|certificado|transporte|firma)\b|<\?xml/i],
    ["Vercel surface", /vercel\.json|domains|aliases|promote/i],
  ];

  for (const relativePath of runtimeFiles) {
    assertFile(relativePath);
    const source = read(relativePath);
    for (const [label, pattern] of forbidden) {
      assert(!pattern.test(source), `${relativePath} contains forbidden ${label}.`);
    }
    assert(/safe:\s*true/.test(source), `${relativePath} must expose safe true.`);
  }
}

function validateDossier() {
  const dossier = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "2E.1-2E.12",
    "PHASE2E1_12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_V1",
    "PHASE2E11_COMPLIANCE_DOSSIER_STORAGE_RESILIENCE_UPDATE_V1",
    "local storage resilience",
    "storage safety",
    "fake/in-memory adapters",
    "no localStorage real",
    "no data mutation",
    "no UI",
    "sin produccion",
    "sin Supabase",
    "sin documentos reales",
    "PHASE2E_LOCAL_STORAGE_RESILIENCE_FOUNDATION: READY FOR STORAGE UI/ADAPTER DECISION / NO REAL STORAGE MUTATION",
  ]) {
    assert(dossier.includes(required), `Compliance dossier missing ${required}.`);
  }
  assert(
    !/almacenamiento productivo cerrado|backup autom[aá]tico productivo|cumplimiento cerrado|certificaci[oó]n productiva|certificaci[oó]n completa|declaraci[oó]n responsable lista/i.test(dossier),
    "Compliance dossier contains forbidden 2E claim.",
  );
}

function validateExports() {
  const libIndex = read("src/lib/local-storage-resilience/index.ts");
  for (const symbol of [
    "createDisabledLocalStorageResilienceAdapter",
    "evaluateLocalStorageResilienceAdapterReadiness",
    "createInMemoryLocalStorageResilienceAdapter",
    "classifyLocalStorageResilienceError",
    "planLocalStorageResilienceOperation",
    "evaluateBackupBeforeWritePolicy",
    "classifyStoredAppDataParseResult",
    "buildLocalStorageResilienceSafeReport",
    "createInMemoryLocalStorageResilienceAuditEventStore",
  ]) {
    assert(libIndex.includes(symbol) || read("src/lib/local-storage-resilience/index.ts").includes("export *"), `Local storage resilience index missing export ${symbol}.`);
  }
}

function validateNoAppConnection() {
  const appFiles = gitLines(["ls-files", "src/app"]);
  for (const filePath of appFiles) {
    assert(!/local-storage-resilience|LocalStorageResilience/i.test(read(filePath)), `App route references local storage resilience: ${filePath}.`);
  }
}

export function runPhase2E1To12Validation(options = {}) {
  validateFilesAndScripts(options.phase);
  validateNoRedLines();
  validateRuntimeSideEffects();
  validateDossier();
  validateExports();
  validateNoAppConnection();
  if (options.runTests === true) {
    runBin("npx", ["vitest", "run", "src/lib/local-storage-resilience"]);
    runBin("npm", ["run", "test:phase2e10-storage-resilience-acceptance"]);
  }
}
