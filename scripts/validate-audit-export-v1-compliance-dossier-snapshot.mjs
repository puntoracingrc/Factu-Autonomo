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
  /^scripts\/validate-phase2c32-disabled-sync-route-shell-http\.mjs$/,
  /^scripts\/validate-phase2c31-36-disabled-sync-route-shell\.mjs$/,
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
  /^scripts\/phase2d9-/,
  /^scripts\/validate-phase2d/,
  /^scripts\/phase2c40-sync-route-abuse-payload-hardening\.test\.ts$/,
  /^scripts\/phase2c45-private-local-sync-route-fake-acceptance\.test\.ts$/,
  /^scripts\/phase2c46-sync-route-operational-hardening-acceptance\.test\.ts$/,
  /^scripts\/phase2c5[1234]-.*\.test\.ts$/,
  /^scripts\/phase2c63-.*\.test\.ts$/,
  /^src\/app\/api\/document-sync\/route\.ts$/,
  /^src\/lib\/document-sync-integrity\//,
  /^src\/lib\/local-data-safety\//,
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
  /^package\.json$/,
];

function isPhase2C37To48Path(changedPath) {
  return [
    /^src\/app\/api\/document-sync\/route\.ts$/,
    /^src\/lib\/document-sync-integrity\//,
    /^scripts\/phase2c4[056]-/,
    /^scripts\/phase2c5[1234]-/,
    /^scripts\/phase2c63-/,
    /^scripts\/validate-phase2c(?:37|38|39|40|41|42|43|44|45|46|37-48)-/,
    /^scripts\/validate-phase2c(?:49|50|51|52|53|54|49-56)-/,
    /^scripts\/validate-phase2c(?:57|58|59|60|61|62|63|64|57-66)-/,
    /^scripts\/phase2d9-/,
    /^scripts\/validate-phase2d/,
    /^src\/lib\/local-data-safety\//,
    /^docs\/phase2c(?:37|38|39|40|41|42|43|44|45|46|48)-/,
    /^docs\/phase2c(?:49|50|51|52|53|54|56)-/,
    /^docs\/phase2c(?:57|58|59|60|61|62|63|64|66)-/,
    /^docs\/phase2d/,
  ].some((pattern) => pattern.test(changedPath));
}

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (!allowedPatterns.some((pattern) => pattern.test(changedPath))) {
    fail(`Unexpected AUDIT_EXPORT_V1 path touched: ${changedPath}.`);
  }
  if (
    !isPhase2C37To48Path(changedPath) &&
    /^(?:src\/|supabase\/|app\/|pages\/)/.test(changedPath)
  ) {
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
