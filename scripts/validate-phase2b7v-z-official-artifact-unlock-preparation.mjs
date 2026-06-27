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
  "generate:verifactu-official-artifact-lockfile",
  "verify:verifactu-official-artifact-lockfile",
  "validate:phase2b7v-official-artifact-lockfile-contract",
  "validate:phase2b7w-local-official-artifact-lockfile-generator",
  "validate:phase2b7x-opt-in-official-artifact-verification",
  "validate:phase2b7y-human-approval-checklist-for-official-artifacts",
  "validate:phase2b7v-z-official-artifact-unlock-preparation",
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of [
  "validate:phase2b7v-official-artifact-lockfile-contract",
  "validate:phase2b7w-local-official-artifact-lockfile-generator",
  "validate:phase2b7x-opt-in-official-artifact-verification",
  "validate:phase2b7y-human-approval-checklist-for-official-artifacts",
]) {
  runNpmScript(scriptName);
}

const checkpoint = read("docs/phase2b7z-official-artifact-unlock-preparation-checkpoint-v1.md");
for (const marker of [
  "PHASE2B7Z_OFFICIAL_ARTIFACT_UNLOCK_PREPARATION_CHECKPOINT_V1",
  "PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / UNLOCK PREPARATION COMPLETE",
  "2B.7V",
  "2B.7W",
  "2B.7X",
  "2B.7Y",
  "no XSD oficiales commiteados",
  "no XML oficial",
  "No iniciar 2B.8",
]) {
  if (!checkpoint.includes(marker)) fail(`2B.7Z checkpoint missing marker ${marker}.`);
}

const compliance = read("docs/compliance-evidence-v1.md");
for (const marker of [
  "unlock preparation 2B.7V-Z",
  "lockfile contract",
  "generator local",
  "verifier opt-in",
  "checklist humana",
  "PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / UNLOCK PREPARATION COMPLETE",
  "sin XML oficial",
  "sin XSD oficial commiteado",
  "sin validador real",
  "sin QR",
  "sin firma",
  "sin transporte",
]) {
  if (!compliance.includes(marker)) fail(`Compliance dossier missing 2B.7V-Z marker ${marker}.`);
}

const changedPaths = new Set([
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);

const allowedPathPatterns = [
  /^src\/lib\/verifactu-official-artifact-readiness\//,
  /^scripts\/generate-verifactu-official-artifact-lockfile\.mjs$/,
  /^scripts\/verify-verifactu-official-artifact-lockfile\.mjs$/,
  /^scripts\/validate-phase2b7[ vwxyz-].*\.mjs$/,
  /^scripts\/validate-phase2b7v-.*\.mjs$/,
  /^scripts\/validate-phase2b7w-.*\.mjs$/,
  /^scripts\/validate-phase2b7x-.*\.mjs$/,
  /^scripts\/validate-phase2b7y-.*\.mjs$/,
  /^docs\/phase2b7[ vwxyz-].*\.md$/,
  /^docs\/phase2b7v-.*\.md$/,
  /^docs\/phase2b7w-.*\.md$/,
  /^docs\/phase2b7x-.*\.md$/,
  /^docs\/phase2b7y-.*\.(?:md|json)$/,
  /^docs\/phase2b7z-.*\.md$/,
  /^docs\/compliance-evidence-v1\.md$/,
  /^package\.json$/,
];

const unrelatedLaterPhasePatterns = [
  /^scripts\/validate-phase2b6(?:b|c|d(?:-h)?|e|f|g)-.*\.mjs$/,
  /^scripts\/validate-phase2b7(?:a(?:-e)?|b|f(?:-k)?|g|h|l(?:-p)?|n|q-u)-.*\.mjs$/,
  /^scripts\/validate-phase2b7q-u-official-artifact-readiness-tooling\.mjs$/,
  /^src\/lib\/document-sync-integrity\//,
  /^src\/app\/api\/document-sync\/route\.ts$/,
  /^docs\/audit\//,
  /^scripts\/export-compliance-dossier-html\.mjs$/,
  /^scripts\/validate-audit-.*\.mjs$/,
  /^scripts\/phase2c10-/,
  /^scripts\/phase2c17-/,
  /^scripts\/phase2c2[123]-/,
  /^scripts\/phase2c29-/,
  /^scripts\/phase2c35-/,
  /^scripts\/phase2c4[056]-/,
  /^scripts\/validate-phase2c/,
  /^docs\/phase2c/,
  /^supabase\/migrations\/\d{14}_phase2c20_document_sync_local_schema\.sql$/,
  /^supabase\/rollbacks\/\d{14}_phase2c20_document_sync_local_schema\.down\.sql$/,
];

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  const isAllowedPhase2B7VZPath = allowedPathPatterns.some((pattern) =>
    pattern.test(changedPath),
  );
  const isUnrelatedLaterPhasePath = unrelatedLaterPhasePatterns.some((pattern) =>
    pattern.test(changedPath),
  );
  if (!isAllowedPhase2B7VZPath && !isUnrelatedLaterPhasePath) {
    fail(`Unexpected path touched in 2B.7V-Z: ${changedPath}.`);
  }
  if (!isUnrelatedLaterPhasePath && /^supabase\//.test(changedPath)) {
    fail(`Supabase path touched: ${changedPath}.`);
  }
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
  "scripts/generate-verifactu-official-artifact-lockfile.mjs",
  "scripts/verify-verifactu-official-artifact-lockfile.mjs",
].filter((filePath) => filePath && !/\.test\.(?:ts|tsx)$/.test(filePath));

for (const filePath of runtimeFiles) {
  const body = read(filePath);
  for (const forbiddenPattern of [
    /\bfetch\s*\(/,
    /\baxios\b/,
    /\bnode:http\b/,
    /\bnode:https\b/,
    /@supabase|createClient\(|from ["'][^"']*supabase/i,
    /\bfiscal_transport_attempts\b/i,
    /transportable:\s*true/,
  ]) {
    if (forbiddenPattern.test(body)) {
      fail(`Forbidden runtime pattern ${forbiddenPattern} in ${filePath}.`);
    }
  }
  if (
    /\bwriteFile(?:Sync)?\b/.test(body) &&
    filePath !== "scripts/generate-verifactu-official-artifact-lockfile.mjs"
  ) {
    fail(`Unexpected runtime write in ${filePath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7V-Z official artifact unlock preparation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7V-Z official artifact unlock preparation validation passed.");
