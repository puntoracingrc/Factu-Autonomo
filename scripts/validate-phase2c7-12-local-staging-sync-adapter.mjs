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

function walk(relativeDir) {
  const dir = absolute(relativeDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relativeDir, entry.name);
    return entry.isDirectory() ? walk(child) : child;
  });
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
  "validate:phase2c7-phase2-validator-scope-maintenance",
  "validate:phase2c8-in-memory-document-sync-store",
  "validate:phase2c9-local-staging-sync-adapter",
  "validate:phase2c10-local-staging-sync-reconciliation-acceptance",
  "validate:phase2c11-local-staging-sync-safe-report",
  "validate:phase2c7-12-local-staging-sync-adapter",
];

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of requiredScripts.slice(0, 5)) run(scriptName);

for (const filePath of [
  "docs/phase2c7-phase2-validator-scope-maintenance-v1.md",
  "docs/phase2c10-local-staging-sync-reconciliation-acceptance-v1.md",
  "docs/phase2c11-local-staging-sync-safe-report-v1.md",
  "docs/phase2c12-local-staging-sync-adapter-checkpoint-v1.md",
  "scripts/phase2c10-local-staging-sync-reconciliation-acceptance.test.ts",
  "src/lib/document-sync-integrity/sync-store.ts",
  "src/lib/document-sync-integrity/sync-adapter.ts",
  "src/lib/document-sync-integrity/sync-report.ts",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing required file ${filePath}.`);
}

const checkpoint = read("docs/phase2c12-local-staging-sync-adapter-checkpoint-v1.md");
for (const marker of [
  "PHASE2C12_LOCAL_STAGING_SYNC_ADAPTER_CHECKPOINT_V1",
  "PHASE2C_LOCAL_STAGING_SYNC_ADAPTER:",
  "READY FOR SUPABASE LOCAL ADAPTER DESIGN",
  "NO PRODUCTION",
  "NO SUPABASE PRODUCTION",
  "NO SUPABASE REMOTE",
  "NO MIGRATIONS",
  "NO PUBLIC ENDPOINT",
  "NO UI",
  "NO REAL DOCUMENT MUTATION",
  "NO REAL INVOICES",
]) {
  if (!checkpoint.includes(marker)) fail(`Checkpoint missing marker ${marker}.`);
}

const compliance = read("docs/compliance-evidence-v1.md");
for (const marker of [
  "adaptador in-memory local/staging 2C.7-2C.12",
  "sin sync real",
  "sin produccion",
  "sin Supabase remoto",
  "sin migraciones",
  "sin endpoints",
  "sin UI",
]) {
  if (!compliance.includes(marker)) fail(`Compliance dossier missing marker ${marker}.`);
}

const changedPaths = new Set([
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);

const allowedPathPatterns = [
  /^src\/lib\/document-sync-integrity\//,
  /^scripts\/phase2c10-local-staging-sync-reconciliation-acceptance\.test\.ts$/,
  /^scripts\/validate-phase2c7-.*\.mjs$/,
  /^scripts\/validate-phase2c8-.*\.mjs$/,
  /^scripts\/validate-phase2c9-.*\.mjs$/,
  /^scripts\/validate-phase2c10-.*\.mjs$/,
  /^scripts\/validate-phase2c11-.*\.mjs$/,
  /^scripts\/validate-phase2c7-12-.*\.mjs$/,
  /^scripts\/validate-phase2b7q-u-official-artifact-readiness-tooling\.mjs$/,
  /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
  /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
  /^docs\/phase2c7-phase2-validator-scope-maintenance-v1\.md$/,
  /^docs\/phase2c10-local-staging-sync-reconciliation-acceptance-v1\.md$/,
  /^docs\/phase2c11-local-staging-sync-safe-report-v1\.md$/,
  /^docs\/phase2c12-local-staging-sync-adapter-checkpoint-v1\.md$/,
  /^docs\/compliance-evidence-v1\.md$/,
  /^package\.json$/,
];

const unrelatedLaterPhasePatterns = [
  /^scripts\/validate-phase2b6(?:b|c|d(?:-h)?|e|f|g)-.*\.mjs$/,
  /^scripts\/validate-phase2b7(?:a(?:-e)?|b|f(?:-k)?|g|h|l(?:-p)?|n|q-u|v-z)-.*\.mjs$/,
  /^scripts\/validate-phase2c1-sync-surface-audit\.mjs$/,
  /^scripts\/phase2c17-/,
  /^scripts\/phase2c2[123]-/,
  /^scripts\/phase2c29-/,
  /^scripts\/phase2c35-/,
  /^scripts\/phase2c4[056]-/,
  /^scripts\/phase2c5[1234]-/,
  /^scripts\/phase2c63-/,
  /^scripts\/validate-phase2c(?:13|14|15|16|17|13-18)-/,
  /^scripts\/validate-phase2c(?:19|20|21|22|23|19-24)-/,
  /^scripts\/validate-phase2c(?:25|26|27|28|29|25-30)-/,
  /^scripts\/validate-phase2c(?:31|32|33|34|35|31-36)-/,
  /^scripts\/validate-phase2c(?:37|38|39|40|41|42|43|44|45|46|37-48)-/,
  /^scripts\/validate-phase2c(?:49|50|51|52|53|54|49-56)-/,
  /^scripts\/validate-phase2c(?:57|58|59|60|61|62|63|64|57-66)-/,
  /^scripts\/phase2d(?:9|19|29|30|39|40|41|42|52|53|54|66|77|78|89|90|101|102)-/,
  /^scripts\/validate-phase2d/,
  /^docs\/audit\//,
  /^scripts\/export-compliance-dossier-html\.mjs$/,
  /^scripts\/validate-audit-.*\.mjs$/,
  /^src\/app\/api\/document-sync\/route\.ts$/,
  /^src\/lib\/local-data-safety\//,
    /^src\/components\/local-data-safety\//,
  /^docs\/phase2c(?:13|14|15|16|17|18)-/,
  /^docs\/phase2c(?:19|20|21|22|23|24)-/,
  /^docs\/phase2c(?:25|26|27|28|29|30)-/,
  /^docs\/phase2c(?:31|32|33|34|35|36)-/,
  /^docs\/phase2c(?:37|38|39|40|41|42|43|44|45|46|48)-/,
  /^docs\/phase2c(?:49|50|51|52|53|54|56)-/,
  /^docs\/phase2c(?:57|58|59|60|61|62|63|64|66)-/,
  /^docs\/phase2d/,
  /^scripts\/phase2e10-storage-resilience-acceptance\.test\.ts$/,
  /^scripts\/validate-phase2e/,
  /^src\/lib\/local-storage-resilience\//,
  /^docs\/phase2e/,
  /^supabase\/migrations\/\d{14}_phase2c20_document_sync_local_schema\.sql$/,
  /^supabase\/rollbacks\/\d{14}_phase2c20_document_sync_local_schema\.down\.sql$/,
];

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (
    !allowedPathPatterns.some((pattern) => pattern.test(changedPath)) &&
    !unrelatedLaterPhasePatterns.some((pattern) => pattern.test(changedPath))
  ) {
    fail(`Unexpected path touched in 2C.7-2C.12: ${changedPath}.`);
  }
  if (
    !unrelatedLaterPhasePatterns.some((pattern) => pattern.test(changedPath)) &&
    /^supabase\//.test(changedPath)
  ) {
    fail(`Supabase path touched: ${changedPath}.`);
  }
  if (
    !unrelatedLaterPhasePatterns.some((pattern) => pattern.test(changedPath)) &&
    /migrations/i.test(changedPath)
  ) {
    fail(`Migration path touched: ${changedPath}.`);
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
  if (/(?:stripe|openai|importers|aeat|(?:^|[\/_-])qr(?:[\/_.-]|$)|(?:^|[\/_-])firma(?:[\/_.-]|$)|certificado|transport)/i.test(changedPath)) {
    fail(`Forbidden external/product path touched: ${changedPath}.`);
  }
}

for (const filePath of walk("src/lib/document-sync-integrity").filter(
  (entry) =>
    entry.endsWith(".ts") &&
    !entry.endsWith(".test.ts") &&
    entry !== "src/lib/document-sync-integrity/index.ts" &&
    !entry.includes("/supabase-") &&
    !entry.includes("/route-supabase"),
)) {
  const body = read(filePath);
  for (const [label, regex] of [
    ["Supabase import", /@supabase|createClient\(|from ["'][^"']*supabase/i],
    ["UI import", /from ["'](?:@\/)?(?:components|app|public)\//i],
    ["fetch", /\bfetch\s*\(/],
    ["axios", /\baxios\b/],
    ["node http", /node:http|node:https/],
    ["filesystem write", /\bwriteFile(?:Sync)?\b|\bappendFile(?:Sync)?\b|\bcreateWriteStream\b/],
    ["localStorage", /\blocalStorage\b/],
  ]) {
    if (regex.test(body)) fail(`Forbidden runtime pattern ${label} in ${filePath}.`);
  }
}

const joinedSensitive = ["service", "role"].join("_");
const fiscalAttempts = ["fiscal", "transport", "attempts"].join("_");
for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (unrelatedLaterPhasePatterns.some((pattern) => pattern.test(changedPath))) {
    continue;
  }
  if (changedPath.includes("validate-phase2")) continue;
  const added = addedLines(changedPath).join("\n");
  if (new RegExp(joinedSensitive, "i").test(added)) {
    fail(`Sensitive role literal found in ${changedPath}.`);
  }
  if (new RegExp(fiscalAttempts, "i").test(added)) {
    fail(`Forbidden transport table literal found in ${changedPath}.`);
  }
  if (/(?:documentSnapshot|pdfSnapshot)\s*[:=]\s*[{[]/.test(added)) {
    fail(`Full snapshot-like body found in ${changedPath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2C.7-2C.12 local/staging sync adapter validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.7-2C.12 local/staging sync adapter validation passed.");
