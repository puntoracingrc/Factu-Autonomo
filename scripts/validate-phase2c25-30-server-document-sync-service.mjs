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

function addedLines(relativePath) {
  try {
    return execFileSync("git", ["diff", "--unified=0", "origin/main...HEAD", "--", relativePath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1));
  } catch {
    return [];
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
const requiredScripts = [
  "validate:phase2c25-server-sync-command-contract",
  "validate:phase2c26-server-document-sync-service",
  "validate:phase2c27-server-sync-batch-processing",
  "validate:phase2c28-server-sync-safe-response-audit",
  "validate:phase2c29-server-sync-service-local-acceptance",
  "validate:phase2c25-30-server-document-sync-service",
  "test:phase2c29-server-sync-service-local-acceptance",
];

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of requiredScripts.slice(0, 5)) run(scriptName);

for (const filePath of [
  "src/lib/document-sync-integrity/server-sync-command.ts",
  "src/lib/document-sync-integrity/server-sync-service.ts",
  "src/lib/document-sync-integrity/server-sync-batch.ts",
  "src/lib/document-sync-integrity/server-sync-response.ts",
  "src/lib/document-sync-integrity/server-sync-audit.ts",
  "scripts/phase2c29-server-sync-service-local-acceptance.test.ts",
  "docs/phase2c25-server-sync-command-contract-v1.md",
  "docs/phase2c26-server-document-sync-service-v1.md",
  "docs/phase2c27-server-sync-batch-processing-v1.md",
  "docs/phase2c28-server-sync-safe-response-audit-v1.md",
  "docs/phase2c29-server-sync-service-local-acceptance-v1.md",
  "docs/phase2c30-server-sync-service-checkpoint-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing required file ${filePath}.`);
}

const checkpoint = read("docs/phase2c30-server-sync-service-checkpoint-v1.md");
for (const marker of [
  "PHASE2C30_SERVER_SYNC_SERVICE_CHECKPOINT_V1",
  "PHASE2C_SERVER_SYNC_SERVICE:",
  "READY FOR DISABLED ROUTE SHELL DESIGN",
  "NO PRODUCTION",
  "NO SUPABASE PRODUCTION",
  "NO SUPABASE REMOTE",
  "NO PUBLIC ENDPOINT",
  "NO UI",
  "NO REAL DOCUMENT MUTATION",
  "NO REAL INVOICES",
  "NO ROUTE ENABLED",
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
  /^scripts\/phase2c29-server-sync-service-local-acceptance\.test\.ts$/,
  /^scripts\/phase2c35-disabled-sync-route-shell-acceptance\.test\.ts$/,
  /^scripts\/phase2c40-sync-route-abuse-payload-hardening\.test\.ts$/,
  /^scripts\/phase2c45-private-local-sync-route-fake-acceptance\.test\.ts$/,
  /^scripts\/phase2c46-sync-route-operational-hardening-acceptance\.test\.ts$/,
  /^scripts\/phase2c5[1234]-.*\.test\.ts$/,
  /^scripts\/phase2c63-.*\.test\.ts$/,
  /^scripts\/validate-phase2c25-.*\.mjs$/,
  /^scripts\/validate-phase2c26-.*\.mjs$/,
  /^scripts\/validate-phase2c27-.*\.mjs$/,
  /^scripts\/validate-phase2c28-.*\.mjs$/,
  /^scripts\/validate-phase2c29-.*\.mjs$/,
  /^scripts\/validate-phase2c25-30-.*\.mjs$/,
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
  /^scripts\/validate-phase2c1-sync-surface-audit\.mjs$/,
  /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
  /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
  /^scripts\/validate-phase2c7-12-local-staging-sync-adapter\.mjs$/,
  /^scripts\/validate-phase2c13-18-supabase-local-sync-adapter\.mjs$/,
  /^scripts\/validate-phase2c19-24-supabase-local-schema-acceptance\.mjs$/,
  /^docs\/phase2c25-server-sync-command-contract-v1\.md$/,
  /^docs\/phase2c26-server-document-sync-service-v1\.md$/,
  /^docs\/phase2c27-server-sync-batch-processing-v1\.md$/,
  /^docs\/phase2c28-server-sync-safe-response-audit-v1\.md$/,
  /^docs\/phase2c29-server-sync-service-local-acceptance-v1\.md$/,
  /^docs\/phase2c30-server-sync-service-checkpoint-v1\.md$/,
  /^docs\/phase2c31-.*\.md$/,
  /^docs\/phase2c32-.*\.md$/,
  /^docs\/phase2c33-.*\.md$/,
  /^docs\/phase2c34-.*\.md$/,
  /^docs\/phase2c35-.*\.md$/,
  /^docs\/phase2c36-.*\.md$/,
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
  /^docs\/audit\//,
  /^scripts\/export-compliance-dossier-html\.mjs$/,
  /^scripts\/validate-audit-.*\.mjs$/,
  /^docs\/compliance-evidence-v1\.md$/,
  /^package\.json$/,
];

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (!allowedPathPatterns.some((pattern) => pattern.test(changedPath))) {
    fail(`Unexpected path touched in 2C.25-2C.30: ${changedPath}.`);
  }
  if (/^supabase\/migrations\//.test(changedPath)) {
    fail(`New migration touched: ${changedPath}.`);
  }
  if (/vida/i.test(changedPath)) fail(`ViDA path touched: ${changedPath}.`);
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (
    changedPath !== "src/app/api/document-sync/route.ts" &&
    /^(?:src\/app|app|components|public)\//.test(changedPath)
  ) {
    fail(`UI/public path touched: ${changedPath}.`);
  }
  if (/stripe|openai|importers|aeat|qr|firma|certificado|transport/i.test(changedPath)) {
    fail(`Forbidden external/product path touched: ${changedPath}.`);
  }
}

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (changedPath.startsWith("docs/audit/")) continue;
  if (changedPath === "package.json") continue;
  if (changedPath === "scripts/export-compliance-dossier-html.mjs") continue;
  if (/^scripts\/validate-audit-.*\.mjs$/.test(changedPath)) continue;
  if (changedPath.includes("validate-phase2")) continue;
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
    ["env read in service", /server-sync-(?:service|command|batch|response|audit)\.ts[\s\S]*process\.env/],
    ["full body", /(?:documentSnapshot|pdfSnapshot|rawPayload|pdfBody)\s*[:=]\s*[{[]/],
  ]) {
    if (regex.test(added)) fail(`Forbidden added content ${label} in ${changedPath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2C.25-2C.30 server document sync service validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.25-2C.30 server document sync service validation passed.");
