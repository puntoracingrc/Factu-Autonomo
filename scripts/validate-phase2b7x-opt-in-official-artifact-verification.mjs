import { spawnSync } from "node:child_process";
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
  packageJson.scripts?.["verify:verifactu-official-artifact-lockfile"] !==
  "node scripts/verify-verifactu-official-artifact-lockfile.mjs"
) {
  fail("Missing npm script verify:verifactu-official-artifact-lockfile.");
}
if (
  packageJson.scripts?.["validate:phase2b7x-opt-in-official-artifact-verification"] !==
  "node scripts/validate-phase2b7x-opt-in-official-artifact-verification.mjs"
) {
  fail("Missing npm script validate:phase2b7x-opt-in-official-artifact-verification.");
}

const source = read("scripts/verify-verifactu-official-artifact-lockfile.mjs");
for (const marker of [
  "PHASE2B7X_OPT_IN_OFFICIAL_ARTIFACT_VERIFICATION_V1",
  "--artifact-dir",
  "--lockfile",
  "--json",
  "--strict",
  "blocked_missing_arguments",
  "lockfile_invalid",
  "lockfile_valid_but_alignment_still_blocked",
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
  "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
  "BLOCKED_HUMAN_APPROVAL_REQUIRED_FOR_OFFICIAL_ARTIFACT_FIXTURES",
  "readyForOfficialXml: false",
  "xsdValidationPerformed: false",
]) {
  if (!source.includes(marker)) fail(`2B.7X verifier missing marker ${marker}.`);
}

const doc = read("docs/phase2b7x-opt-in-official-artifact-verification-v1.md");
for (const marker of [
  "PHASE2B7X_OPT_IN_OFFICIAL_ARTIFACT_VERIFICATION_V1",
  "verify:verifactu-official-artifact-lockfile",
  "blocked_missing_arguments",
  "lockfile_invalid",
  "lockfile_valid_but_alignment_still_blocked",
  "ready for XML",
]) {
  if (!doc.includes(marker)) fail(`2B.7X doc missing marker ${marker}.`);
}

const testSource = read("src/lib/verifactu-official-artifact-readiness/artifact-lockfile.test.ts");
for (const marker of [
  "verifier sin argumentos",
  "verifier acepta lockfile valido",
  "verifier invalida checksum mismatch",
  "verifier invalida dependencia local faltante",
  "verifier invalida import remoto",
  "verifier invalida lockfile con dominio no oficial",
  "verifier no imprime contenido XSD",
]) {
  if (!testSource.includes(marker)) fail(`2B.7X test missing marker ${marker}.`);
}

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
]) {
  if (forbiddenPattern.test(source)) {
    fail(`Forbidden 2B.7X verifier pattern ${forbiddenPattern}.`);
  }
}

const noArgs = spawnSync("node", ["scripts/verify-verifactu-official-artifact-lockfile.mjs", "--json"], {
  cwd: root,
  encoding: "utf8",
});
if (noArgs.status !== 0 || !noArgs.stdout.includes("blocked_missing_arguments")) {
  fail("Verifier no-argument smoke test did not no-op safely.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7X opt-in official artifact verification validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7X opt-in official artifact verification validation passed.");
