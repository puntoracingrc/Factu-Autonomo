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
  /^scripts\/validate-phase2c31-.*\.mjs$/,
  /^scripts\/validate-phase2c32-.*\.mjs$/,
  /^scripts\/validate-phase2c33-.*\.mjs$/,
  /^scripts\/validate-phase2c34-.*\.mjs$/,
  /^scripts\/validate-phase2c35-.*\.mjs$/,
  /^scripts\/validate-phase2c31-36-.*\.mjs$/,
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
if (/createClient\s*\(|@supabase|createDocumentSyncServerService/.test(route)) {
  fail("Route shell must not create Supabase clients or sync service.");
}
if (!route.includes("buildDocumentSyncRouteDisabledResponse")) {
  fail("Route shell must return disabled responses.");
}
if (!route.includes("route_shell_enabled_but_operations_disabled")) {
  fail("Route shell must keep local shell operations disabled.");
}

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (changedPath.startsWith("docs/audit/")) continue;
  if (changedPath === "scripts/export-compliance-dossier-html.mjs") continue;
  if (/^scripts\/validate-audit-.*\.mjs$/.test(changedPath)) continue;
  if (changedPath.includes("validate-phase2")) continue;
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
