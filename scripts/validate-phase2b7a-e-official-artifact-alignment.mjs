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

const packageJson = JSON.parse(read("package.json") || "{}");
for (const scriptName of [
  "validate:phase2b7a-synthetic-pipeline-technical-review",
  "validate:phase2b7b-official-artifact-field-mapping",
  "validate:phase2b7c-official-aligned-synthetic-xml-candidate",
  "validate:phase2b7d-official-artifact-local-validation",
  "validate:phase2b7a-e-official-artifact-alignment",
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

const checkpoint = read("docs/phase2b7e-pre-qr-signature-transport-checkpoint-v1.md");
for (const marker of [
  "PHASE2B7_OFFICIAL_ARTIFACT_ALIGNMENT: BLOCKED",
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
  "NO PRODUCTION",
  "NO REAL DATA",
  "NO AEAT CONNECTION",
  "NO TRANSPORT",
  "NO QR",
  "NO SIGNATURE",
  "NO CERTIFICATES",
  "NO PRODUCTIVE VERIFACTU",
]) {
  if (!checkpoint.includes(marker)) fail(`Missing checkpoint marker ${marker}.`);
}

for (const changedPath of [
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
]) {
  if (/^supabase\//.test(changedPath)) fail(`Supabase path touched: ${changedPath}.`);
  if (/vida/i.test(changedPath) && !changedPath.startsWith("docs/vida-screenshots-local/")) {
    fail(`ViDA path touched: ${changedPath}.`);
  }
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (/\.xml$/i.test(changedPath)) fail(`XML file touched: ${changedPath}.`);
  if (/^test\/fixtures\/verifactu-official-artifacts\/.*\.(?:pdf|xlsx)$/i.test(changedPath)) {
    fail(`Forbidden official binary fixture ${changedPath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

for (const scriptName of [
  "validate:phase2b7a-synthetic-pipeline-technical-review",
  "validate:phase2b7b-official-artifact-field-mapping",
  "validate:phase2b7c-official-aligned-synthetic-xml-candidate",
  "validate:phase2b7d-official-artifact-local-validation",
]) {
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

if (errors.length > 0) {
  console.error("Phase 2B.7A-E official artifact alignment validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7A-E official artifact alignment validation passed with blocked 2B.7C/D gate.");
