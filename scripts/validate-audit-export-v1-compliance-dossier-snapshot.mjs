import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
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

const packageJson = JSON.parse(read("package.json") || "{}");
const requiredScripts = [
  "export:compliance-dossier:html",
  "validate:audit-compliance-dossier-snapshot-metadata",
  "validate:audit-compliance-dossier-html-export",
  "validate:audit-compliance-dossier-pdf-guide",
  "validate:audit-export-v1-compliance-dossier-snapshot",
];

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of requiredScripts.slice(1, 4)) run(scriptName);

const requiredFiles = [
  "docs/audit/compliance-dossier-snapshot-metadata-v1.json",
  "docs/audit/compliance-dossier-snapshot-policy-v1.md",
  "docs/audit/compliance-dossier-html-export-v1.md",
  "docs/audit/compliance-dossier-pdf-snapshot-guide-v1.md",
  "docs/audit/compliance-dossier-export-checkpoint-v1.md",
  "scripts/export-compliance-dossier-html.mjs",
  "scripts/validate-audit-compliance-dossier-snapshot-metadata.mjs",
  "scripts/validate-audit-compliance-dossier-html-export.mjs",
  "scripts/validate-audit-compliance-dossier-pdf-guide.mjs",
  "scripts/validate-audit-export-v1-compliance-dossier-snapshot.mjs",
];

for (const filePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, filePath))) fail(`Missing required file ${filePath}.`);
}

const changedPaths = new Set([
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);

const allowedPatterns = [
  /^docs\/compliance-evidence-v1\.md$/,
  /^docs\/audit\//,
  /^scripts\/export-compliance-dossier-html\.mjs$/,
  /^scripts\/export-compliance-dossier-pdf\.mjs$/,
  /^scripts\/validate-audit-.*\.mjs$/,
  /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
  /^scripts\/validate-phase2c1-6-server-sync-integrity-foundation\.mjs$/,
  /^scripts\/validate-phase2c7-12-local-staging-sync-adapter\.mjs$/,
  /^scripts\/validate-phase2c13-18-supabase-local-sync-adapter\.mjs$/,
  /^scripts\/validate-phase2c19-24-supabase-local-schema-acceptance\.mjs$/,
  /^scripts\/validate-phase2c25-30-server-document-sync-service\.mjs$/,
  /^scripts\/validate-phase2c31-36-disabled-sync-route-shell\.mjs$/,
  /^package\.json$/,
];

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (!allowedPatterns.some((pattern) => pattern.test(changedPath))) {
    fail(`Unexpected AUDIT_EXPORT_V1 path touched: ${changedPath}.`);
  }
  if (/^src\/|^supabase\/|^app\/|^pages\//.test(changedPath)) {
    fail(`Product/Supabase path touched: ${changedPath}.`);
  }
  if (/^supabase\/migrations\//.test(changedPath)) fail(`Migration touched: ${changedPath}.`);
  if (/vida/i.test(changedPath)) fail(`ViDA path touched: ${changedPath}.`);
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (changedPath.toLowerCase().endsWith(".pdf")) fail(`PDF binary is not authorized: ${changedPath}.`);
}

const html = read("docs/audit/exports/compliance-evidence-v1-snapshot.html");
if (!html.includes("Evidencia técnica interna / No certificación / No cumplimiento productivo")) {
  fail("Generated HTML missing limitation banner.");
}
if (/<script\b/i.test(html)) fail("Generated HTML contains script tag.");

const compliance = read("docs/compliance-evidence-v1.md");
for (const required of [
  "Gestion de snapshots de auditoria",
  "AUDIT_EXPORT_V1_COMPLIANCE_DOSSIER_SNAPSHOT",
  "HTML/PDF son snapshots derivados",
  "no declaran cumplimiento productivo",
  "docs/audit/compliance-dossier-export-checkpoint-v1.md",
]) {
  if (!compliance.includes(required)) fail(`Compliance dossier missing ${required}.`);
}

const checkpoint = read("docs/audit/compliance-dossier-export-checkpoint-v1.md");
for (const marker of [
  "AUDIT6_COMPLIANCE_DOSSIER_EXPORT_CHECKPOINT_V1",
  "COMPLIANCE_DOSSIER_EXPORT:",
  "HTML SNAPSHOT READY / PDF GUIDE READY / MD CANONICAL",
  "NO PRODUCTIVE COMPLIANCE CLAIM",
  "NO CERTIFICATION",
  "NO AEAT VALIDATION",
  "NO LEGAL/FISCAL OPINION",
  "MD REMAINS CANONICAL",
]) {
  if (!checkpoint.includes(marker)) fail(`Checkpoint missing ${marker}.`);
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Audit export v1 validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Audit export v1 compliance dossier snapshot validation passed.");
