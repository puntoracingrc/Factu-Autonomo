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
  packageJson.scripts?.["validate:phase2b7v-official-artifact-lockfile-contract"] !==
  "node scripts/validate-phase2b7v-official-artifact-lockfile-contract.mjs"
) {
  fail("Missing npm script validate:phase2b7v-official-artifact-lockfile-contract.");
}

const source = read("src/lib/verifactu-official-artifact-readiness/artifact-lockfile.ts");
for (const marker of [
  "PHASE2B7V_OFFICIAL_ARTIFACT_LOCKFILE_CONTRACT_V1",
  "phase2b7v-official-artifact-lockfile-v1",
  "buildOfficialArtifactLockfile",
  "validateOfficialArtifactLockfile",
  "redactOfficialArtifactLockfile",
  "LOCKFILE_OFFICIAL_DOMAIN_INVALID",
  "LOCKFILE_SHA256_INVALID",
  "LOCKFILE_FORBIDDEN_EXTENSION",
  "LOCKFILE_LOCAL_PATH_EXPOSED",
  "containsXmlOrXsdContent: false",
  "containsSecrets: false",
  "networkUsed: false",
  "certificatesUsed: false",
]) {
  if (!source.includes(marker)) fail(`2B.7V source missing marker ${marker}.`);
}

const testSource = read("src/lib/verifactu-official-artifact-readiness/artifact-lockfile.test.ts");
for (const marker of [
  "lockfile seguro",
  "rechaza contenido XSD",
  "rechaza paths absolutos",
  "rechaza dominios no oficiales",
  "rechaza SHA-256",
  "rechaza extensiones prohibidas",
  "redacta rutas locales",
]) {
  if (!testSource.includes(marker)) fail(`2B.7V test missing marker ${marker}.`);
}

const doc = read("docs/phase2b7v-official-artifact-lockfile-contract-v1.md");
for (const marker of [
  "PHASE2B7V_OFFICIAL_ARTIFACT_LOCKFILE_CONTRACT_V1",
  "buildOfficialArtifactLockfile",
  "validateOfficialArtifactLockfile",
  "redactOfficialArtifactLockfile",
  "no XML/XSD content",
  "no local absolute paths",
]) {
  if (!doc.includes(marker)) fail(`2B.7V doc missing marker ${marker}.`);
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
    fail(`Forbidden 2B.7V source pattern ${forbiddenPattern}.`);
  }
}

if (errors.length > 0) {
  console.error("Phase 2B.7V official artifact lockfile contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7V official artifact lockfile contract validation passed.");
