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
  packageJson.scripts?.["validate:phase2b7m-offline-xsd-validator-contract"] !==
  "node scripts/validate-phase2b7m-offline-xsd-validator-contract.mjs"
) {
  fail("Missing npm script validate:phase2b7m-offline-xsd-validator-contract.");
}

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

const doc = read("docs/phase2b7m-offline-xsd-validator-contract-v1.md");
for (const marker of [
  "PHASE2B7M_OFFLINE_XSD_VALIDATOR_CONTRACT_V1",
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
  "BLOCKED_XSD_NOT_COMMITTED",
  "never returns `accepted: true`",
]) {
  if (!doc.includes(marker)) fail(`2B.7M doc missing marker ${marker}.`);
}

const source = read("src/lib/verifactu-official-gates/offline-xsd-validator-contract.ts");
for (const marker of [
  "createBlockedOfflineXsdValidator",
  "PHASE2B7M_OFFLINE_XSD_VALIDATOR_CONTRACT_V1",
  "status: \"blocked\"",
  "canValidateOffline: false",
  "usesNetwork: false",
  "usesJava: false",
  "usesNativeBinary: false",
  "printsXml: false",
  "accepted: false",
]) {
  if (!source.includes(marker)) fail(`2B.7M source missing marker ${marker}.`);
}
if (/accepted:\s*true/.test(source)) {
  fail("Blocked validator contract must not contain accepted: true.");
}
for (const forbiddenPattern of [
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\bnode:http\b/,
  /\bnode:https\b/,
  /\bnode:fs\b/,
  /\bchild_process\b/,
  /\bjava\b/i,
  /\blibxml\b/i,
  /BEGIN CERTIFICATE/,
  /PRIVATE KEY/,
]) {
  if (forbiddenPattern.test(source)) fail(`Forbidden 2B.7M source pattern ${forbiddenPattern}.`);
}

const testSource = read("src/lib/verifactu-official-gates/offline-xsd-validator-contract.test.ts");
if (/<\?xml|<RegFactu|<[^>]+>/.test(testSource)) {
  fail("2B.7M tests must not include XML payload literals.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7M offline XSD validator contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7M offline XSD validator contract validation passed.");
