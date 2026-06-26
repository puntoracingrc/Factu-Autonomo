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
  packageJson.scripts?.["validate:phase2b7r-local-xsd-checksum-import-graph-verifier"] !==
  "node scripts/validate-phase2b7r-local-xsd-checksum-import-graph-verifier.mjs"
) {
  fail("Missing npm script validate:phase2b7r-local-xsd-checksum-import-graph-verifier.");
}

const checksumSource = read("src/lib/verifactu-official-artifact-readiness/local-xsd-checksum.ts");
for (const marker of [
  "computeLocalArtifactSha256",
  "DEFAULT_LOCAL_ARTIFACT_MAX_BYTES",
  "BLOCKED_LOCAL_ARTIFACT_EXTENSION_NOT_ALLOWED",
  "BLOCKED_LOCAL_ARTIFACT_TOO_LARGE",
  "safeFileName",
]) {
  if (!checksumSource.includes(marker)) fail(`2B.7R checksum source missing marker ${marker}.`);
}

const graphSource = read("src/lib/verifactu-official-artifact-readiness/local-xsd-import-graph.ts");
for (const marker of [
  "PHASE2B7R_LOCAL_XSD_CHECKSUM_IMPORT_GRAPH_VERIFIER_V1",
  "inspectLocalXsdImportGraph",
  "schemaLocation",
  "BLOCKED_LOCAL_XSD_REMOTE_REFERENCE",
  "BLOCKED_LOCAL_XSD_TRAVERSAL_REFERENCE",
  "BLOCKED_LOCAL_XSD_DEPENDENCY_MISSING",
  "networkUsed: false",
  "contentPrinted: false",
]) {
  if (!graphSource.includes(marker)) fail(`2B.7R graph source missing marker ${marker}.`);
}

const checksumTest = read("src/lib/verifactu-official-artifact-readiness/local-xsd-checksum.test.ts");
for (const marker of [
  "calcula checksums deterministas",
  "cambia el checksum",
  "rechaza extensiones no permitidas",
  "rechaza archivos demasiado grandes",
]) {
  if (!checksumTest.includes(marker)) fail(`2B.7R checksum test missing marker ${marker}.`);
}

const graphTest = read("src/lib/verifactu-official-artifact-readiness/local-xsd-import-graph.test.ts");
for (const marker of [
  "detecta include local completo",
  "dependencia local faltante",
  "bloquea referencias remotas",
  "bloquea traversal",
]) {
  if (!graphTest.includes(marker)) fail(`2B.7R graph test missing marker ${marker}.`);
}

const doc = read("docs/phase2b7r-local-xsd-checksum-import-graph-verifier-v1.md");
for (const marker of [
  "PHASE2B7R_LOCAL_XSD_CHECKSUM_IMPORT_GRAPH_VERIFIER_V1",
  "computeLocalArtifactSha256",
  "inspectLocalXsdImportGraph",
  "no validacion XSD",
  "sin red",
]) {
  if (!doc.includes(marker)) fail(`2B.7R doc missing marker ${marker}.`);
}

for (const source of [checksumSource, graphSource]) {
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
      fail(`Forbidden 2B.7R source pattern ${forbiddenPattern}.`);
    }
  }
}

if (errors.length > 0) {
  console.error("Phase 2B.7R local XSD checksum/import graph validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7R local XSD checksum/import graph validation passed.");
