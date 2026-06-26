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
  packageJson.scripts?.["validate:phase2b7o-official-alignment-blocker-report"] !==
  "node scripts/validate-phase2b7o-official-alignment-blocker-report.mjs"
) {
  fail("Missing npm script validate:phase2b7o-official-alignment-blocker-report.");
}

const doc = read("docs/phase2b7o-official-alignment-blocker-report-v1.md");
for (const marker of [
  "PHASE2B7O_OFFICIAL_ALIGNMENT_BLOCKER_REPORT_V1",
  "status: \"blocked\"",
  "containsXml: false",
  "containsSecrets: false",
  "containsRealData: false",
]) {
  if (!doc.includes(marker)) fail(`2B.7O doc missing marker ${marker}.`);
}

const source = read("src/lib/verifactu-official-gates/official-alignment-blocker-report.ts");
for (const marker of [
  "buildOfficialAlignmentBlockerReport",
  "PHASE2B7O_OFFICIAL_ALIGNMENT_BLOCKER_REPORT_V1",
  "status: \"blocked\"",
  "officialAlignedXml: false",
  "offlineXsdValidation: false",
  "qr: false",
  "signature: false",
  "transport: false",
  "production: false",
  "containsXml: false",
  "containsSecrets: false",
  "containsRealData: false",
]) {
  if (!source.includes(marker)) fail(`2B.7O source missing marker ${marker}.`);
}

for (const forbiddenPattern of [
  /<\?xml/i,
  /<RegFactu/i,
  /BEGIN CERTIFICATE/,
  /PRIVATE KEY/,
  /\bpassword\b/i,
  /\btoken\b/i,
  /\bstack\b/i,
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\bnode:http\b/,
  /\bnode:https\b/,
]) {
  if (forbiddenPattern.test(source)) fail(`Forbidden 2B.7O source pattern ${forbiddenPattern}.`);
}

const testSource = read("src/lib/verifactu-official-gates/official-alignment-blocker-report.test.ts");
for (const marker of [
  "JSON.stringify(report)",
  "officialAlignedXml: false",
  "offlineXsdValidation: false",
  "qr: false",
  "signature: false",
  "transport: false",
  "production: false",
]) {
  if (!testSource.includes(marker)) fail(`2B.7O test missing marker ${marker}.`);
}

if (errors.length > 0) {
  console.error("Phase 2B.7O official alignment blocker report validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7O official alignment blocker report validation passed.");
