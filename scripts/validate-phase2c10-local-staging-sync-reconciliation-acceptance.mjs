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

for (const filePath of [
  "scripts/phase2c10-local-staging-sync-reconciliation-acceptance.test.ts",
  "docs/phase2c10-local-staging-sync-reconciliation-acceptance-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const test = read("scripts/phase2c10-local-staging-sync-reconciliation-acceptance.test.ts");
const doc = read("docs/phase2c10-local-staging-sync-reconciliation-acceptance-v1.md");

for (const marker of [
  "PHASE2C10_LOCAL_STAGING_SYNC_RECONCILIATION_ACCEPTANCE_V1",
  "SYNTHETIC_ONLY_",
  "version antigua",
  "snapshotHash",
  "pdfSnapshotHash",
  "cross-user",
  "cross-scope",
]) {
  if (!(`${test}\n${doc}`).includes(marker)) fail(`2C.10 marker missing: ${marker}`);
}

for (const [label, regex] of [
  ["Supabase", /@supabase|createClient\(|supabase\//i],
  ["fetch", /\bfetch\s*\(/],
  ["axios", /\baxios\b/],
  ["http", /node:http|node:https/],
  ["filesystem import", /from ["']node:fs|require\(["']node:fs/],
  ["localStorage", /\blocalStorage\b/],
]) {
  if (regex.test(test)) fail(`Forbidden acceptance pattern: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c10-local-staging-sync-reconciliation-acceptance"]) {
  fail("Missing npm script validate:phase2c10-local-staging-sync-reconciliation-acceptance.");
}

if (errors.length > 0) {
  console.error("Phase 2C.10 local/staging sync reconciliation acceptance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.10 local/staging sync reconciliation acceptance validation passed.");
