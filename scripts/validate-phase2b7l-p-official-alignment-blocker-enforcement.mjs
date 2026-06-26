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
  "validate:phase2b7l-official-artifact-intake-gate",
  "validate:phase2b7m-offline-xsd-validator-contract",
  "validate:phase2b7n-official-aligned-xml-preflight-gate",
  "validate:phase2b7o-official-alignment-blocker-report",
  "validate:phase2b7l-p-official-alignment-blocker-enforcement",
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of [
  "validate:phase2b7l-official-artifact-intake-gate",
  "validate:phase2b7m-offline-xsd-validator-contract",
  "validate:phase2b7n-official-aligned-xml-preflight-gate",
  "validate:phase2b7o-official-alignment-blocker-report",
]) {
  runNpmScript(scriptName);
}

const checkpoint = read("docs/phase2b7p-official-alignment-enforced-block-checkpoint-v1.md");
for (const marker of [
  "PHASE2B7P_OFFICIAL_ALIGNMENT_ENFORCED_BLOCK_CHECKPOINT_V1",
  "PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / ENFORCED BY CODE",
  "evaluateOfficialArtifactIntakeGate",
  "createBlockedOfflineXsdValidator",
  "evaluateOfficialAlignedXmlPreflight",
  "buildOfficialAlignmentBlockerReport",
  "Do not start 2B.8",
]) {
  if (!checkpoint.includes(marker)) fail(`2B.7P checkpoint missing marker ${marker}.`);
}

const compliance = read("docs/compliance-evidence-v1.md");
for (const marker of [
  "enforcement de bloqueo oficial 2B.7L-P",
  "PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / ENFORCED BY CODE",
  "sin XML oficial",
  "sin validacion AEAT",
  "sin QR",
  "sin firma",
  "sin transporte",
]) {
  if (!compliance.includes(marker)) fail(`Compliance dossier missing 2B.7L-P marker ${marker}.`);
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
  if (/\.(?:xml|xsd|pem|p12|pfx|key|crt|cer)$/i.test(changedPath)) {
    fail(`Forbidden artifact path touched: ${changedPath}.`);
  }
  if (/^test\/fixtures\/verifactu-official-artifacts\/.*\.(?:xsd|xml|pdf|xlsx)$/i.test(changedPath)) {
    fail(`Forbidden official fixture while blocked: ${changedPath}.`);
  }
  if (/\.snap$/i.test(changedPath)) {
    fail(`Snapshot file touched: ${changedPath}.`);
  }
}

for (const trackedPath of gitLines(["ls-files", "test/fixtures/verifactu-official-artifacts"])) {
  if (/\.(?:xsd|xml|pdf|xlsx)$/i.test(trackedPath)) {
    fail(`Official artifact fixture must not be tracked in 2B.7L-P: ${trackedPath}.`);
  }
}

for (const sourceFile of gitLines(["ls-files", "src/lib/verifactu-official-gates"])) {
  if (!/\.(?:ts|tsx)$/.test(sourceFile) || /\.test\.(?:ts|tsx)$/.test(sourceFile)) {
    continue;
  }
  const body = read(sourceFile);
  for (const forbiddenPattern of [
    /\bfetch\s*\(/,
    /\baxios\b/,
    /\bnode:http\b/,
    /\bnode:https\b/,
    /\bwriteFile(?:Sync)?\b/,
    /\bappendFile(?:Sync)?\b/,
    /\bcreateWriteStream\b/,
    /@supabase|createClient\(|from ["'][^"']*supabase/i,
    /\bfiscal_transport_attempts\b/i,
    /transportable:\s*true/,
    /BEGIN CERTIFICATE/,
    /PRIVATE KEY/,
  ]) {
    if (forbiddenPattern.test(body)) {
      fail(`Forbidden source pattern ${forbiddenPattern} in ${sourceFile}.`);
    }
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7L-P official alignment blocker enforcement validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7L-P official alignment blocker enforcement validation passed.");
