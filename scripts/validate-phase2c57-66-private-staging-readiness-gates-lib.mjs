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

function addedLines(relativePath) {
  try {
    return execFileSync(
      "git",
      ["diff", "--unified=0", "origin/main...HEAD", "--", relativePath],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .split(/\r?\n/)
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1));
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

function assertPackageScript(scriptName) {
  const packageJson = JSON.parse(read("package.json") || "{}");
  assert(packageJson.scripts?.[scriptName], `Missing npm script ${scriptName}.`);
}

function assertNoPattern(relativePath, patterns) {
  const body = read(relativePath);
  for (const [label, regex] of patterns) {
    assert(!regex.test(body), `Forbidden ${label} in ${relativePath}.`);
  }
}

function runVitest(testPath) {
  runBin("npx", ["vitest", "run", testPath]);
}

const sensitiveRole = ["service", "role"].join("_");
const fiscalTransportTable = ["fiscal", "transport", "attempts"].join("_");

const privateStagingRuntimeFiles = [
  "src/lib/document-sync-integrity/private-staging-environment.ts",
  "src/lib/document-sync-integrity/private-staging-secret-boundary.ts",
  "src/lib/document-sync-integrity/private-staging-observability.ts",
  "src/lib/document-sync-integrity/private-staging-readiness.ts",
  "src/lib/document-sync-integrity/private-staging-dry-run-report.ts",
];

const privateStagingTestFiles = [
  "src/lib/document-sync-integrity/private-staging-environment.test.ts",
  "src/lib/document-sync-integrity/private-staging-secret-boundary.test.ts",
  "src/lib/document-sync-integrity/private-staging-observability.test.ts",
  "src/lib/document-sync-integrity/private-staging-readiness.test.ts",
  "src/lib/document-sync-integrity/private-staging-dry-run-report.test.ts",
];

function validateNoRedLines() {
  const untrackedPaths = new Set(gitLines(["ls-files", "--others", "--exclude-standard"]));
  const changedPaths = new Set([
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["diff", "--name-only", "--cached"]),
    ...gitLines(["diff", "--name-only", "main...HEAD"]),
    ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]);

  const allowedPatterns = [
    /^src\/lib\/document-sync-integrity\/private-staging-.*\.ts$/,
    /^src\/lib\/document-sync-integrity\/index\.ts$/,
    /^scripts\/phase2c63-sync-route-remote-staging-blocker\.test\.ts$/,
    /^scripts\/validate-phase2c(?:57|58|59|60|61|62|63|64|57-66)-.*\.mjs$/,
    /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
    /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
    /^scripts\/validate-phase2c7-12-local-staging-sync-adapter\.mjs$/,
    /^scripts\/validate-phase2c13-18-supabase-local-sync-adapter\.mjs$/,
    /^scripts\/validate-phase2c19-24-supabase-local-schema-acceptance\.mjs$/,
    /^scripts\/validate-phase2c25-30-server-document-sync-service\.mjs$/,
    /^scripts\/validate-phase2c31-36-disabled-sync-route-shell\.mjs$/,
    /^scripts\/validate-phase2c37-48-.*\.mjs$/,
    /^scripts\/validate-phase2c49-56-.*\.mjs$/,
    /^scripts\/validate-audit-export-v1-compliance-dossier-snapshot\.mjs$/,
    /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78|89|90)-/,
    /^scripts\/validate-phase2d/,
    /^docs\/phase2c(?:57|58|59|60|61|62|63|64|66)-.*$/,
    /^docs\/phase2d/,
    /^src\/lib\/local-data-safety\//,
    /^src\/components\/local-data-safety\//,
    /^docs\/compliance-evidence-v1\.md$/,
    /^docs\/audit\//,
    /^package\.json$/,
  ];

  for (const changedPath of changedPaths) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    assert(
      allowedPatterns.some((pattern) => pattern.test(changedPath)),
      `Unexpected path touched in 2C.57-2C.66: ${changedPath}.`,
    );
    assert(!/^src\/app\/api\/document-sync\/route\.ts$/.test(changedPath), "Document sync route boundary must not be changed in 2C.57-2C.66.");
    assert(!/^supabase\/migrations\//.test(changedPath), `Migration touched: ${changedPath}.`);
    assert(!/vida/i.test(changedPath), `ViDA path touched: ${changedPath}.`);
    assert(!/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath), `Vercel config touched: ${changedPath}.`);
    assert(!/^(?:src\/app|app|components|public)\//.test(changedPath), `UI/public path touched: ${changedPath}.`);
    assert(!/(?:stripe|openai|importers|aeat|(?:^|[\/_-])qr(?:[\/_.-]|$)|(?:^|[\/_-])firma(?:[\/_.-]|$)|certificado|transport)/i.test(changedPath), `Forbidden product path touched: ${changedPath}.`);
    assert(!changedPath.toLowerCase().endsWith(".pdf"), `PDF binary is not authorized: ${changedPath}.`);
  }

  for (const changedPath of changedPaths) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    if (changedPath.startsWith("docs/audit/")) continue;
    if (
      /^src\/lib\/local-data-safety\//.test(changedPath) ||
      /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78|89|90)-/.test(changedPath) ||
      /^docs\/phase2d/.test(changedPath)
    ) {
      continue;
    }
    if (changedPath.endsWith(".mjs") && changedPath.includes("validate-phase2")) continue;
    if (!fs.existsSync(absolute(changedPath))) continue;
    const body = untrackedPaths.has(changedPath)
      ? read(changedPath)
      : addedLines(changedPath).join("\n");
    for (const [label, regex] of [
      ["remote URL", /https?:\/\/(?!localhost|127\.0\.0\.1|\[::1\])/i],
      ["privileged role literal", new RegExp(sensitiveRole, "i")],
      ["fiscal transport table", new RegExp(fiscalTransportTable, "i")],
      ["wildcard CORS", /access-control-allow-origin["']?\s*:\s*["']\*/i],
      ["payload echo", /echoPayload|rawBodyEcho|payloadEcho/i],
    ]) {
      assert(!regex.test(body), `Forbidden content ${label} in ${changedPath}.`);
    }
  }

  for (const runtimePath of privateStagingRuntimeFiles) {
    assertNoPattern(runtimePath, [
      ["env read", /process\.env/],
      ["Supabase import", /@supabase\/supabase-js/i],
      ["client factory", /createClient\s*\(/],
      ["network fetch", /\bfetch\s*\(/],
      ["filesystem", /node:fs|from ["']fs["']|\bwriteFile(?:Sync)?\b|\breadFile(?:Sync)?\b/],
      ["Next response", /NextResponse/],
    ]);
  }
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

export function validatePhase2C57() {
  assertPackageScript("validate:phase2c57-private-staging-readiness-gate");
  assertIncludes(
    "src/lib/document-sync-integrity/private-staging-readiness.ts",
    "PHASE2C57_PRIVATE_STAGING_READINESS_GATE_V1",
  );
  assertIncludes(
    "docs/phase2c57-private-staging-readiness-gate-v1.md",
    "PHASE2C57_PRIVATE_STAGING_READINESS_GATE_V1",
  );
  for (const required of [
    "evaluateDocumentSyncPrivateStagingReadiness",
    "buildDocumentSyncPrivateStagingBlockers",
    "summarizeDocumentSyncPrivateStagingReadiness",
    "blocked_by_default",
    "ready_for_human_review",
    "ready_for_manual_authorization",
    "rejected",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/private-staging-readiness.ts", required);
  }
  runVitest("src/lib/document-sync-integrity/private-staging-readiness.test.ts");
}

export function validatePhase2C58() {
  assertPackageScript("validate:phase2c58-private-staging-environment-contract");
  assertIncludes(
    "src/lib/document-sync-integrity/private-staging-environment.ts",
    "PHASE2C58_PRIVATE_STAGING_ENVIRONMENT_CONTRACT_V1",
  );
  assertIncludes(
    "docs/phase2c58-private-staging-environment-contract-v1.md",
    "PHASE2C58_PRIVATE_STAGING_ENVIRONMENT_CONTRACT_V1",
  );
  for (const required of [
    "DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED",
    "DOCUMENT_SYNC_PRIVATE_STAGING_MODE",
    "DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE",
    "DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH",
    "public_variable_rejected",
    "production_environment",
    "remote_environment",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/private-staging-environment.ts", required);
  }
  runVitest("src/lib/document-sync-integrity/private-staging-environment.test.ts");
}

export function validatePhase2C59() {
  assertPackageScript("validate:phase2c59-private-staging-secret-boundary-contract");
  assertIncludes(
    "src/lib/document-sync-integrity/private-staging-secret-boundary.ts",
    "PHASE2C59_PRIVATE_STAGING_SECRET_BOUNDARY_CONTRACT_V1",
  );
  assertIncludes(
    "docs/phase2c59-private-staging-secret-boundary-contract-v1.md",
    "PHASE2C59_PRIVATE_STAGING_SECRET_BOUNDARY_CONTRACT_V1",
  );
  for (const required of [
    "evaluatePrivateStagingSecretBoundary",
    "redactPrivateStagingSecretSummary",
    "placeholder_only",
    "runtime_reference_only",
    "material_value_rejected",
    "public_variable_rejected",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/private-staging-secret-boundary.ts", required);
  }
  runVitest("src/lib/document-sync-integrity/private-staging-secret-boundary.test.ts");
}

export function validatePhase2C60() {
  assertPackageScript("validate:phase2c60-private-staging-human-approval-checklist");
  assertIncludes(
    "src/lib/document-sync-integrity/private-staging-readiness.ts",
    "PHASE2C60_PRIVATE_STAGING_HUMAN_APPROVAL_CHECKLIST_V1",
  );
  assertIncludes(
    "docs/phase2c60-private-staging-human-approval-checklist-v1.md",
    "PHASE2C60_PRIVATE_STAGING_HUMAN_APPROVAL_CHECKLIST_V1",
  );
  const template = JSON.parse(
    read("docs/phase2c60-private-staging-human-approval-checklist.template.json"),
  );
  for (const required of [
    "securityReviewApproved",
    "legalReviewApproved",
    "dataProtectionReviewApproved",
    "stagingEnvironmentApproved",
    "rollbackPlanApproved",
    "observabilityApproved",
    "noRealDataConfirmed",
    "noProductionConfirmed",
    "routeStillDisabledByDefaultConfirmed",
    "ownerApproval",
  ]) {
    assert(required in template, `Approval template missing ${required}.`);
    assert(template[required] === false, `Approval template ${required} must default false.`);
  }
}

export function validatePhase2C61() {
  assertPackageScript("validate:phase2c61-private-staging-kill-switch-rollback-runbook");
  assertIncludes(
    "docs/phase2c61-private-staging-kill-switch-rollback-runbook-v1.md",
    "PHASE2C61_PRIVATE_STAGING_KILL_SWITCH_ROLLBACK_RUNBOOK_V1",
  );
  for (const required of [
    "DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH",
    "disabled by default",
    "fake adapter",
    "Supabase local",
    "No produccion",
    "No Supabase remoto",
    "No staging remoto activo",
  ]) {
    assertIncludes("docs/phase2c61-private-staging-kill-switch-rollback-runbook-v1.md", required);
  }
}

export function validatePhase2C62() {
  assertPackageScript("validate:phase2c62-private-staging-observability-redaction-readiness");
  assertIncludes(
    "src/lib/document-sync-integrity/private-staging-observability.ts",
    "PHASE2C62_PRIVATE_STAGING_OBSERVABILITY_REDACTION_READINESS_V1",
  );
  assertIncludes(
    "docs/phase2c62-private-staging-observability-redaction-readiness-v1.md",
    "PHASE2C62_PRIVATE_STAGING_OBSERVABILITY_REDACTION_READINESS_V1",
  );
  for (const required of [
    "evaluatePrivateStagingObservabilityReadiness",
    "buildPrivateStagingRedactionChecklist",
    "summarizePrivateStagingObservability",
    "unsafe_payload_capture",
    "unsafe_document_capture",
    "persistent_logging_rejected",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/private-staging-observability.ts", required);
  }
  runVitest("src/lib/document-sync-integrity/private-staging-observability.test.ts");
}

export function validatePhase2C63() {
  assertPackageScript("validate:phase2c63-sync-route-remote-staging-blocker-tests");
  assertPackageScript("test:phase2c63-sync-route-remote-staging-blocker");
  assertIncludes(
    "scripts/phase2c63-sync-route-remote-staging-blocker.test.ts",
    "PHASE2C63_SYNC_ROUTE_REMOTE_STAGING_BLOCKER_TESTS_V1",
  );
  assertIncludes(
    "docs/phase2c63-sync-route-remote-staging-blocker-tests-v1.md",
    "PHASE2C63_SYNC_ROUTE_REMOTE_STAGING_BLOCKER_TESTS_V1",
  );
  for (const required of [
    "evaluateDocumentSyncRouteShellFlag",
    "evaluatePrivateStagingEnvironmentContract",
    "createDocumentSyncSupabaseLocalHandlerHarness",
    "supabaseRemote: true",
    "stagingRemoteActive: true",
  ]) {
    assertIncludes("scripts/phase2c63-sync-route-remote-staging-blocker.test.ts", required);
  }
  runNpm("test:phase2c63-sync-route-remote-staging-blocker");
}

export function validatePhase2C64() {
  assertPackageScript("validate:phase2c64-private-staging-dry-run-report");
  assertIncludes(
    "src/lib/document-sync-integrity/private-staging-dry-run-report.ts",
    "PHASE2C64_PRIVATE_STAGING_DRY_RUN_REPORT_V1",
  );
  assertIncludes(
    "docs/phase2c64-private-staging-dry-run-report-v1.md",
    "PHASE2C64_PRIVATE_STAGING_DRY_RUN_REPORT_V1",
  );
  for (const required of [
    "buildPrivateStagingDryRunReport",
    "redactPrivateStagingDryRunReport",
    "assertPrivateStagingDryRunReportSafe",
    "PHASE2C_PRIVATE_STAGING_READINESS: BLOCKED BY DEFAULT / READY FOR HUMAN REVIEW",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/private-staging-dry-run-report.ts", required);
  }
  runVitest("src/lib/document-sync-integrity/private-staging-dry-run-report.test.ts");
}

export function validatePhase2C57To66Aggregate() {
  for (const scriptName of [
    "validate:phase2c57-private-staging-readiness-gate",
    "validate:phase2c58-private-staging-environment-contract",
    "validate:phase2c59-private-staging-secret-boundary-contract",
    "validate:phase2c60-private-staging-human-approval-checklist",
    "validate:phase2c61-private-staging-kill-switch-rollback-runbook",
    "validate:phase2c62-private-staging-observability-redaction-readiness",
    "validate:phase2c63-sync-route-remote-staging-blocker-tests",
    "validate:phase2c64-private-staging-dry-run-report",
  ]) {
    assertPackageScript(scriptName);
    runNpm(scriptName);
  }

  for (const filePath of [...privateStagingRuntimeFiles, ...privateStagingTestFiles]) {
    assertFile(filePath);
  }

  assertIncludes(
    "docs/phase2c66-private-staging-readiness-gate-checkpoint-v1.md",
    "PHASE2C66_PRIVATE_STAGING_READINESS_GATE_CHECKPOINT_V1",
  );
  assertIncludes(
    "docs/phase2c66-private-staging-readiness-gate-checkpoint-v1.md",
    "PHASE2C_PRIVATE_STAGING_READINESS: BLOCKED BY DEFAULT / READY FOR HUMAN REVIEW",
  );
  for (const required of [
    "NO PRODUCTION",
    "NO SUPABASE PRODUCTION",
    "NO SUPABASE REMOTE",
    "NO STAGING REMOTE ACTIVE",
    "NO PUBLIC ENDPOINT OPERATIVE",
    "NO UI",
    "NO REAL DOCUMENT MUTATION",
    "NO REAL INVOICES",
    "FAKE ADAPTER DEFAULT",
    "SUPABASE LOCAL OPT-IN ONLY",
    "SYNTHETIC_ONLY DATA ONLY",
    "HUMAN APPROVAL REQUIRED",
  ]) {
    assertIncludes("docs/phase2c66-private-staging-readiness-gate-checkpoint-v1.md", required);
  }

  validateNoRedLines();

  const compliance = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "Fase 2C.57-2C.66",
    "evidencia tecnica interna",
    "private staging readiness",
    "gates de autorizacion",
    "route disabled by default",
    "fake adapter default",
    "Supabase local opt-in only",
    "sin produccion",
    "sin Supabase remoto",
    "sin documentos reales",
    "sin endpoint publico operativo",
    "PHASE2C_PRIVATE_STAGING_READINESS: BLOCKED BY DEFAULT / READY FOR HUMAN REVIEW",
    "docs/phase2c66-private-staging-readiness-gate-checkpoint-v1.md",
  ]) {
    assert(compliance.includes(required), `Compliance dossier missing ${required}.`);
  }
}
