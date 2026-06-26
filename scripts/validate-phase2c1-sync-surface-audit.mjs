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

const docPath = "docs/phase2c1-sync-surface-audit-v1.md";
const doc = read(docPath);
const normalizedDoc = doc.toLowerCase();

for (const marker of [
  "phase2c1_sync_surface_audit_v1",
  "fuentes actuales de persistencia local",
  "puntos de carga, importacion y exportacion",
  "modulos de storage/localstorage",
  "relacion con `server_documents`",
  "riesgos de sync nube",
  "riesgos legacy",
  "que no se toca todavia",
  "recomendaciones para 2c.2-2c.6",
]) {
  if (!normalizedDoc.includes(marker)) fail(`Audit doc missing marker: ${marker}`);
}

const changedPaths = new Set([
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  const isPhase2C20LocalSyncSchemaPath =
    /^supabase\/migrations\/\d{14}_phase2c20_document_sync_local_schema\.sql$/.test(changedPath) ||
    /^supabase\/rollbacks\/\d{14}_phase2c20_document_sync_local_schema\.down\.sql$/.test(changedPath);
  if (!isPhase2C20LocalSyncSchemaPath && /^supabase\//.test(changedPath)) {
    fail(`Supabase path touched: ${changedPath}`);
  }
  if (!isPhase2C20LocalSyncSchemaPath && /migrations/i.test(changedPath)) {
    fail(`Migration path touched: ${changedPath}`);
  }
  if (/vida/i.test(changedPath)) fail(`ViDA path touched: ${changedPath}`);
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}`);
  }
  if (
    changedPath !== "src/app/api/document-sync/route.ts" &&
    /^(?:src\/app|app|components|public)\//.test(changedPath)
  ) {
    fail(`UI/public path touched: ${changedPath}`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c1-sync-surface-audit"]) {
  fail("Missing npm script validate:phase2c1-sync-surface-audit.");
}

if (errors.length > 0) {
  console.error("Phase 2C.1 sync surface audit validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.1 sync surface audit validation passed.");
