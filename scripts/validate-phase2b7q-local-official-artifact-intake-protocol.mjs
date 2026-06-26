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
  packageJson.scripts?.["validate:phase2b7q-local-official-artifact-intake-protocol"] !==
  "node scripts/validate-phase2b7q-local-official-artifact-intake-protocol.mjs"
) {
  fail("Missing npm script validate:phase2b7q-local-official-artifact-intake-protocol.");
}

const source = read("src/lib/verifactu-official-artifact-readiness/local-artifact-intake.ts");
for (const marker of [
  "PHASE2B7Q_LOCAL_OFFICIAL_ARTIFACT_INTAKE_PROTOCOL_V1",
  "inspectLocalOfficialArtifactSet",
  "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED",
  "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_FOUND",
  "BLOCKED_REQUIRED_XSD_FILE_MISSING",
  "BLOCKED_FORBIDDEN_ARTIFACT_EXTENSION",
  "BLOCKED_LOCAL_ARTIFACT_SECRET_FILENAME_DETECTED",
  "networkUsed: false",
  "certificatesUsed: false",
  "copiedFilesToRepo: false",
  "printedContent: false",
]) {
  if (!source.includes(marker)) fail(`2B.7Q source missing marker ${marker}.`);
}

const testSource = read("src/lib/verifactu-official-artifact-readiness/local-artifact-intake.test.ts");
for (const marker of [
  "no se proporciona directorio",
  "directorio no existe",
  "dentro de rutas fuente del repo",
  "directorio temporal valido",
  "rechaza extensiones",
  "not.toContain(\"redacted\")",
]) {
  if (!testSource.includes(marker)) fail(`2B.7Q test missing marker ${marker}.`);
}

const doc = read("docs/phase2b7q-local-official-artifact-intake-protocol-v1.md");
for (const marker of [
  "PHASE2B7Q_LOCAL_OFFICIAL_ARTIFACT_INTAKE_PROTOCOL_V1",
  "inspectLocalOfficialArtifactSet",
  "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED",
  "BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_FOUND",
  "BLOCKED_REQUIRED_XSD_FILE_MISSING",
  "no descarga",
]) {
  if (!doc.includes(marker)) fail(`2B.7Q doc missing marker ${marker}.`);
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
  /BEGIN CERTIFICATE/,
  /PRIVATE KEY/,
]) {
  if (forbiddenPattern.test(source)) {
    fail(`Forbidden 2B.7Q source pattern ${forbiddenPattern}.`);
  }
}

if (errors.length > 0) {
  console.error("Phase 2B.7Q local official artifact intake protocol validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7Q local official artifact intake protocol validation passed.");
