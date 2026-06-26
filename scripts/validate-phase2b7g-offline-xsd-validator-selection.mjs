import { execFileSync } from "node:child_process";
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

function gitLines(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (
  packageJson.scripts?.["validate:phase2b7g-offline-xsd-validator-selection"] !==
  "node scripts/validate-phase2b7g-offline-xsd-validator-selection.mjs"
) {
  fail("Missing npm script validate:phase2b7g-offline-xsd-validator-selection.");
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

const doc = read("docs/phase2b7g-offline-xsd-validator-selection-v1.md");
for (const marker of [
  "PHASE2B7G_OFFLINE_XSD_VALIDATOR_SELECTION_V1",
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
  "No offline XSD validator is selected",
  "no fake `validateOfficialAlignedSyntheticXmlOffline`",
]) {
  if (!doc.includes(marker)) fail(`2B.7G doc missing marker ${marker}.`);
}

if (fs.existsSync(absolute("src/lib/verifactu-official-validation"))) {
  fail("src/lib/verifactu-official-validation must not exist while validator selection is blocked.");
}

for (const changedPath of [
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
]) {
  const isPhase2C20LocalSyncSchemaPath =
    /^supabase\/migrations\/\d{14}_phase2c20_document_sync_local_schema\.sql$/.test(changedPath) ||
    /^supabase\/rollbacks\/\d{14}_phase2c20_document_sync_local_schema\.down\.sql$/.test(changedPath);
  if (!isPhase2C20LocalSyncSchemaPath && /^supabase\//.test(changedPath)) {
    fail(`Supabase path touched: ${changedPath}.`);
  }
  if (!isPhase2C20LocalSyncSchemaPath && /^supabase\/migrations\//.test(changedPath)) {
    fail(`Migration touched: ${changedPath}.`);
  }
  if (/vida/i.test(changedPath) && !changedPath.startsWith("docs/vida-screenshots-local/")) {
    fail(`ViDA path touched: ${changedPath}.`);
  }
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (/fiscal_transport_attempts/i.test(changedPath)) {
    fail(`Transport path touched: ${changedPath}.`);
  }
}

if (errors.length > 0) {
  console.error("Phase 2B.7G offline XSD validator selection failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7G offline XSD validator selection remains blocked as expected.");
