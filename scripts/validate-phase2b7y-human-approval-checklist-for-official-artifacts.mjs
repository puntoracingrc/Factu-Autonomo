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

function walk(value, visitor, pathPrefix = "$") {
  visitor(value, pathPrefix);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, `${pathPrefix}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      walk(nested, visitor, `${pathPrefix}.${key}`);
    }
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (
  packageJson.scripts?.["validate:phase2b7y-human-approval-checklist-for-official-artifacts"] !==
  "node scripts/validate-phase2b7y-human-approval-checklist-for-official-artifacts.mjs"
) {
  fail("Missing npm script validate:phase2b7y-human-approval-checklist-for-official-artifacts.");
}

const doc = read("docs/phase2b7y-human-approval-checklist-for-official-artifacts-v1.md");
for (const marker of [
  "PHASE2B7Y_HUMAN_APPROVAL_CHECKLIST_FOR_OFFICIAL_ARTIFACTS_V1",
  "official source verified",
  "checksums recorded",
  "no real certificate used",
  "no operational AEAT call used",
  "approval flags are `false` by default",
]) {
  if (!doc.includes(marker)) fail(`2B.7Y doc missing marker ${marker}.`);
}

const templatePath = "docs/phase2b7y-human-approval-checklist-for-official-artifacts.template.json";
const templateSource = read(templatePath);
if (!templateSource) fail("2B.7Y template JSON is missing.");

let template = null;
try {
  template = JSON.parse(templateSource);
} catch (error) {
  fail(`2B.7Y template JSON could not be parsed: ${error.message}`);
}

if (template) {
  if (template.marker !== "PHASE2B7Y_HUMAN_APPROVAL_CHECKLIST_FOR_OFFICIAL_ARTIFACTS_V1") {
    fail("2B.7Y template marker is wrong.");
  }
  walk(template, (value, pathPrefix) => {
    if (typeof value === "boolean" && value !== false) {
      fail(`2B.7Y template boolean must default false at ${pathPrefix}.`);
    }
    if (typeof value === "string") {
      if (/BEGIN CERTIFICATE|PRIVATE KEY|password|token|secret/i.test(value)) {
        fail(`2B.7Y template contains secret-like text at ${pathPrefix}.`);
      }
      if (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value)) {
        fail(`2B.7Y template contains an absolute path at ${pathPrefix}.`);
      }
    }
  });
  for (const flag of [
    "approvalToCommitOfficialXsdFixtures",
    "approvalToGenerateOfficialXml",
    "approvalToPerformOfficialXsdValidation",
    "approvalToStartQrSignatureOrTransport",
    "approvalToUseProductionVerifactu",
  ]) {
    if (template[flag] !== false) fail(`2B.7Y template must not authorize ${flag}.`);
  }
}

if (errors.length > 0) {
  console.error("Phase 2B.7Y human approval checklist validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7Y human approval checklist validation passed.");
