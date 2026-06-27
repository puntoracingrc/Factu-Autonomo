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

function runNpm(scriptName) {
  execFileSync("npm", ["run", scriptName], {
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

function assertNoRuntimePattern(relativePath, patterns) {
  const body = read(relativePath);
  for (const [label, regex] of patterns) {
    assert(!regex.test(body), `Forbidden runtime pattern ${label} in ${relativePath}.`);
  }
}

const noExternalRuntimePatterns = [
  ["Supabase import", /@supabase/i],
  ["client factory", /createClient\s*\(/],
  ["remote URL", /https?:\/\/(?!localhost|127\.0\.0\.1|\[::1\])/i],
  ["fetch", /\bfetch\s*\(/],
  ["node http", /node:http|node:https/],
  ["filesystem write", /\bwriteFile(?:Sync)?\b|\bappendFile(?:Sync)?\b|\bcreateWriteStream\b/],
  ["localStorage", /\blocalStorage\b/],
];

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

export function validatePhase2C37() {
  assertIncludes(
    "src/lib/document-sync-integrity/route-local-execution-contract.ts",
    "PHASE2C37_PRIVATE_LOCAL_SYNC_ROUTE_EXECUTION_CONTRACT_V1",
  );
  assertIncludes(
    "src/lib/document-sync-integrity/route-local-execution-contract.test.ts",
    "PHASE2C37_PRIVATE_LOCAL_SYNC_ROUTE_EXECUTION_CONTRACT_V1",
  );
  assertIncludes(
    "docs/phase2c37-private-local-sync-route-execution-contract-v1.md",
    "PHASE2C37_PRIVATE_LOCAL_SYNC_ROUTE_EXECUTION_CONTRACT_V1",
  );
  for (const required of [
    "evaluateDocumentSyncLocalExecutionMode",
    "assertDocumentSyncLocalExecutionAllowed",
    "summarizeDocumentSyncLocalExecutionMode",
    "DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED",
    "DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE",
    "in_memory_local_staging",
    "local_fake_execution_allowed",
    "production_environment",
    "remote_environment",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/route-local-execution-contract.ts", required);
  }
  assertNoRuntimePattern(
    "src/lib/document-sync-integrity/route-local-execution-contract.ts",
    noExternalRuntimePatterns,
  );
  assertPackageScript("validate:phase2c37-private-local-sync-route-execution-contract");
}

export function validatePhase2C38() {
  assertIncludes(
    "src/lib/document-sync-integrity/route-fake-adapter.ts",
    "PHASE2C38_SYNC_ROUTE_FAKE_ADAPTER_FACTORY_V1",
  );
  assertIncludes(
    "src/lib/document-sync-integrity/route-fake-adapter.test.ts",
    "PHASE2C38_SYNC_ROUTE_FAKE_ADAPTER_FACTORY_V1",
  );
  assertIncludes(
    "docs/phase2c38-sync-route-fake-adapter-factory-v1.md",
    "PHASE2C38_SYNC_ROUTE_FAKE_ADAPTER_FACTORY_V1",
  );
  for (const required of [
    "createDocumentSyncRouteFakeAdapter",
    "createDocumentSyncRouteFakeService",
    "seedDocumentSyncRouteFakeStore",
    "createInMemoryDocumentSyncStore",
    "createLocalStagingDocumentSyncAdapter",
    "SYNTHETIC_ONLY_",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/route-fake-adapter.ts", required);
  }
  assertNoRuntimePattern(
    "src/lib/document-sync-integrity/route-fake-adapter.ts",
    noExternalRuntimePatterns,
  );
  assertPackageScript("validate:phase2c38-sync-route-fake-adapter-factory");
}

export function validatePhase2C39() {
  assertIncludes(
    "src/app/api/document-sync/route.ts",
    "PHASE2C39_SYNC_ROUTE_LOCAL_FAKE_EXECUTION_BOUNDARY_V1",
  );
  assertIncludes(
    "docs/phase2c39-sync-route-local-fake-execution-boundary-v1.md",
    "PHASE2C39_SYNC_ROUTE_LOCAL_FAKE_EXECUTION_BOUNDARY_V1",
  );
  const routeAndHandler = `${read("src/app/api/document-sync/route.ts")}\n${read("src/lib/document-sync-integrity/route-handler.ts")}`;
  for (const required of [
    "evaluateDocumentSyncLocalExecutionMode",
    "getDocumentSyncRouteFakeRuntime",
    "createDocumentSyncRouteHandler",
    "route_shell_enabled_but_operations_disabled",
    "route_fake_execution_completed",
    "dry_run_single",
    "apply_single",
    "dry_run_batch",
    "apply_batch",
    "get_safe_report",
    "get_conflict_report",
    "!flag.enabled",
  ]) {
    assert(routeAndHandler.includes(required), `Route/handler missing ${required}.`);
  }
  assertNoRuntimePattern("src/app/api/document-sync/route.ts", [
    ["Supabase import", /@supabase/i],
    ["client factory", /createClient\s*\(/],
    ["payload echo", /echoPayload|rawBodyEcho|payloadEcho/i],
  ]);
  assertPackageScript("validate:phase2c39-sync-route-local-fake-execution-boundary");
}

export function validatePhase2C40() {
  assertIncludes(
    "scripts/phase2c40-sync-route-abuse-payload-hardening.test.ts",
    "PHASE2C40_SYNC_ROUTE_ABUSE_PAYLOAD_HARDENING_V1",
  );
  assertIncludes(
    "docs/phase2c40-sync-route-abuse-payload-hardening-v1.md",
    "PHASE2C40_SYNC_ROUTE_ABUSE_PAYLOAD_HARDENING_V1",
  );
  for (const required of [
    "DOCUMENT_SYNC_ROUTE_ENVELOPE_MAX_BYTES",
    "depth > 8",
    "value.length > 50",
    "PAYLOAD_TOO_LARGE",
    "UNSAFE_BODY",
    "UNKNOWN_ROUTE_OPERATION",
    "NON_SYNTHETIC_ROUTE_PAYLOAD",
  ]) {
    assertIncludes(
      required === "DOCUMENT_SYNC_ROUTE_ENVELOPE_MAX_BYTES" ||
        required === "depth > 8" ||
        required === "value.length > 50"
        ? "src/lib/document-sync-integrity/route-envelope.ts"
        : "scripts/phase2c40-sync-route-abuse-payload-hardening.test.ts",
      required,
    );
  }
  assertPackageScript("validate:phase2c40-sync-route-abuse-payload-hardening");
}

export function validatePhase2C41() {
  assertIncludes(
    "src/lib/document-sync-integrity/route-rate-limit.ts",
    "PHASE2C41_SYNC_ROUTE_IN_MEMORY_RATE_LIMIT_REQUEST_ID_V1",
  );
  assertIncludes(
    "src/lib/document-sync-integrity/route-rate-limit.test.ts",
    "PHASE2C41_SYNC_ROUTE_IN_MEMORY_RATE_LIMIT_REQUEST_ID_V1",
  );
  assertIncludes(
    "docs/phase2c41-sync-route-in-memory-rate-limit-request-id-v1.md",
    "PHASE2C41_SYNC_ROUTE_IN_MEMORY_RATE_LIMIT_REQUEST_ID_V1",
  );
  for (const required of [
    "createInMemoryDocumentSyncRouteRateLimiter",
    "evaluateDocumentSyncRouteRateLimit",
    "generateSafeDocumentSyncRouteRequestId",
    "normalizeDocumentSyncRouteRequestId",
    "summarizeDocumentSyncRouteRateLimit",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/route-rate-limit.ts", required);
  }
  assertNoRuntimePattern("src/lib/document-sync-integrity/route-rate-limit.ts", [
    ...noExternalRuntimePatterns.filter(([label]) => label !== "filesystem write"),
    ["redis", /\bRedis\b/i],
  ]);
  assertPackageScript("validate:phase2c41-sync-route-in-memory-rate-limit-request-id");
}

export function validatePhase2C42() {
  assertIncludes(
    "src/lib/document-sync-integrity/route-idempotency.ts",
    "PHASE2C42_SYNC_ROUTE_LOCAL_FAKE_IDEMPOTENCY_REPLAY_GUARD_V1",
  );
  assertIncludes(
    "src/lib/document-sync-integrity/route-idempotency.test.ts",
    "PHASE2C42_SYNC_ROUTE_LOCAL_FAKE_IDEMPOTENCY_REPLAY_GUARD_V1",
  );
  assertIncludes(
    "docs/phase2c42-sync-route-local-fake-idempotency-replay-guard-v1.md",
    "PHASE2C42_SYNC_ROUTE_LOCAL_FAKE_IDEMPOTENCY_REPLAY_GUARD_V1",
  );
  for (const required of [
    "createInMemoryDocumentSyncRouteIdempotencyStore",
    "evaluateDocumentSyncRouteIdempotency",
    "buildDocumentSyncRouteIdempotencyKey",
    "summarizeDocumentSyncRouteIdempotency",
    "replay",
    "SYNTHETIC_ONLY_",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/route-idempotency.ts", required);
  }
  assertNoRuntimePattern("src/lib/document-sync-integrity/route-idempotency.ts", [
    ...noExternalRuntimePatterns.filter(([label]) => label !== "filesystem write"),
    ["database", /\b(?:supabase|postgres|database)\b/i],
  ]);
  assertPackageScript("validate:phase2c42-sync-route-local-fake-idempotency-replay-guard");
}

export function validatePhase2C43() {
  assertIncludes(
    "src/app/api/document-sync/route.ts",
    "PHASE2C43_SYNC_ROUTE_METHOD_CONTENT_CACHE_CORS_HARDENING_V1",
  );
  assertIncludes(
    "docs/phase2c43-sync-route-method-content-cache-cors-hardening-v1.md",
    "PHASE2C43_SYNC_ROUTE_METHOD_CONTENT_CACHE_CORS_HARDENING_V1",
  );
  const routeAndHandler = `${read("src/app/api/document-sync/route.ts")}\n${read("src/lib/document-sync-integrity/route-handler.ts")}`;
  for (const required of [
    "export async function PUT",
    "export async function PATCH",
    "export async function DELETE",
    "export async function OPTIONS",
    "UNSUPPORTED_CONTENT_TYPE",
    "allow = \"GET, POST\"",
  ]) {
    assert(routeAndHandler.includes(required), `Route/handler missing ${required}.`);
  }
  for (const required of ["cache-control", "no-store"]) {
    assertIncludes("src/lib/document-sync-integrity/route-envelope.ts", required);
  }
  assert(!/access-control-allow-origin["']?\s*:\s*["']\*/i.test(read("src/app/api/document-sync/route.ts")), "CORS wildcard must not be opened.");
  assertPackageScript("validate:phase2c43-sync-route-method-content-cache-cors-hardening");
}

export function validatePhase2C44() {
  assertIncludes(
    "src/lib/document-sync-integrity/route-telemetry.ts",
    "PHASE2C44_SYNC_ROUTE_SAFE_TELEMETRY_REPORT_V1",
  );
  assertIncludes(
    "src/lib/document-sync-integrity/route-telemetry.test.ts",
    "PHASE2C44_SYNC_ROUTE_SAFE_TELEMETRY_REPORT_V1",
  );
  assertIncludes(
    "docs/phase2c44-sync-route-safe-telemetry-report-v1.md",
    "PHASE2C44_SYNC_ROUTE_SAFE_TELEMETRY_REPORT_V1",
  );
  for (const required of [
    "createInMemoryDocumentSyncRouteTelemetry",
    "recordDocumentSyncRouteTelemetryEvent",
    "buildDocumentSyncRouteTelemetryReport",
    "redactDocumentSyncRouteTelemetryEvent",
    "persisted: false",
    "route_method_rejected",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/route-telemetry.ts", required);
  }
  assertNoRuntimePattern(
    "src/lib/document-sync-integrity/route-telemetry.ts",
    noExternalRuntimePatterns,
  );
  assertPackageScript("validate:phase2c44-sync-route-safe-telemetry-report");
}

export function validatePhase2C45() {
  assertIncludes(
    "scripts/phase2c45-private-local-sync-route-fake-acceptance.test.ts",
    "PHASE2C45_PRIVATE_LOCAL_SYNC_ROUTE_FAKE_ACCEPTANCE_V1",
  );
  assertIncludes(
    "docs/phase2c45-private-local-sync-route-fake-acceptance-v1.md",
    "PHASE2C45_PRIVATE_LOCAL_SYNC_ROUTE_FAKE_ACCEPTANCE_V1",
  );
  assertPackageScript("test:phase2c45-private-local-sync-route-fake-acceptance");
  assertPackageScript("validate:phase2c45-private-local-sync-route-fake-acceptance");
  runNpm("test:phase2c45-private-local-sync-route-fake-acceptance");
}

export function validatePhase2C46() {
  assertIncludes(
    "scripts/phase2c46-sync-route-operational-hardening-acceptance.test.ts",
    "PHASE2C46_SYNC_ROUTE_OPERATIONAL_HARDENING_ACCEPTANCE_V1",
  );
  assertIncludes(
    "docs/phase2c46-sync-route-operational-hardening-acceptance-v1.md",
    "PHASE2C46_SYNC_ROUTE_OPERATIONAL_HARDENING_ACCEPTANCE_V1",
  );
  assertPackageScript("test:phase2c46-sync-route-operational-hardening-acceptance");
  assertPackageScript("validate:phase2c46-sync-route-operational-hardening-acceptance");
  runNpm("test:phase2c46-sync-route-operational-hardening-acceptance");
}

export function validatePhase2C37To48Aggregate() {
  for (const scriptName of [
    "validate:phase2c37-private-local-sync-route-execution-contract",
    "validate:phase2c38-sync-route-fake-adapter-factory",
    "validate:phase2c39-sync-route-local-fake-execution-boundary",
    "validate:phase2c40-sync-route-abuse-payload-hardening",
    "validate:phase2c41-sync-route-in-memory-rate-limit-request-id",
    "validate:phase2c42-sync-route-local-fake-idempotency-replay-guard",
    "validate:phase2c43-sync-route-method-content-cache-cors-hardening",
    "validate:phase2c44-sync-route-safe-telemetry-report",
    "validate:phase2c45-private-local-sync-route-fake-acceptance",
    "validate:phase2c46-sync-route-operational-hardening-acceptance",
  ]) {
    assertPackageScript(scriptName);
    runNpm(scriptName);
  }

  assertIncludes(
    "docs/phase2c48-private-local-sync-route-fake-execution-hardening-checkpoint-v1.md",
    "PHASE2C48_PRIVATE_LOCAL_SYNC_ROUTE_FAKE_EXECUTION_HARDENING_CHECKPOINT_V1",
  );
  assertIncludes(
    "docs/phase2c48-private-local-sync-route-fake-execution-hardening-checkpoint-v1.md",
    "LOCAL FAKE EXECUTION HARDENED / NO PRODUCTION / NO REAL DATA",
  );

  const changedPaths = new Set([
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["diff", "--name-only", "--cached"]),
    ...gitLines(["diff", "--name-only", "main...HEAD"]),
    ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]);

  const allowedPatterns = [
    /^src\/app\/api\/document-sync\/route\.ts$/,
    /^src\/lib\/document-sync-integrity\//,
    /^scripts\/phase2c40-sync-route-abuse-payload-hardening\.test\.ts$/,
    /^scripts\/phase2c45-private-local-sync-route-fake-acceptance\.test\.ts$/,
    /^scripts\/phase2c46-sync-route-operational-hardening-acceptance\.test\.ts$/,
    /^scripts\/phase2c5[1234]-.*\.test\.ts$/,
    /^scripts\/phase2c63-.*\.test\.ts$/,
    /^scripts\/validate-phase2c(?:37|38|39|40|41|42|43|44|45|46|37-48)-.*\.mjs$/,
    /^scripts\/validate-phase2c(?:49|50|51|52|53|54|49-56)-.*\.mjs$/,
    /^scripts\/validate-phase2c(?:57|58|59|60|61|62|63|64|57-66)-.*\.mjs$/,
    /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
    /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
    /^scripts\/validate-phase2c7-12-local-staging-sync-adapter\.mjs$/,
    /^scripts\/validate-phase2c13-18-supabase-local-sync-adapter\.mjs$/,
    /^scripts\/validate-phase2c19-24-supabase-local-schema-acceptance\.mjs$/,
    /^scripts\/validate-phase2c25-30-server-document-sync-service\.mjs$/,
    /^scripts\/validate-phase2c32-disabled-sync-route-shell-http\.mjs$/,
    /^scripts\/validate-phase2c31-36-disabled-sync-route-shell\.mjs$/,
    /^scripts\/validate-audit-export-v1-compliance-dossier-snapshot\.mjs$/,
    /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78|89|90)-/,
    /^scripts\/validate-phase2d/,
    /^docs\/phase2c(?:37|38|39|40|41|42|43|44|45|46|48)-.*\.md$/,
    /^docs\/phase2c(?:49|50|51|52|53|54|56)-.*\.md$/,
    /^docs\/phase2c(?:57|58|59|60|61|62|63|64|66)-.*\.(?:md|json)$/,
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
      `Unexpected path touched in 2C.37-2C.48: ${changedPath}.`,
    );
    assert(!/^supabase\/migrations\//.test(changedPath), `New migration touched: ${changedPath}.`);
    assert(!/vida/i.test(changedPath), `ViDA path touched: ${changedPath}.`);
    assert(!/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath), `Vercel config touched: ${changedPath}.`);
    assert(changedPath === "src/app/api/document-sync/route.ts" || !/^(?:src\/app|app|components|public)\//.test(changedPath), `UI/public path touched: ${changedPath}.`);
    assert(!/stripe|openai|importers/i.test(changedPath), `Forbidden product path touched: ${changedPath}.`);
    assert(!changedPath.toLowerCase().endsWith(".pdf"), `PDF binary is not authorized: ${changedPath}.`);
  }

  for (const runtimePath of [
    "src/app/api/document-sync/route.ts",
    "src/lib/document-sync-integrity/route-local-execution-contract.ts",
    "src/lib/document-sync-integrity/route-fake-adapter.ts",
    "src/lib/document-sync-integrity/route-local-state.ts",
    "src/lib/document-sync-integrity/route-rate-limit.ts",
    "src/lib/document-sync-integrity/route-idempotency.ts",
    "src/lib/document-sync-integrity/route-telemetry.ts",
    "src/lib/document-sync-integrity/route-handler.ts",
    "src/lib/document-sync-integrity/route-supabase-local-harness.ts",
  ]) {
    assertNoRuntimePattern(runtimePath, noExternalRuntimePatterns);
  }

  const route = read("src/app/api/document-sync/route.ts");
  const handler = read("src/lib/document-sync-integrity/route-handler.ts");
  const routeAndHandler = `${route}\n${handler}`;
  assert(routeAndHandler.includes("if (!flag.enabled)"), "Route handler must stay disabled by default.");
  assert(routeAndHandler.includes("buildDocumentSyncRouteDisabledResponse"), "Route disabled response is required.");
  assert(!/Access-Control-Allow-Origin["']?\s*:\s*["']\*/i.test(routeAndHandler), "Route must not open CORS wildcard.");
  assert(!/console\.(?:log|warn|error)/.test(route), "Route must not log by default.");

  const compliance = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "Fase 2C.37-2C.48",
    "evidencia tecnica interna",
    "local/staging",
    "fake adapter",
    "server-only",
    "route shell deshabilitada por defecto",
    "ejecucion local/fake solo con flags privadas",
    "sin produccion",
    "sin Supabase remoto",
    "sin documentos reales",
    "sin endpoint publico operativo",
    "PHASE2C_PRIVATE_LOCAL_SYNC_ROUTE_FAKE_EXECUTION: LOCAL FAKE EXECUTION HARDENED / NO PRODUCTION / NO REAL DATA",
    "docs/phase2c48-private-local-sync-route-fake-execution-hardening-checkpoint-v1.md",
  ]) {
    assert(compliance.includes(required), `Compliance dossier missing ${required}.`);
  }

  assert(
    gitLines(["ls-files", "docs/vida-screenshots-local"]).length === 0,
    "docs/vida-screenshots-local is tracked in git.",
  );
}
