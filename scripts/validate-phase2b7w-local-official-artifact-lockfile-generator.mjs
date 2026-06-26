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
  packageJson.scripts?.["generate:verifactu-official-artifact-lockfile"] !==
  "node scripts/generate-verifactu-official-artifact-lockfile.mjs"
) {
  fail("Missing npm script generate:verifactu-official-artifact-lockfile.");
}
if (
  packageJson.scripts?.["validate:phase2b7w-local-official-artifact-lockfile-generator"] !==
  "node scripts/validate-phase2b7w-local-official-artifact-lockfile-generator.mjs"
) {
  fail("Missing npm script validate:phase2b7w-local-official-artifact-lockfile-generator.");
}

const source = read("scripts/generate-verifactu-official-artifact-lockfile.mjs");
for (const marker of [
  "PHASE2B7W_LOCAL_OFFICIAL_ARTIFACT_LOCKFILE_GENERATOR_V1",
  "--artifact-dir",
  "--json",
  "--out",
  "--redacted",
  "--strict",
  "assertOutputPathAllowed",
  "LOCKFILE_GENERATOR_ARTIFACT_DIR_REQUIRED",
  "LOCKFILE_GENERATOR_OUTPUT_FORBIDDEN",
  "networkUsed: false",
  "certificatesUsed: false",
  "containsXmlOrXsdContent: false",
]) {
  if (!source.includes(marker)) fail(`2B.7W generator missing marker ${marker}.`);
}

const doc = read("docs/phase2b7w-local-official-artifact-lockfile-generator-v1.md");
for (const marker of [
  "PHASE2B7W_LOCAL_OFFICIAL_ARTIFACT_LOCKFILE_GENERATOR_V1",
  "generate:verifactu-official-artifact-lockfile",
  "--artifact-dir",
  "--out",
  "redacted",
  "no network",
]) {
  if (!doc.includes(marker)) fail(`2B.7W doc missing marker ${marker}.`);
}

const testSource = read("src/lib/verifactu-official-artifact-readiness/artifact-lockfile.test.ts");
for (const marker of [
  "generator bloquea sin artifact-dir",
  "generator bloquea directorios inexistentes",
  "generator produce JSON redactado",
  "generator escribe --out",
  "generator bloquea --out dentro de docs",
]) {
  if (!testSource.includes(marker)) fail(`2B.7W test missing marker ${marker}.`);
}

for (const forbiddenPattern of [
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\bnode:http\b/,
  /\bnode:https\b/,
  /@supabase|createClient\(/,
  /\bfiscal_transport_attempts\b/i,
  /transportable:\s*true/,
]) {
  if (forbiddenPattern.test(source)) {
    fail(`Forbidden 2B.7W generator pattern ${forbiddenPattern}.`);
  }
}
if (!/fs\.writeFileSync\(path\.resolve\(args\.out\)/.test(source)) {
  fail("Generator write must be tied to explicit --out path.");
}
if (!source.includes("LOCKFILE_GENERATOR_OUTPUT_FORBIDDEN")) {
  fail("Generator must block forbidden output paths.");
}

const noArgs = spawnSync("node", ["scripts/generate-verifactu-official-artifact-lockfile.mjs", "--json"], {
  cwd: root,
  encoding: "utf8",
});
if (noArgs.status === 0 || !noArgs.stdout.includes("LOCKFILE_GENERATOR_ARTIFACT_DIR_REQUIRED")) {
  fail("Generator no-argument smoke test did not block safely.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7W local official artifact lockfile generator validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7W local official artifact lockfile generator validation passed.");
