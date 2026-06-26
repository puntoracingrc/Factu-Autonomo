import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const outputPath = "docs/audit/exports/compliance-evidence-v1-snapshot.html";
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

const packageJson = JSON.parse(read("package.json") || "{}");

if (!fs.existsSync(path.join(root, "scripts/export-compliance-dossier-html.mjs"))) {
  fail("Missing HTML export script.");
}
if (packageJson.scripts?.["export:compliance-dossier:html"] !== "node scripts/export-compliance-dossier-html.mjs") {
  fail("Missing or unexpected HTML export npm script.");
}
if (!read("docs/audit/compliance-dossier-html-export-v1.md").includes(
  "AUDIT2_COMPLIANCE_DOSSIER_HTML_EXPORT_V1",
)) {
  fail("Missing HTML export document marker.");
}

try {
  execFileSync("npm", ["run", "export:compliance-dossier:html"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
} catch (error) {
  fail(`HTML export failed: ${error.message}`);
}

const html = read(outputPath);
if (!html) fail("HTML output was not generated.");
if (!html.includes("Evidencia técnica interna / No certificación / No cumplimiento productivo")) {
  fail("HTML output missing limitation banner.");
}
if (!html.includes("Factura Autónomo - compliance dossier snapshot")) {
  fail("HTML output missing title.");
}
if (/<script\b/i.test(html)) fail("HTML output must not contain scripts.");
if (/https?:\/\/(?!www\.boe\.es|sede\.agenciatributaria\.gob\.es)/i.test(html)) {
  fail("HTML output contains an unexpected remote URL.");
}
for (const forbidden of [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "OPENAI_API_KEY",
  "sk_live_",
  "sk_test_",
]) {
  if (html.includes(forbidden)) fail(`HTML output contains forbidden token marker ${forbidden}.`);
}

if (errors.length > 0) {
  console.error("Audit HTML export validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Audit HTML export validation passed.");
