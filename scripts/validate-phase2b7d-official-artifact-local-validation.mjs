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

const doc = read("docs/phase2b7d-official-artifact-local-validation-v1.md");
if (!doc.includes("BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR")) {
  fail("2B.7D must document BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR.");
}
if (!doc.includes("no se simula validacion XSD")) {
  fail("2B.7D must state XSD validation is not simulated.");
}

const packageJson = JSON.parse(read("package.json") || "{}");
const allDependencies = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};
for (const forbiddenDependency of [
  "xsd-schema-validator",
  "libxmljs",
  "libxmljs2",
  "xsd-validator",
]) {
  if (Object.hasOwn(allDependencies, forbiddenDependency)) {
    fail(`Forbidden XSD validator dependency ${forbiddenDependency}.`);
  }
}
if (
  packageJson.scripts?.["validate:phase2b7d-official-artifact-local-validation"] !==
  "node scripts/validate-phase2b7d-official-artifact-local-validation.mjs"
) {
  fail("Missing npm script validate:phase2b7d-official-artifact-local-validation.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7D official artifact local validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7D official artifact local validation remains blocked as expected.");
