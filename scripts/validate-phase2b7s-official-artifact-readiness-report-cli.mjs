import { execFileSync, spawnSync } from "node:child_process";
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

const packageJson = JSON.parse(read("package.json") || "{}");
if (
  packageJson.scripts?.["check:verifactu-official-artifact-readiness"] !==
  "node scripts/check-verifactu-official-artifact-readiness.mjs"
) {
  fail("Missing npm script check:verifactu-official-artifact-readiness.");
}
if (
  packageJson.scripts?.["validate:phase2b7s-official-artifact-readiness-report-cli"] !==
  "node scripts/validate-phase2b7s-official-artifact-readiness-report-cli.mjs"
) {
  fail("Missing npm script validate:phase2b7s-official-artifact-readiness-report-cli.");
}

const reportSource = read("src/lib/verifactu-official-artifact-readiness/readiness-report.ts");
for (const marker of [
  "PHASE2B7S_OFFICIAL_ARTIFACT_READINESS_REPORT_CLI_V1",
  "buildOfficialArtifactReadinessReport",
  "checksumStatus",
  "importGraphStatus",
  "validatorStatus: \"blocked\"",
  "syntheticDataStatus: \"blocked\"",
  "containsXmlOrXsdContent: false",
  "containsSecrets: false",
]) {
  if (!reportSource.includes(marker)) fail(`2B.7S report source missing marker ${marker}.`);
}

const cliSource = read("scripts/check-verifactu-official-artifact-readiness.mjs");
for (const marker of [
  "PHASE2B7S_OFFICIAL_ARTIFACT_READINESS_REPORT_CLI_V1",
  "--artifact-dir",
  "--json",
  "--strict",
  "status: \"blocked\"",
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
  "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
  "networkUsed: false",
  "certificatesUsed: false",
]) {
  if (!cliSource.includes(marker)) fail(`2B.7S CLI missing marker ${marker}.`);
}

const doc = read("docs/phase2b7s-official-artifact-readiness-report-cli-v1.md");
for (const marker of [
  "PHASE2B7S_OFFICIAL_ARTIFACT_READINESS_REPORT_CLI_V1",
  "check:verifactu-official-artifact-readiness",
  "--artifact-dir",
  "--json",
  "--strict",
  "salida segura",
]) {
  if (!doc.includes(marker)) fail(`2B.7S doc missing marker ${marker}.`);
}

for (const [name, source] of [
  ["report", reportSource],
  ["cli", cliSource],
]) {
  for (const forbiddenPattern of [
    /\bfetch\s*\(/,
    /\baxios\b/,
    /\bnode:http\b/,
    /\bnode:https\b/,
    /\bwriteFile(?:Sync)?\b/,
    /\bappendFile(?:Sync)?\b/,
    /\bcreateWriteStream\b/,
    /@supabase|createClient\(/,
    /\bfiscal_transport_attempts\b/i,
    /transportable:\s*true/,
    /BEGIN CERTIFICATE/,
    /PRIVATE KEY/,
  ]) {
    if (forbiddenPattern.test(source)) {
      fail(`Forbidden 2B.7S ${name} pattern ${forbiddenPattern}.`);
    }
  }
}

try {
  const output = execFileSync("node", [
    "scripts/check-verifactu-official-artifact-readiness.mjs",
    "--json",
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const report = JSON.parse(output);
  if (report.status !== "blocked") fail("CLI without artifact-dir must report blocked.");
  if (!report.blockers.includes("BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED")) {
    fail("CLI without artifact-dir missing directory blocker.");
  }
  if (output.includes("<xs:")) fail("CLI output printed XSD content.");
} catch (error) {
  fail(`CLI JSON smoke test failed: ${error.message}`);
}

const strict = spawnSync("node", [
  "scripts/check-verifactu-official-artifact-readiness.mjs",
  "--strict",
  "--json",
], {
  cwd: root,
  encoding: "utf8",
});
if (strict.status === 0) {
  fail("CLI strict mode must return non-zero while blocked.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7S official artifact readiness report CLI validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7S official artifact readiness report CLI validation passed.");
