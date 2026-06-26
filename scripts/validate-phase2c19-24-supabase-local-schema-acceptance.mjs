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
  "validate:phase2c19-supabase-local-schema-gap-audit",
  "validate:phase2c20-supabase-local-sync-schema-migration",
  "validate:phase2c21-supabase-local-sync-permission-guard",
  "validate:phase2c22-supabase-local-sync-acceptance",
  "validate:phase2c23-supabase-local-sync-concurrency-idempotency",
  "validate:phase2c19-24-supabase-local-schema-acceptance",
];

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of requiredScripts.slice(0, 5)) run(scriptName);

for (const filePath of [
  "supabase/migrations/20260626212000_phase2c20_document_sync_local_schema.sql",
  "supabase/rollbacks/20260626212000_phase2c20_document_sync_local_schema.down.sql",
  "scripts/phase2c21-supabase-local-sync-permission-guard.test.ts",
  "scripts/phase2c22-supabase-local-sync-acceptance.test.ts",
  "scripts/phase2c23-supabase-local-sync-concurrency.test.ts",
  "docs/phase2c19-supabase-local-schema-gap-audit-v1.md",
  "docs/phase2c20-supabase-local-sync-schema-migration-v1.md",
  "docs/phase2c21-supabase-local-sync-permission-guard-v1.md",
  "docs/phase2c22-supabase-local-sync-acceptance-v1.md",
  "docs/phase2c23-supabase-local-sync-concurrency-idempotency-v1.md",
  "docs/phase2c24-supabase-local-schema-acceptance-checkpoint-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing required file ${filePath}.`);
}

const checkpoint = read("docs/phase2c24-supabase-local-schema-acceptance-checkpoint-v1.md");
for (const marker of [
  "PHASE2C24_SUPABASE_LOCAL_SCHEMA_ACCEPTANCE_CHECKPOINT_V1",
  "PHASE2C_SUPABASE_LOCAL_SYNC_SCHEMA:",
  "LOCAL ACCEPTANCE PASSED / NO PRODUCTION",
  "NO PRODUCTION",
  "NO SUPABASE PRODUCTION",
  "NO SUPABASE REMOTE",
  "NO PUBLIC ENDPOINT",
  "NO UI",
  "NO REAL DOCUMENT MUTATION",
  "NO REAL INVOICES",
  "NO FISCAL TABLES",
]) {
  if (!checkpoint.includes(marker)) fail(`Checkpoint missing marker ${marker}.`);
}

const migration = read("supabase/migrations/20260626212000_phase2c20_document_sync_local_schema.sql");
const rollback = read("supabase/rollbacks/20260626212000_phase2c20_document_sync_local_schema.down.sql");
const sql = `${migration}\n${rollback}`;
for (const forbidden of [
  /\bfiscal_records\b/i,
  /\bfiscal_chain_state\b/i,
  /\bfiscal_transport_attempts\b/i,
  /\bstripe\b/i,
  /\bopenai\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bgrant\s+.+\bto\s+(?:anon|authenticated)\b/i,
  /\bservice_role\b/i,
  /\bcreate\s+policy\b/i,
]) {
  if (forbidden.test(sql)) fail(`Forbidden SQL pattern in 2C.20: ${forbidden}.`);
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
  /^supabase\/migrations\/\d{14}_phase2c20_document_sync_local_schema\.sql$/,
  /^supabase\/rollbacks\/\d{14}_phase2c20_document_sync_local_schema\.down\.sql$/,
  /^scripts\/validate-phase2b6(?:b|c|d(?:-h)?|e|f|g)-.*\.mjs$/,
  /^scripts\/validate-phase2b7(?:a(?:-e)?|b|f(?:-k)?|g|h|l(?:-p)?|n|q-u|v-z)-.*\.mjs$/,
  /^scripts\/phase2c21-supabase-local-sync-permission-guard\.test\.ts$/,
  /^scripts\/phase2c22-supabase-local-sync-acceptance\.test\.ts$/,
  /^scripts\/phase2c23-supabase-local-sync-concurrency\.test\.ts$/,
  /^scripts\/phase2c29-server-sync-service-local-acceptance\.test\.ts$/,
  /^scripts\/phase2c35-disabled-sync-route-shell-acceptance\.test\.ts$/,
  /^src\/app\/api\/document-sync\/route\.ts$/,
  /^scripts\/validate-phase2c1-sync-surface-audit\.mjs$/,
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
  /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
  /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
  /^scripts\/validate-phase2c7-12-local-staging-sync-adapter\.mjs$/,
  /^scripts\/validate-phase2c13-18-supabase-local-sync-adapter\.mjs$/,
  /^docs\/phase2c19-supabase-local-schema-gap-audit-v1\.md$/,
  /^docs\/phase2c20-supabase-local-sync-schema-migration-v1\.md$/,
  /^docs\/phase2c21-supabase-local-sync-permission-guard-v1\.md$/,
  /^docs\/phase2c22-supabase-local-sync-acceptance-v1\.md$/,
  /^docs\/phase2c23-supabase-local-sync-concurrency-idempotency-v1\.md$/,
  /^docs\/phase2c24-supabase-local-schema-acceptance-checkpoint-v1\.md$/,
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
  /^docs\/compliance-evidence-v1\.md$/,
  /^package\.json$/,
];

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (!allowedPathPatterns.some((pattern) => pattern.test(changedPath))) {
    fail(`Unexpected path touched in 2C.19-2C.24: ${changedPath}.`);
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
  if (changedPath.includes("validate-phase2")) continue;
  if (!fs.existsSync(absolute(changedPath))) continue;
  const added = addedLines(changedPath).join("\n");
  for (const [label, regex] of [
    ["production Supabase URL", /https:\/\/[^ \n]*supabase/i],
    ["remote URL", /https?:\/\/(?!localhost|127\.0\.0\.1|\[::1\])/i],
    ["service role literal", /\bservice_role\b/i],
    ["secret literal", /\bsecret\b/i],
    ["full snapshot body", /(?:documentSnapshot|pdfSnapshot)\s*[:=]\s*[{[]/],
  ]) {
    if (regex.test(added)) fail(`Forbidden added content ${label} in ${changedPath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2C.19-2C.24 Supabase local schema acceptance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.19-2C.24 Supabase local schema acceptance validation passed.");
