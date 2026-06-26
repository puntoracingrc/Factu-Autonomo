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
  packageJson.scripts?.["validate:phase2b7t-official-artifact-readiness-acceptance-tests"] !==
  "node scripts/validate-phase2b7t-official-artifact-readiness-acceptance-tests.mjs"
) {
  fail("Missing npm script validate:phase2b7t-official-artifact-readiness-acceptance-tests.");
}

const testSource = read("scripts/phase2b7t-official-artifact-readiness-acceptance.test.ts");
for (const marker of [
  "PHASE2B7T official artifact readiness acceptance",
  "repo actual sin artefactos oficiales locales",
  "CLI no recibe artifact-dir",
  "strict sin artifact-dir",
  "XSD sinteticos simples",
  "checksum esperado incorrecto",
  "imports remotos",
  "imports locales faltantes",
  "grafo local completo",
  "readiness global blocked",
  "no imprime XML/XSD completo",
  "no imprime secretos",
  "no usa red",
]) {
  if (!testSource.includes(marker)) fail(`2B.7T acceptance test missing marker ${marker}.`);
}

const doc = read("docs/phase2b7t-official-artifact-readiness-acceptance-tests-v1.md");
for (const marker of [
  "PHASE2B7T_OFFICIAL_ARTIFACT_READINESS_ACCEPTANCE_TESTS_V1",
  "12 casos",
  "XSD sinteticos",
  "sin XSD oficiales",
  "sin red",
]) {
  if (!doc.includes(marker)) fail(`2B.7T doc missing marker ${marker}.`);
}

if (!testSource.includes("os.tmpdir()") || !testSource.includes("mkdtempSync")) {
  fail("2B.7T tests must use temporary directories for synthetic XSD files.");
}
if (testSource.includes("docs/vida-screenshots-local")) {
  fail("2B.7T tests must not touch ViDA screenshots.");
}
if (testSource.includes("supabase")) {
  fail("2B.7T tests must not use Supabase.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7T official artifact readiness acceptance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7T official artifact readiness acceptance validation passed.");
