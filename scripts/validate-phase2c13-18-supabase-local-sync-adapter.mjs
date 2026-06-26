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
  "validate:phase2c13-supabase-local-sync-contract",
  "validate:phase2c14-supabase-sync-safe-mapping",
  "validate:phase2c15-supabase-injected-sync-store",
  "validate:phase2c16-supabase-local-staging-sync-adapter",
  "validate:phase2c17-supabase-local-sync-acceptance-opt-in",
  "validate:phase2c13-18-supabase-local-sync-adapter",
];

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of requiredScripts.slice(0, 5)) run(scriptName);

for (const filePath of [
  "src/lib/document-sync-integrity/supabase-contract.ts",
  "src/lib/document-sync-integrity/supabase-mapping.ts",
  "src/lib/document-sync-integrity/supabase-store.ts",
  "src/lib/document-sync-integrity/supabase-adapter.ts",
  "scripts/phase2c17-supabase-local-sync-acceptance.test.ts",
  "docs/phase2c13-supabase-local-sync-contract-v1.md",
  "docs/phase2c14-supabase-sync-safe-mapping-v1.md",
  "docs/phase2c15-supabase-injected-sync-store-v1.md",
  "docs/phase2c16-supabase-local-staging-sync-adapter-v1.md",
  "docs/phase2c17-supabase-local-sync-acceptance-opt-in-v1.md",
  "docs/phase2c18-supabase-local-sync-adapter-checkpoint-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing required file ${filePath}.`);
}

const checkpoint = read("docs/phase2c18-supabase-local-sync-adapter-checkpoint-v1.md");
for (const marker of [
  "PHASE2C18_SUPABASE_LOCAL_SYNC_ADAPTER_CHECKPOINT_V1",
  "PHASE2C_SUPABASE_LOCAL_SYNC_ADAPTER:",
  "BLOCKED_SCHEMA_NOT_COMPATIBLE_WITH_2C_SYNC_ACCEPTANCE",
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
  "diseno de adaptador Supabase local/staging 2C.13-2C.18",
  "cliente inyectado",
  "fake tests",
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
  /^scripts\/phase2c17-supabase-local-sync-acceptance\.test\.ts$/,
  /^scripts\/validate-phase2c13-.*\.mjs$/,
  /^scripts\/validate-phase2c14-.*\.mjs$/,
  /^scripts\/validate-phase2c15-.*\.mjs$/,
  /^scripts\/validate-phase2c16-.*\.mjs$/,
  /^scripts\/validate-phase2c17-.*\.mjs$/,
  /^scripts\/validate-phase2c13-18-.*\.mjs$/,
  /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
  /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
  /^scripts\/validate-phase2c7-12-local-staging-sync-adapter\.mjs$/,
  /^docs\/phase2c13-supabase-local-sync-contract-v1\.md$/,
  /^docs\/phase2c14-supabase-sync-safe-mapping-v1\.md$/,
  /^docs\/phase2c15-supabase-injected-sync-store-v1\.md$/,
  /^docs\/phase2c16-supabase-local-staging-sync-adapter-v1\.md$/,
  /^docs\/phase2c17-supabase-local-sync-acceptance-opt-in-v1\.md$/,
  /^docs\/phase2c18-supabase-local-sync-adapter-checkpoint-v1\.md$/,
  /^docs\/compliance-evidence-v1\.md$/,
  /^package\.json$/,
];

const unrelatedLaterPhasePatterns = [
  /^scripts\/validate-phase2b6(?:b|c|d(?:-h)?|e|f|g)-.*\.mjs$/,
  /^scripts\/validate-phase2b7(?:a(?:-e)?|b|f(?:-k)?|g|h|l(?:-p)?|n|q-u|v-z)-.*\.mjs$/,
  /^scripts\/validate-phase2c1-sync-surface-audit\.mjs$/,
  /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
  /^scripts\/validate-phase2c7-12-local-staging-sync-adapter\.mjs$/,
  /^supabase\/migrations\/\d{14}_phase2c20_document_sync_local_schema\.sql$/,
  /^supabase\/rollbacks\/\d{14}_phase2c20_document_sync_local_schema\.down\.sql$/,
  /^scripts\/phase2c2[123]-.*\.test\.ts$/,
  /^scripts\/phase2c29-.*\.test\.ts$/,
  /^scripts\/phase2c35-.*\.test\.ts$/,
  /^src\/app\/api\/document-sync\/route\.ts$/,
  /^scripts\/validate-phase2c19-.*\.mjs$/,
  /^scripts\/validate-phase2c20-.*\.mjs$/,
  /^scripts\/validate-phase2c21-.*\.mjs$/,
  /^scripts\/validate-phase2c22-.*\.mjs$/,
  /^scripts\/validate-phase2c23-.*\.mjs$/,
  /^scripts\/validate-phase2c19-24-.*\.mjs$/,
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
  /^docs\/audit\//,
  /^scripts\/export-compliance-dossier-html\.mjs$/,
  /^scripts\/validate-audit-.*\.mjs$/,
  /^docs\/phase2c19-.*\.md$/,
  /^docs\/phase2c20-.*\.md$/,
  /^docs\/phase2c21-.*\.md$/,
  /^docs\/phase2c22-.*\.md$/,
  /^docs\/phase2c23-.*\.md$/,
  /^docs\/phase2c24-.*\.md$/,
  /^docs\/phase2c25-.*\.md$/,
  /^docs\/phase2c26-.*\.md$/,
  /^docs\/phase2c27-.*\.md$/,
  /^docs\/phase2c28-.*\.md$/,
  /^docs\/phase2c29-.*\.md$/,
  /^docs\/phase2c30-.*\.md$/,
  /^docs\/phase2c31-.*\.md$/,
  /^docs\/phase2c32-.*\.md$/,
  /^docs\/phase2c33-.*\.md$/,
  /^docs\/phase2c34-.*\.md$/,
  /^docs\/phase2c35-.*\.md$/,
  /^docs\/phase2c36-.*\.md$/,
];

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (unrelatedLaterPhasePatterns.some((pattern) => pattern.test(changedPath))) continue;
  if (!allowedPathPatterns.some((pattern) => pattern.test(changedPath))) {
    fail(`Unexpected path touched in 2C.13-2C.18: ${changedPath}.`);
  }
  if (/^supabase\//.test(changedPath)) fail(`Supabase path touched: ${changedPath}.`);
  if (/migrations/i.test(changedPath)) fail(`Migration path touched: ${changedPath}.`);
  if (/vida/i.test(changedPath)) fail(`ViDA path touched: ${changedPath}.`);
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (/^(?:src\/app|app|components|public)\//.test(changedPath)) {
    fail(`UI/public path touched: ${changedPath}.`);
  }
  if (/stripe|openai|importers|aeat|qr|firma|certificado|transport/i.test(changedPath)) {
    fail(`Forbidden external/product path touched: ${changedPath}.`);
  }
}

for (const filePath of walk("src/lib/document-sync-integrity").filter(
  (entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts"),
)) {
  const body = read(filePath);
  for (const [label, regex] of [
    ["real Supabase package", /@supabase/],
    ["client factory", /createClient\s*\(/],
    ["env read", /process\.env/],
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

const sensitiveRole = ["service", "role"].join("_");
const fiscalAttempts = ["fiscal", "transport", "attempts"].join("_");
for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (unrelatedLaterPhasePatterns.some((pattern) => pattern.test(changedPath))) continue;
  if (changedPath.includes("validate-phase2")) continue;
  if (!fs.existsSync(absolute(changedPath))) continue;
  const added = addedLines(changedPath).join("\n");
  if (new RegExp(sensitiveRole, "i").test(added)) {
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
  console.error("Phase 2C.13-2C.18 Supabase local sync adapter validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.13-2C.18 Supabase local sync adapter validation passed.");
