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

function checkChangedPath(changedPath) {
  const isPhase2C20LocalSyncSchemaPath =
    /^supabase\/migrations\/\d{14}_phase2c20_document_sync_local_schema\.sql$/.test(changedPath) ||
    /^supabase\/rollbacks\/\d{14}_phase2c20_document_sync_local_schema\.down\.sql$/.test(changedPath);
  if (!isPhase2C20LocalSyncSchemaPath && /^supabase\//.test(changedPath)) {
    fail(`Supabase path touched: ${changedPath}.`);
  }
  if (!isPhase2C20LocalSyncSchemaPath && /^supabase\/migrations\//.test(changedPath)) {
    fail(`Migration touched: ${changedPath}.`);
  }
  if (/vida/i.test(changedPath) && !changedPath.startsWith("docs/vida-screenshots-local/")) {
    fail(`ViDA path touched: ${changedPath}.`);
  }
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (/fiscal_transport_attempts/i.test(changedPath)) fail(`Transport path touched: ${changedPath}.`);
  if (/\.(?:xml|xsd|pem|p12|pfx|key|crt|cer)$/i.test(changedPath)) {
    fail(`Forbidden artifact path touched: ${changedPath}.`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (
  packageJson.scripts?.["validate:phase2b7l-official-artifact-intake-gate"] !==
  "node scripts/validate-phase2b7l-official-artifact-intake-gate.mjs"
) {
  fail("Missing npm script validate:phase2b7l-official-artifact-intake-gate.");
}

const doc = read("docs/phase2b7l-official-artifact-intake-gate-v1.md");
for (const marker of [
  "PHASE2B7L_OFFICIAL_ARTIFACT_INTAKE_GATE_V1",
  "BLOCKED_XSD_NOT_COMMITTED",
  "BLOCKED_XSD_CHECKSUM_NOT_VERIFIABLE",
  "BLOCKED_XSD_IMPORT_GRAPH_NOT_VERIFIED",
]) {
  if (!doc.includes(marker)) fail(`2B.7L doc missing marker ${marker}.`);
}

const source = read("src/lib/verifactu-official-gates/artifact-intake-gate.ts");
for (const marker of [
  "evaluateOfficialArtifactIntakeGate",
  "PHASE2B7L_OFFICIAL_ARTIFACT_INTAKE_GATE_V1",
  "networkUsed: false",
  "certificatesUsed: false",
  "pdfsOrXlsxCommitted: false",
  "BLOCKED_XSD_NOT_COMMITTED",
  "BLOCKED_XSD_CHECKSUM_NOT_VERIFIABLE",
  "BLOCKED_XSD_IMPORT_GRAPH_NOT_VERIFIED",
]) {
  if (!source.includes(marker)) fail(`2B.7L source missing marker ${marker}.`);
}

for (const forbiddenPattern of [
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\bnode:http\b/,
  /\bnode:https\b/,
  /\bwriteFile(?:Sync)?\b/,
  /\bappendFile(?:Sync)?\b/,
  /\bcreateWriteStream\b/,
  /BEGIN CERTIFICATE/,
  /PRIVATE KEY/,
]) {
  if (forbiddenPattern.test(source)) fail(`Forbidden 2B.7L source pattern ${forbiddenPattern}.`);
}

for (const changedPath of [
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
]) {
  checkChangedPath(changedPath);
}

for (const trackedPath of gitLines(["ls-files", "test/fixtures/verifactu-official-artifacts"])) {
  if (/\.(?:xsd|xml|pdf|xlsx)$/i.test(trackedPath)) {
    fail(`Official artifact fixture must not be tracked in 2B.7L: ${trackedPath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7L official artifact intake gate validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7L official artifact intake gate validation passed.");
