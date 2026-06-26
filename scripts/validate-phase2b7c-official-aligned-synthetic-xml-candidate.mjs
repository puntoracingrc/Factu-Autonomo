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

const doc = read("docs/phase2b7c-official-aligned-synthetic-xml-candidate-v1.md");
if (!doc.includes("BLOCKED_AT_OFFICIAL_ARTIFACT_GATE")) {
  fail("2B.7C must document BLOCKED_AT_OFFICIAL_ARTIFACT_GATE.");
}
if (!doc.includes("no se crea XML alineado")) {
  fail("2B.7C must explicitly state no aligned XML is created.");
}

for (const forbiddenFile of [
  "src/lib/verifactu-official-alignment/xml-candidate.ts",
  "src/lib/verifactu-official-alignment/xml-artifact.ts",
  "src/lib/verifactu-official-alignment/xml-candidate.test.ts",
]) {
  if (fs.existsSync(absolute(forbiddenFile))) {
    fail(`2B.7C is blocked and must not create ${forbiddenFile}.`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (
  packageJson.scripts?.["validate:phase2b7c-official-aligned-synthetic-xml-candidate"] !==
  "node scripts/validate-phase2b7c-official-aligned-synthetic-xml-candidate.mjs"
) {
  fail("Missing npm script validate:phase2b7c-official-aligned-synthetic-xml-candidate.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7C official aligned synthetic XML candidate validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7C official aligned synthetic XML candidate remains blocked as expected.");
