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

function runNpmScript(scriptName) {
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
for (const scriptName of [
  "validate:phase2b7f-official-artifact-offline-fixture-policy",
  "validate:phase2b7g-offline-xsd-validator-selection",
  "validate:phase2b7h-official-safe-synthetic-data-catalog",
  "validate:phase2b7f-k-official-alignment-gate",
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}
if (packageJson.scripts?.["validate:phase2b7i-official-aligned-synthetic-xml-serialization"]) {
  fail("2B.7I validator script must not exist while the gate is blocked.");
}
if (packageJson.scripts?.["validate:phase2b7j-official-xsd-offline-validation"]) {
  fail("2B.7J validator script must not exist while the gate is blocked.");
}

for (const scriptName of [
  "validate:phase2b7f-official-artifact-offline-fixture-policy",
  "validate:phase2b7g-offline-xsd-validator-selection",
  "validate:phase2b7h-official-safe-synthetic-data-catalog",
]) {
  runNpmScript(scriptName);
}

const checkpoint = read("docs/phase2b7k-official-alignment-gate-checkpoint-v1.md");
for (const marker of [
  "PHASE2B7K_OFFICIAL_ALIGNMENT_GATE_CHECKPOINT_V1",
  "PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED",
  "BLOCKED_XSD_NOT_COMMITTED",
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
  "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
  "Do not start 2B.8",
]) {
  if (!checkpoint.includes(marker)) fail(`2B.7K checkpoint missing marker ${marker}.`);
}

for (const forbiddenPath of [
  "src/lib/verifactu-official-validation",
  "src/lib/verifactu-official-alignment/xml",
]) {
  if (fs.existsSync(absolute(forbiddenPath))) {
    fail(`${forbiddenPath} must not exist while the official alignment gate is blocked.`);
  }
}

for (const changedPath of [
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
]) {
  if (/^supabase\//.test(changedPath)) fail(`Supabase path touched: ${changedPath}.`);
  if (/^supabase\/migrations\//.test(changedPath)) fail(`Migration touched: ${changedPath}.`);
  if (/vida/i.test(changedPath) && !changedPath.startsWith("docs/vida-screenshots-local/")) {
    fail(`ViDA path touched: ${changedPath}.`);
  }
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (/fiscal_transport_attempts/i.test(changedPath)) {
    fail(`Transport path touched: ${changedPath}.`);
  }
  if (/\.(?:xml|pem|p12|pfx|key|crt|cer)$/i.test(changedPath)) {
    fail(`Forbidden tracked artifact path: ${changedPath}.`);
  }
  if (/^test\/fixtures\/verifactu-official-artifacts\/.*\.(?:xsd|xml|pdf|xlsx)$/i.test(changedPath)) {
    fail(`Forbidden official fixture while blocked: ${changedPath}.`);
  }
}

for (const trackedPath of gitLines(["ls-files", "test/fixtures/verifactu-official-artifacts"])) {
  if (/\.(?:xsd|xml|pdf|xlsx)$/i.test(trackedPath)) {
    fail(`No official artifact fixture should be tracked while blocked: ${trackedPath}.`);
  }
}

const sourceFilesToScan = gitLines(["ls-files", "src/lib/verifactu-official-alignment"]).filter(
  (file) => /\.(?:ts|tsx)$/.test(file) && !/\.test\.(?:ts|tsx)$/.test(file),
);
for (const sourceFile of sourceFilesToScan) {
  const body = read(sourceFile);
  for (const forbiddenPattern of [
    /\bfetch\s*\(/,
    /\baxios\b/,
    /\bnode:http\b/,
    /\bnode:https\b/,
    /\bhttp\.request\b/,
    /\bhttps\.request\b/,
    /<\?xml/i,
    /<RegFactuSistemaFacturacion/i,
    /BEGIN (?:RSA |EC )?PRIVATE KEY/,
    /BEGIN CERTIFICATE/,
  ]) {
    if (forbiddenPattern.test(body)) {
      fail(`Forbidden runtime/XML pattern ${forbiddenPattern} in ${sourceFile}.`);
    }
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7F-K official alignment gate validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7F-K official alignment gate remains blocked with evidence.");
