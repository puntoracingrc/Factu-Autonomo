import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const descriptorsRelative = "src/lib/verifactu-synthetic-fixtures/fixtures.ts";
const descriptorsTestRelative =
  "src/lib/verifactu-synthetic-fixtures/fixtures.test.ts";
const scriptRelative =
  "scripts/validate-phase2b6c-synthetic-fixture-negative-descriptors.mjs";
const docRelative =
  "docs/phase2b6c-synthetic-fixture-negative-descriptors-v1.md";
const packageRelative = "package.json";
const errors = [];

function joinTerms(...parts) {
  return parts.join("");
}

function fail(message) {
  errors.push(message);
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  const filePath = absolute(relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function expectFile(relativePath) {
  if (!fs.existsSync(absolute(relativePath))) {
    fail(`Missing ${relativePath}.`);
  }
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

function changedFiles() {
  const files = new Set([
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["diff", "--name-only", "--cached"]),
    ...gitLines(["diff", "--name-only", "main...HEAD"]),
    ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
  ]);

  for (const line of gitLines(["status", "--short", "--untracked-files=all"])) {
    const file = line.slice(3).replace(/.* -> /, "").trim();
    if (file && !file.startsWith("docs/vida-screenshots-local/")) {
      files.add(file);
    }
  }

  return [...files].sort();
}

function forbidPattern(label, relativePath, source, pattern) {
  if (pattern.test(source)) fail(`Forbidden ${label} in ${relativePath}.`);
}

function forbidTerm(label, relativePath, source, term) {
  if (source.toLowerCase().includes(term.toLowerCase())) {
    fail(`Forbidden ${label} in ${relativePath}.`);
  }
}

expectFile(descriptorsRelative);
expectFile(descriptorsTestRelative);
expectFile(scriptRelative);
expectFile(docRelative);

const packageJson = JSON.parse(read(packageRelative) || "{}");
if (
  packageJson.scripts?.["validate:phase2b6c-synthetic-fixture-negative-descriptors"] !==
  "node scripts/validate-phase2b6c-synthetic-fixture-negative-descriptors.mjs"
) {
  fail("Missing npm script validate:phase2b6c-synthetic-fixture-negative-descriptors.");
}

const scopedFiles = [
  descriptorsRelative,
  descriptorsTestRelative,
  scriptRelative,
  docRelative,
  packageRelative,
];
const descriptorSource = read(descriptorsRelative);
const testSource = read(descriptorsTestRelative);

for (const expectedId of [
  "SYNTHETIC_ONLY_ALTA_INVALID_NIF_001",
  "SYNTHETIC_ONLY_ALTA_INVALID_DATE_001",
  "SYNTHETIC_ONLY_ALTA_MISSING_SERIES_NUMBER_001",
  "SYNTHETIC_ONLY_ALTA_HASH_MISMATCH_001",
]) {
  if (!descriptorSource.includes(expectedId)) fail(`Missing ${expectedId}.`);
}

for (const expectedKind of [
  "alta_invalid_nif",
  "alta_invalid_date",
  "alta_missing_series_number",
  "alta_hash_mismatch",
]) {
  if (!descriptorSource.includes(expectedKind)) fail(`Missing ${expectedKind}.`);
}

for (const relativePath of scopedFiles) {
  const source = read(relativePath);
  if (/\.xml$/i.test(relativePath)) fail(`Forbidden XML file ${relativePath}.`);
  forbidTerm("XML declaration", relativePath, source, joinTerms("<", "?xml"));
  forbidTerm("Registro tag", relativePath, source, joinTerms("<", "Registro"));
  forbidTerm("Factura tag", relativePath, source, joinTerms("<", "Factura"));
  forbidTerm("public identity block", relativePath, source, joinTerms("BEGIN ", "CERTIFICATE"));
  forbidTerm("private identity block", relativePath, source, joinTerms("PRIVATE ", "KEY"));
  forbidTerm("tax agency host", relativePath, source, joinTerms("agencia", "tributaria"));
  forbidTerm("service role literal", relativePath, source, joinTerms("service", "_role"));
  forbidTerm("token literal", relativePath, source, joinTerms("api", "_", "token"));
  forbidTerm("secret literal", relativePath, source, joinTerms("shared", "_", "secret"));
  forbidTerm(
    "transport attempts table literal",
    relativePath,
    source,
    joinTerms("fiscal", "_transport", "_attempts"),
  );
  forbidPattern(
    "transportable true",
    relativePath,
    source,
    /transportable\s*:\s*true/i,
  );
  forbidPattern(
    "sensitive file extension",
    relativePath,
    source,
    /(^|[^A-Za-z0-9_])\.(?:pfx|p12|pem|key|crt|cer)\b/i,
  );
}

for (const forbiddenChangedPath of changedFiles()) {
  if (/^supabase\//.test(forbiddenChangedPath)) {
    fail(`Supabase path touched: ${forbiddenChangedPath}.`);
  }
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(forbiddenChangedPath)) {
    fail(`Vercel config touched: ${forbiddenChangedPath}.`);
  }
  if (/vida/i.test(forbiddenChangedPath) && !forbiddenChangedPath.startsWith("docs/vida-screenshots-local/")) {
    fail(`ViDA path touched: ${forbiddenChangedPath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

for (const requiredTestMarker of [
  "WAVE_2_IDS",
  "validateSyntheticFixtureDescriptor",
  "datos reales",
  "2B.6C",
]) {
  if (!testSource.includes(requiredTestMarker)) {
    fail(`Missing test marker ${requiredTestMarker}.`);
  }
}

try {
  execFileSync(
    "npx",
    ["vitest", "run", "src/lib/verifactu-synthetic-fixtures/fixtures.test.ts"],
    { cwd: root, encoding: "utf8", stdio: "pipe" },
  );
} catch (error) {
  fail(`Fixture descriptors do not pass guardrails tests: ${error.message}`);
}

if (errors.length > 0) {
  console.error("Phase 2B.6C synthetic fixture negative descriptors validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.6C synthetic fixture negative descriptors validation passed.");
