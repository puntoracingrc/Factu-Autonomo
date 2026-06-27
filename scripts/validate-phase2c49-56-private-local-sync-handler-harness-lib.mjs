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

const sensitiveRole = ["service", "role"].join("_");
const fiscalTransportTable = ["fiscal", "transport", "attempts"].join("_");
const credentialWord = ["sec", "ret"].join("");

const runtimeForbidden = [
  ["Supabase package import", /@supabase\/supabase-js/i],
  ["client factory", /createClient\s*\(/],
  ["env read", /process\.env/],
  ["network fetch", /\bfetch\s*\(/],
  ["filesystem", /node:fs|from ["']fs["']|\bwriteFile(?:Sync)?\b|\breadFile(?:Sync)?\b/],
  ["Next response", /NextResponse/],
  ["payload echo", /echoPayload|rawBodyEcho|payloadEcho/i],
  ["wildcard CORS", /access-control-allow-origin["']?\s*:\s*["']\*/i],
];

function validateNoRedLines() {
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
    /^scripts\/phase2c5[1234]-.*\.test\.ts$/,
    /^scripts\/phase2c63-.*\.test\.ts$/,
    /^scripts\/validate-phase2c(?:49|50|51|52|53|54|49-56)-.*\.mjs$/,
    /^scripts\/validate-phase2c(?:57|58|59|60|61|62|63|64|57-66)-.*\.mjs$/,
    /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
    /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
    /^scripts\/validate-phase2c7-12-local-staging-sync-adapter\.mjs$/,
    /^scripts\/validate-phase2c13-18-supabase-local-sync-adapter\.mjs$/,
    /^scripts\/validate-phase2c19-24-supabase-local-schema-acceptance\.mjs$/,
    /^scripts\/validate-phase2c25-30-server-document-sync-service\.mjs$/,
    /^scripts\/validate-phase2c31-36-disabled-sync-route-shell\.mjs$/,
    /^scripts\/validate-phase2c32-disabled-sync-route-shell-http\.mjs$/,
    /^scripts\/validate-phase2c37-48-.*\.mjs$/,
    /^scripts\/validate-phase2c39-.*\.mjs$/,
    /^scripts\/validate-phase2c43-.*\.mjs$/,
    /^scripts\/validate-audit-export-v1-compliance-dossier-snapshot\.mjs$/,
    /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78)-/,
    /^scripts\/validate-phase2d/,
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
      `Unexpected path touched in 2C.49-2C.56: ${changedPath}.`,
    );
    assert(!/^supabase\/migrations\//.test(changedPath), `Migration touched: ${changedPath}.`);
    assert(!/vida/i.test(changedPath), `ViDA path touched: ${changedPath}.`);
    assert(!/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath), `Vercel config touched: ${changedPath}.`);
    assert(changedPath === "src/app/api/document-sync/route.ts" || !/^(?:src\/app|app|components|public)\//.test(changedPath), `UI/public path touched: ${changedPath}.`);
    assert(!/(?:stripe|openai|importers|aeat|(?:^|[\/_-])qr(?:[\/_.-]|$)|(?:^|[\/_-])firma(?:[\/_.-]|$)|certificado|transport)/i.test(changedPath), `Forbidden product path touched: ${changedPath}.`);
    assert(!changedPath.toLowerCase().endsWith(".pdf"), `PDF binary is not authorized: ${changedPath}.`);
  }

  for (const changedPath of changedPaths) {
    if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
    if (changedPath.startsWith("docs/audit/")) continue;
    if (
      changedPath === "package.json" ||
      /^src\/lib\/local-data-safety\//.test(changedPath) ||
      /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78)-/.test(changedPath) ||
      /^docs\/phase2d/.test(changedPath) ||
      /^src\/lib\/document-sync-integrity\/private-staging-/.test(changedPath) ||
      /^scripts\/phase2c63-/.test(changedPath) ||
      /^scripts\/validate-phase2c(?:57|58|59|60|61|62|63|64|57-66)-/.test(changedPath) ||
      /^docs\/phase2c(?:57|58|59|60|61|62|63|64|66)-/.test(changedPath)
    ) {
      continue;
    }
    if (!fs.existsSync(absolute(changedPath))) continue;
    const added = addedLines(changedPath).join("\n");
    for (const [label, regex] of [
      ["remote URL", /https?:\/\/(?!localhost|127\.0\.0\.1|\[::1\])/i],
      ["privileged role literal", new RegExp(sensitiveRole, "i")],
      ["credential marker", new RegExp(credentialWord, "i")],
      ["fiscal transport table", new RegExp(fiscalTransportTable, "i")],
      ["wildcard CORS", /access-control-allow-origin["']?\s*:\s*["']\*/i],
      ["payload echo", /echoPayload|rawBodyEcho|payloadEcho/i],
      ["public route activation", /routeOperationsEnabled|syncOperationEnabled/i],
    ]) {
      assert(!regex.test(added), `Forbidden added content ${label} in ${changedPath}.`);
    }
  }

  assert(
    gitLines(["ls-files", "docs/vida-screenshots-local"]).length === 0,
    "docs/vida-screenshots-local is tracked in git.",
  );
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

export function validatePhase2C49() {
  assertPackageScript("validate:phase2c49-sync-route-security-review");
  assertIncludes(
    "docs/phase2c49-sync-route-security-review-v1.md",
    "PHASE2C49_SYNC_ROUTE_SECURITY_REVIEW_V1",
  );
  for (const required of [
    "disabled by default",
    "fake/local",
    "Payload abuse",
    "user/scope",
    "Supabase remoto",
    "Gaps antes de staging privado",
  ]) {
    assertIncludes("docs/phase2c49-sync-route-security-review-v1.md", required);
  }
}

export function validatePhase2C50() {
  assertPackageScript("validate:phase2c50-sync-route-handler-dependency-boundary");
  assertIncludes(
    "src/lib/document-sync-integrity/route-handler.ts",
    "PHASE2C50_SYNC_ROUTE_HANDLER_DEPENDENCY_BOUNDARY_V1",
  );
  assertIncludes(
    "src/lib/document-sync-integrity/route-handler.test.ts",
    "PHASE2C50_SYNC_ROUTE_HANDLER_DEPENDENCY_BOUNDARY_V1",
  );
  assertIncludes(
    "docs/phase2c50-sync-route-handler-dependency-boundary-v1.md",
    "PHASE2C50_SYNC_ROUTE_HANDLER_DEPENDENCY_BOUNDARY_V1",
  );
  for (const required of [
    "createDocumentSyncRouteHandler",
    "handleDocumentSyncRouteRequest",
    "summarizeDocumentSyncRouteHandlerResult",
    "authContextFactory",
    "serviceFactory",
    "requestIdFactory",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/route-handler.ts", required);
  }
  assertNoPattern("src/lib/document-sync-integrity/route-handler.ts", runtimeForbidden);
  const route = read("src/app/api/document-sync/route.ts");
  assert(route.includes("createDocumentSyncRouteHandler"), "Route must use handler boundary.");
  assert(!/@supabase|createClient\s*\(/i.test(route), "Route must not create Supabase clients.");
  runBin("npx", [
    "vitest",
    "run",
    "src/lib/document-sync-integrity/route-handler.test.ts",
  ]);
}

export function validatePhase2C51() {
  assertPackageScript("validate:phase2c51-supabase-local-sync-handler-harness-opt-in");
  assertPackageScript("test:phase2c51-supabase-local-sync-handler-harness");
  for (const filePath of [
    "src/lib/document-sync-integrity/route-supabase-local-harness.ts",
    "src/lib/document-sync-integrity/route-supabase-local-harness.test.ts",
    "scripts/phase2c51-supabase-local-sync-handler-harness.test.ts",
    "docs/phase2c51-supabase-local-sync-handler-harness-opt-in-v1.md",
  ]) {
    assertIncludes(filePath, "PHASE2C51_SUPABASE_LOCAL_SYNC_HANDLER_HARNESS_OPT_IN_V1");
  }
  for (const required of [
    "createDocumentSyncSupabaseLocalHandlerHarness",
    "client?: DocumentSyncSupabaseClientLike",
    "service?: DocumentSyncServerService",
    "databaseTarget: \"local\"",
    "remote: false",
    "SYNTHETIC_ONLY_",
  ]) {
    assertIncludes("src/lib/document-sync-integrity/route-supabase-local-harness.ts", required);
  }
  assertNoPattern("src/lib/document-sync-integrity/route-supabase-local-harness.ts", [
    ...runtimeForbidden,
    ["env read", /process\.env/],
  ]);
  runBin("npx", [
    "vitest",
    "run",
    "src/lib/document-sync-integrity/route-supabase-local-harness.test.ts",
  ]);
  runNpm("test:phase2c51-supabase-local-sync-handler-harness");
}

export function validatePhase2C52() {
  assertPackageScript("validate:phase2c52-sync-handler-fake-supabase-local-parity");
  assertPackageScript("test:phase2c52-sync-handler-fake-supabase-local-parity");
  assertIncludes(
    "scripts/phase2c52-sync-handler-fake-supabase-local-parity.test.ts",
    "PHASE2C52_SYNC_HANDLER_FAKE_SUPABASE_LOCAL_PARITY_V1",
  );
  assertIncludes(
    "docs/phase2c52-sync-handler-fake-supabase-local-parity-v1.md",
    "PHASE2C52_SYNC_HANDLER_FAKE_SUPABASE_LOCAL_PARITY_V1",
  );
  for (const required of [
    "createSupabaseLocalStagingDocumentSyncAdapter",
    "expectParity",
    "create draft",
    "stale conflict",
    "safe report",
  ]) {
    assertIncludes("scripts/phase2c52-sync-handler-fake-supabase-local-parity.test.ts", required);
  }
  runNpm("test:phase2c52-sync-handler-fake-supabase-local-parity");
}

export function validatePhase2C53() {
  assertPackageScript("validate:phase2c53-sync-route-auth-scope-adversarial-matrix");
  assertPackageScript("test:phase2c53-sync-route-auth-scope-adversarial-matrix");
  assertIncludes(
    "scripts/phase2c53-sync-route-auth-scope-adversarial-matrix.test.ts",
    "PHASE2C53_SYNC_ROUTE_AUTH_SCOPE_ADVERSARIAL_MATRIX_V1",
  );
  assertIncludes(
    "docs/phase2c53-sync-route-auth-scope-adversarial-matrix-v1.md",
    "PHASE2C53_SYNC_ROUTE_AUTH_SCOPE_ADVERSARIAL_MATRIX_V1",
  );
  for (const required of [
    "payloadUserId",
    "payloadScopeId",
    "rejectMissingRouteAuthContext",
    "NON_SYNTHETIC_ROUTE_PAYLOAD",
    "PAYLOAD_AUTH_REJECTED",
  ]) {
    assertIncludes("scripts/phase2c53-sync-route-auth-scope-adversarial-matrix.test.ts", required);
  }
  runNpm("test:phase2c53-sync-route-auth-scope-adversarial-matrix");
}

export function validatePhase2C54() {
  assertPackageScript("validate:phase2c54-sync-route-operational-failure-injection");
  assertPackageScript("test:phase2c54-sync-route-operational-failure-injection");
  assertIncludes(
    "scripts/phase2c54-sync-route-operational-failure-injection.test.ts",
    "PHASE2C54_SYNC_ROUTE_OPERATIONAL_FAILURE_INJECTION_V1",
  );
  assertIncludes(
    "docs/phase2c54-sync-route-operational-failure-injection-v1.md",
    "PHASE2C54_SYNC_ROUTE_OPERATIONAL_FAILURE_INJECTION_V1",
  );
  for (const required of [
    "throwingAdapter",
    "ROUTE_RATE_LIMIT_FAILED",
    "ROUTE_IDEMPOTENCY_EVALUATION_FAILED",
    "ROUTE_REQUEST_ID_FAILED",
    "SHOULD_NOT_LEAK_STACK",
  ]) {
    assertIncludes("scripts/phase2c54-sync-route-operational-failure-injection.test.ts", required);
  }
  runNpm("test:phase2c54-sync-route-operational-failure-injection");
}

export function validatePhase2C49To56Aggregate() {
  for (const scriptName of [
    "validate:phase2c49-sync-route-security-review",
    "validate:phase2c50-sync-route-handler-dependency-boundary",
    "validate:phase2c51-supabase-local-sync-handler-harness-opt-in",
    "validate:phase2c52-sync-handler-fake-supabase-local-parity",
    "validate:phase2c53-sync-route-auth-scope-adversarial-matrix",
    "validate:phase2c54-sync-route-operational-failure-injection",
  ]) {
    assertPackageScript(scriptName);
    runNpm(scriptName);
  }

  assertIncludes(
    "docs/phase2c56-private-local-sync-handler-harness-checkpoint-v1.md",
    "PHASE2C56_PRIVATE_LOCAL_SYNC_HANDLER_HARNESS_CHECKPOINT_V1",
  );
  assertIncludes(
    "docs/phase2c56-private-local-sync-handler-harness-checkpoint-v1.md",
    "PHASE2C_PRIVATE_LOCAL_SYNC_HANDLER_HARNESS: READY FOR PRIVATE STAGING DESIGN REVIEW / NO PRODUCTION",
  );

  validateNoRedLines();

  const compliance = read("docs/compliance-evidence-v1.md");
  for (const required of [
    "Fase 2C.49-2C.56",
    "evidencia tecnica interna",
    "local/staging",
    "handler privado",
    "dependencias inyectadas",
    "fake adapter",
    "Supabase local opt-in",
    "sin produccion",
    "sin Supabase remoto",
    "sin endpoint publico operativo",
    "sin documentos reales",
    "PHASE2C_PRIVATE_LOCAL_SYNC_HANDLER_HARNESS: READY FOR PRIVATE STAGING DESIGN REVIEW / NO PRODUCTION",
    "docs/phase2c56-private-local-sync-handler-harness-checkpoint-v1.md",
  ]) {
    assert(compliance.includes(required), `Compliance dossier missing ${required}.`);
  }
}
