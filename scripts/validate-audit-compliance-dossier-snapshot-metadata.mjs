import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const metadataPath = path.join(root, "docs/audit/compliance-dossier-snapshot-metadata-v1.json");
const policyPath = path.join(root, "docs/audit/compliance-dossier-snapshot-policy-v1.md");
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!fs.existsSync(path.join(root, "docs/compliance-evidence-v1.md"))) {
  fail("Missing canonical compliance dossier.");
}
if (!fs.existsSync(metadataPath)) fail("Missing snapshot metadata JSON.");
if (!fs.existsSync(policyPath)) fail("Missing snapshot policy document.");

const metadata = fs.existsSync(metadataPath)
  ? JSON.parse(fs.readFileSync(metadataPath, "utf8"))
  : {};
const policy = fs.existsSync(policyPath) ? fs.readFileSync(policyPath, "utf8") : "";

for (const [field, expected] of [
  ["snapshotVersion", "compliance-dossier-snapshot-v1"],
  ["sourceDocument", "docs/compliance-evidence-v1.md"],
  ["generatedFrom", "markdown"],
  ["status", "technical_internal_evidence"],
]) {
  if (metadata[field] !== expected) fail(`Unexpected metadata ${field}.`);
}

for (const field of [
  "productionComplianceClaim",
  "externalCertificationClaim",
  "aeatValidationClaim",
  "productiveVerifactuClaim",
  "publicEndpointClaim",
]) {
  if (metadata[field] !== false) fail(`${field} must be false.`);
}

for (const limit of [
  "not_a_certification",
  "not_aeat_validation",
  "not_productive_compliance",
  "not_external_legal_review",
  "not_tax_advice",
]) {
  if (!metadata.limits?.includes(limit)) fail(`Missing metadata limit ${limit}.`);
}

for (const required of [
  "Markdown source",
  "not replace the Markdown source",
  "not_a_certification",
  "not_aeat_validation",
  "not_productive_compliance",
]) {
  if (!policy.includes(required)) fail(`Snapshot policy missing ${required}.`);
}

if (errors.length > 0) {
  console.error("Audit snapshot metadata validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Audit snapshot metadata validation passed.");
