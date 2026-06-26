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
  "check:verifactu-official-artifact-readiness",
  "validate:phase2b7q-local-official-artifact-intake-protocol",
  "validate:phase2b7r-local-xsd-checksum-import-graph-verifier",
  "validate:phase2b7s-official-artifact-readiness-report-cli",
  "validate:phase2b7t-official-artifact-readiness-acceptance-tests",
  "validate:phase2b7q-u-official-artifact-readiness-tooling",
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of [
  "validate:phase2b7q-local-official-artifact-intake-protocol",
  "validate:phase2b7r-local-xsd-checksum-import-graph-verifier",
  "validate:phase2b7s-official-artifact-readiness-report-cli",
  "validate:phase2b7t-official-artifact-readiness-acceptance-tests",
]) {
  runNpmScript(scriptName);
}

const checkpoint = read("docs/phase2b7u-official-artifact-readiness-tooling-checkpoint-v1.md");
for (const marker of [
  "PHASE2B7U_OFFICIAL_ARTIFACT_READINESS_TOOLING_CHECKPOINT_V1",
  "PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / READINESS TOOLING AVAILABLE",
  "2B.7Q",
  "2B.7R",
  "2B.7S",
  "2B.7T",
  "no XSD oficiales commiteados",
  "no XML oficial",
  "No iniciar 2B.8",
]) {
  if (!checkpoint.includes(marker)) fail(`2B.7U checkpoint missing marker ${marker}.`);
}

const compliance = read("docs/compliance-evidence-v1.md");
for (const marker of [
  "readiness tooling 2B.7Q-U",
  "PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / READINESS TOOLING AVAILABLE",
  "sin XML oficial",
  "sin XSD oficial commiteado",
  "sin validador real",
  "sin QR",
  "sin firma",
  "sin transporte",
]) {
  if (!compliance.includes(marker)) fail(`Compliance dossier missing 2B.7Q-U marker ${marker}.`);
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

  if (/^supabase\//.test(changedPath)) fail(`Supabase path touched: ${changedPath}.`);
  if (/^supabase\/migrations\//.test(changedPath)) fail(`Migration touched: ${changedPath}.`);
  if (/vida/i.test(changedPath)) fail(`ViDA path touched: ${changedPath}.`);
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (/^(?:app|components|public)\//.test(changedPath)) {
    fail(`UI/public path touched: ${changedPath}.`);
  }
  if (/fiscal_transport_attempts/i.test(changedPath)) {
    fail(`Transport path touched: ${changedPath}.`);
  }
  if (/\.(?:xml|xsd|pem|p12|pfx|key|crt|cer|pdf|xlsx|snap)$/i.test(changedPath)) {
    fail(`Forbidden artifact/snapshot path touched: ${changedPath}.`);
  }
}

for (const trackedPath of gitLines(["ls-files"])) {
  if (trackedPath.startsWith("node_modules/")) continue;
  if (/\.(?:xml|xsd|pem|p12|pfx|key|crt|cer)$/i.test(trackedPath)) {
    fail(`Forbidden tracked artifact: ${trackedPath}.`);
  }
}

const runtimeFiles = [
  ...gitLines(["ls-files", "src/lib/verifactu-official-artifact-readiness"]),
  "scripts/check-verifactu-official-artifact-readiness.mjs",
].filter((filePath) => filePath && !/\.test\.(?:ts|tsx)$/.test(filePath));

for (const filePath of runtimeFiles) {
  const body = read(filePath);
  for (const forbiddenPattern of [
    /\bfetch\s*\(/,
    /\baxios\b/,
    /\bnode:http\b/,
    /\bnode:https\b/,
    /\bwriteFile(?:Sync)?\b/,
    /\bappendFile(?:Sync)?\b/,
    /\bcreateWriteStream\b/,
    /@supabase|createClient\(|from ["'][^"']*supabase/i,
    /agenciatributaria\.gob\.es/i,
    /\bfiscal_transport_attempts\b/i,
    /transportable:\s*true/,
    /BEGIN CERTIFICATE/,
    /PRIVATE KEY/,
    /<\?xml/i,
    /<RegFactu/i,
  ]) {
    if (forbiddenPattern.test(body)) {
      fail(`Forbidden runtime pattern ${forbiddenPattern} in ${filePath}.`);
    }
  }
}

for (const snapshotPath of gitLines(["ls-files", "*.snap"])) {
  const body = read(snapshotPath);
  if (/<\?xml|<xs:|<RegFactu/i.test(body)) {
    fail(`Snapshot contains XML/XSD content: ${snapshotPath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7Q-U official artifact readiness tooling validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7Q-U official artifact readiness tooling validation passed.");
