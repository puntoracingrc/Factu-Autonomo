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
  "src/lib/document-sync-integrity/sync-report.ts",
  "src/lib/document-sync-integrity/sync-report.test.ts",
  "docs/phase2c11-local-staging-sync-safe-report-v1.md",
]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const runtime = read("src/lib/document-sync-integrity/sync-report.ts");
const body = `${runtime}\n${read("src/lib/document-sync-integrity/sync-report.test.ts")}\n${read("docs/phase2c11-local-staging-sync-safe-report-v1.md")}`;

for (const marker of [
  "PHASE2C11_LOCAL_STAGING_SYNC_SAFE_REPORT_V1",
  "buildDocumentSyncSafeReport",
  "totalDrafts",
  "totalProtected",
  "totalConflicts",
  "latestVersion",
  "rejectedReasons",
  "safeSummaries",
]) {
  if (!body.includes(marker)) fail(`2C.11 marker missing: ${marker}`);
}

for (const [label, regex] of [
  ["Supabase", /@supabase|createClient\(|supabase\//i],
  ["fetch", /\bfetch\s*\(/],
  ["axios", /\baxios\b/],
  ["http", /node:http|node:https/],
  ["filesystem import", /from ["']node:fs|require\(["']node:fs/],
  ["localStorage", /\blocalStorage\b/],
]) {
  if (regex.test(runtime)) fail(`Forbidden report runtime pattern: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c11-local-staging-sync-safe-report"]) {
  fail("Missing npm script validate:phase2c11-local-staging-sync-safe-report.");
}

if (errors.length > 0) {
  console.error("Phase 2C.11 local/staging sync safe report validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.11 local/staging sync safe report validation passed.");
