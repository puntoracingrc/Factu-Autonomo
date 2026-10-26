import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const errors = [];

function fail(message) {
  errors.push(message);
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.existsSync(absolute(relativePath))
    ? fs.readFileSync(absolute(relativePath), "utf8")
    : "";
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

function run(scriptName) {
  try {
    execFileSync("npm", ["run", scriptName], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    fail(`${scriptName} failed: ${error.message}`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
const requiredScripts = [
  "validate:phase2c31-disabled-sync-route-private-flag-contract",
  "validate:phase2c32-disabled-sync-route-shell-http",
  "validate:phase2c33-sync-route-auth-context-adapter",
  "validate:phase2c34-sync-route-safe-envelope",
  "validate:phase2c35-disabled-sync-route-shell-acceptance",
  "validate:phase2c31-36-disabled-sync-route-shell",
  "test:phase2c35-disabled-sync-route-shell-acceptance",
];

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of requiredScripts.slice(0, 5)) run(scriptName);

const requiredFiles = [
  "src/app/api/document-sync/route.ts",
  "src/lib/document-sync-integrity/route-shell-flag.ts",
  "src/lib/document-sync-integrity/route-auth-context.ts",
  "src/lib/document-sync-integrity/route-envelope.ts",
  "scripts/phase2c35-disabled-sync-route-shell-acceptance.test.ts",
  "docs/phase2c31-disabled-sync-route-private-flag-contract-v1.md",
  "docs/phase2c32-disabled-sync-route-shell-http-v1.md",
  "docs/phase2c33-sync-route-auth-context-adapter-v1.md",
  "docs/phase2c34-sync-route-safe-envelope-v1.md",
  "docs/phase2c35-disabled-sync-route-shell-acceptance-v1.md",
  "docs/phase2c36-disabled-sync-route-shell-checkpoint-v1.md",
];

for (const filePath of requiredFiles) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing required file ${filePath}.`);
}

const checkpoint = read("docs/phase2c36-disabled-sync-route-shell-checkpoint-v1.md");
for (const marker of [
  "PHASE2C36_DISABLED_SYNC_ROUTE_SHELL_CHECKPOINT_V1",
  "PHASE2C_DISABLED_SYNC_ROUTE_SHELL:",
  "DISABLED BY DEFAULT / NO OPERATIONS ENABLED",
  "NO PRODUCTION",
  "NO SUPABASE PRODUCTION",
  "NO SUPABASE REMOTE",
  "NO PUBLIC ENDPOINT OPERATIVE",
  "NO UI",
  "NO REAL DOCUMENT MUTATION",
  "NO REAL INVOICES",
  "NO ROUTE OPERATIONS ENABLED",
]) {
  if (!checkpoint.includes(marker)) fail(`Checkpoint missing marker ${marker}.`);
}

const changedPaths = new Set([
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);

const allowedPathPatterns = [
  /^src\/app\/api\/document-sync\/route\.ts$/,
  /^src\/lib\/document-sync-integrity\//,
  /^scripts\/phase2c35-disabled-sync-route-shell-acceptance\.test\.ts$/,
  /^scripts\/phase2c40-sync-route-abuse-payload-hardening\.test\.ts$/,
  /^scripts\/phase2c45-private-local-sync-route-fake-acceptance\.test\.ts$/,
  /^scripts\/phase2c46-sync-route-operational-hardening-acceptance\.test\.ts$/,
  /^scripts\/phase2c5[1234]-.*\.test\.ts$/,
  /^scripts\/phase2c63-.*\.test\.ts$/,
  /^scripts\/validate-phase2c31-.*\.mjs$/,
  /^scripts\/validate-phase2c32-.*\.mjs$/,
  /^scripts\/validate-phase2c33-.*\.mjs$/,
  /^scripts\/validate-phase2c34-.*\.mjs$/,
  /^scripts\/validate-phase2c35-.*\.mjs$/,
  /^scripts\/validate-phase2c31-36-.*\.mjs$/,
  /^scripts\/validate-phase2c37-.*\.mjs$/,
  /^scripts\/validate-phase2c38-.*\.mjs$/,
  /^scripts\/validate-phase2c39-.*\.mjs$/,
  /^scripts\/validate-phase2c40-.*\.mjs$/,
  /^scripts\/validate-phase2c41-.*\.mjs$/,
  /^scripts\/validate-phase2c42-.*\.mjs$/,
  /^scripts\/validate-phase2c43-.*\.mjs$/,
  /^scripts\/validate-phase2c44-.*\.mjs$/,
  /^scripts\/validate-phase2c45-.*\.mjs$/,
  /^scripts\/validate-phase2c46-.*\.mjs$/,
  /^scripts\/validate-phase2c37-48-.*\.mjs$/,
  /^scripts\/validate-phase2c49-.*\.mjs$/,
  /^scripts\/validate-phase2c50-.*\.mjs$/,
  /^scripts\/validate-phase2c51-.*\.mjs$/,
  /^scripts\/validate-phase2c52-.*\.mjs$/,
  /^scripts\/validate-phase2c53-.*\.mjs$/,
  /^scripts\/validate-phase2c54-.*\.mjs$/,
  /^scripts\/validate-phase2c49-56-.*\.mjs$/,
  /^scripts\/validate-phase2c57-.*\.mjs$/,
  /^scripts\/validate-phase2c58-.*\.mjs$/,
  /^scripts\/validate-phase2c59-.*\.mjs$/,
  /^scripts\/validate-phase2c60-.*\.mjs$/,
  /^scripts\/validate-phase2c61-.*\.mjs$/,
  /^scripts\/validate-phase2c62-.*\.mjs$/,
  /^scripts\/validate-phase2c63-.*\.mjs$/,
  /^scripts\/validate-phase2c64-.*\.mjs$/,
  /^scripts\/validate-phase2c57-66-.*\.mjs$/,
  /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78|89|90|101|102)-/,
  /^scripts\/validate-phase2d/,
  /^src\/lib\/local-data-safety\//,
    /^src\/components\/local-data-safety\//,
  /^scripts\/phase2e10-storage-resilience-acceptance\.test\.ts$/,
  /^scripts\/validate-phase2e/,
  /^src\/lib\/local-storage-resilience\//,
  /^docs\/phase2e/,
  /^scripts\/validate-phase2c1-sync-surface-audit\.mjs$/,
  /^scripts\/validate-phase2b3e-ingest-route-safety\.mjs$/,
  /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
  /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
  /^scripts\/validate-phase2c7-12-local-staging-sync-adapter\.mjs$/,
  /^scripts\/validate-phase2c13-18-supabase-local-sync-adapter\.mjs$/,
  /^scripts\/validate-phase2c19-24-supabase-local-schema-acceptance\.mjs$/,
  /^scripts\/validate-phase2c25-30-server-document-sync-service\.mjs$/,
  /^docs\/phase2c31-disabled-sync-route-private-flag-contract-v1\.md$/,
  /^docs\/phase2c32-disabled-sync-route-shell-http-v1\.md$/,
  /^docs\/phase2c33-sync-route-auth-context-adapter-v1\.md$/,
  /^docs\/phase2c34-sync-route-safe-envelope-v1\.md$/,
  /^docs\/phase2c35-disabled-sync-route-shell-acceptance-v1\.md$/,
  /^docs\/phase2c36-disabled-sync-route-shell-checkpoint-v1\.md$/,
  /^docs\/phase2c37-.*\.md$/,
  /^docs\/phase2c38-.*\.md$/,
  /^docs\/phase2c39-.*\.md$/,
  /^docs\/phase2c40-.*\.md$/,
  /^docs\/phase2c41-.*\.md$/,
  /^docs\/phase2c42-.*\.md$/,
  /^docs\/phase2c43-.*\.md$/,
  /^docs\/phase2c44-.*\.md$/,
  /^docs\/phase2c45-.*\.md$/,
  /^docs\/phase2c46-.*\.md$/,
  /^docs\/phase2c48-.*\.md$/,
  /^docs\/phase2c49-.*\.md$/,
  /^docs\/phase2c50-.*\.md$/,
  /^docs\/phase2c51-.*\.md$/,
  /^docs\/phase2c52-.*\.md$/,
  /^docs\/phase2c53-.*\.md$/,
  /^docs\/phase2c54-.*\.md$/,
  /^docs\/phase2c56-.*\.md$/,
  /^docs\/phase2c57-.*\.(?:md|json)$/,
  /^docs\/phase2c58-.*\.md$/,
  /^docs\/phase2c59-.*\.md$/,
  /^docs\/phase2c60-.*\.(?:md|json)$/,
  /^docs\/phase2c61-.*\.md$/,
  /^docs\/phase2c62-.*\.md$/,
  /^docs\/phase2c63-.*\.md$/,
  /^docs\/phase2c64-.*\.md$/,
  /^docs\/phase2c66-.*\.md$/,
  /^docs\/phase2d/,
  /^docs\/audit\//,
  /^scripts\/export-compliance-dossier-html\.mjs$/,
  /^scripts\/validate-audit-.*\.mjs$/,
  /^docs\/compliance-evidence-v1\.md$/,
  /^package\.json$/,
];

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (!allowedPathPatterns.some((pattern) => pattern.test(changedPath))) {
    fail(`Unexpected path touched in 2C.31-2C.36: ${changedPath}.`);
  }
  if (/^supabase\/migrations\//.test(changedPath)) {
    fail(`New migration touched: ${changedPath}.`);
  }
  if (/vida/i.test(changedPath)) fail(`ViDA path touched: ${changedPath}.`);
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (/stripe|openai|importers/i.test(changedPath)) {
    fail(`Forbidden product path touched: ${changedPath}.`);
  }
}

const route = read("src/app/api/document-sync/route.ts");
const handler = read("src/lib/document-sync-integrity/route-handler.ts");
const routeAndHandler = `${route}\n${handler}`;
if (/createClient\s*\(|@supabase|createDocumentSyncServerService/.test(route)) {
  fail("Route shell must not create Supabase clients or sync service.");
}
if (!routeAndHandler.includes("buildDocumentSyncRouteDisabledResponse")) {
  fail("Route shell must return disabled responses.");
}
if (!routeAndHandler.includes("route_shell_enabled_but_operations_disabled")) {
  fail("Route shell must keep local shell operations disabled.");
}

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (changedPath.startsWith("docs/audit/")) continue;
  if (changedPath === "package.json") continue;
  if (changedPath === "scripts/export-compliance-dossier-html.mjs") continue;
  if (/^scripts\/validate-audit-.*\.mjs$/.test(changedPath)) continue;
  if (changedPath.includes("validate-phase2")) continue;
  if (
    /^src\/lib\/local-data-safety\//.test(changedPath) ||
    /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78|89|90|101|102)-/.test(changedPath) ||
    /^docs\/phase2d/.test(changedPath)
  ) {
    continue;
  }
  if (
    /^src\/lib\/document-sync-integrity\/private-staging-/.test(changedPath) ||
    /^src\/lib\/document-sync-integrity\/route-(?:local-execution-contract|fake-adapter|rate-limit|idempotency|telemetry)(?:\.test)?\.ts$/.test(
      changedPath,
    ) ||
    /^scripts\/phase2c4[056]-/.test(changedPath) ||
    /^scripts\/phase2c5[1234]-/.test(changedPath) ||
    /^scripts\/phase2c63-/.test(changedPath) ||
    /^docs\/phase2c(?:37|38|39|40|41|42|43|44|45|46|48)-/.test(changedPath) ||
    /^docs\/phase2c(?:49|50|51|52|53|54|56)-/.test(changedPath) ||
    /^docs\/phase2c(?:57|58|59|60|61|62|63|64|66)-/.test(changedPath)
  ) {
    continue;
  }
  if (!fs.existsSync(absolute(changedPath))) continue;
  const added = addedLines(changedPath).join("\n");
  for (const [label, regex] of [
    ["remote URL", /https?:\/\/(?!localhost|127\.0\.0\.1|\[::1\])/i],
    ["sensitive role literal", new RegExp(["service", "role"].join("_"), "i")],
    ["sensitive credential word", new RegExp("sec" + "ret", "i")],
    ["client factory", /createClient\s*\(/],
    ["Supabase import", /@supabase/i],
    ["route payload echo", /echoPayload|rawBodyEcho|payloadEcho/i],
    ["route operation enabled", /routeOperationsEnabled|syncOperationEnabled/i],
  ]) {
    if (regex.test(added)) fail(`Forbidden added content ${label} in ${changedPath}.`);
  }
}

const compliance = read("docs/compliance-evidence-v1.md");
for (const required of [
  "route shell deshabilitada 2C.31-2C.36",
  "Fase 2C.31-2C.36",
  "sin endpoint publico operativo",
  "PHASE2C_DISABLED_SYNC_ROUTE_SHELL: DISABLED BY DEFAULT / NO OPERATIONS ENABLED",
  "docs/phase2c36-disabled-sync-route-shell-checkpoint-v1.md",
]) {
  if (!compliance.includes(required)) {
    fail(`Compliance dossier missing required 2C.31-2C.36 text: ${required}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2C.31-2C.36 disabled sync route shell validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.31-2C.36 disabled sync route shell validation passed.");
