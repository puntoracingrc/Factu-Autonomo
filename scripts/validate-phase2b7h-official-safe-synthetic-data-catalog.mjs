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
  packageJson.scripts?.["validate:phase2b7h-official-safe-synthetic-data-catalog"] !==
  "node scripts/validate-phase2b7h-official-safe-synthetic-data-catalog.mjs"
) {
  fail("Missing npm script validate:phase2b7h-official-safe-synthetic-data-catalog.");
}

const doc = read("docs/phase2b7h-official-safe-synthetic-data-catalog-v1.md");
for (const marker of [
  "PHASE2B7H_OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG_V1",
  "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
  "usableForXml: false",
  "value: null",
  "2B.7I and 2B.7J must not be implemented",
]) {
  if (!doc.includes(marker)) fail(`2B.7H doc missing marker ${marker}.`);
}

const catalog = read("src/lib/verifactu-official-alignment/synthetic-data-catalog.ts");
for (const marker of [
  "PHASE2B7H_OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG_V1",
  "OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG",
  "OFFICIAL_SAFE_SYNTHETIC_DATA_GATE",
  "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
  "completeAltaCaseAvailable: false",
  "completeAnulacionCaseAvailable: false",
]) {
  if (!catalog.includes(marker)) fail(`Synthetic data catalog missing marker ${marker}.`);
}
if (/usableForXml:\s*true/.test(catalog)) {
  fail("Synthetic data catalog must not expose XML-usable values while blocked.");
}
if (/source:\s*"(?:official_example|internal_safe_placeholder)"/.test(catalog)) {
  fail("Synthetic data catalog must not claim official or internal safe values while blocked.");
}

const catalogTest = read("src/lib/verifactu-official-alignment/synthetic-data-catalog.test.ts");
if (!catalogTest.includes("officialSafeSyntheticDataForXml()).toEqual([]")) {
  fail("Synthetic data catalog test must assert no XML-usable entries.");
}

for (const changedPath of [
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
]) {
  if (/^supabase\//.test(changedPath)) fail(`Supabase path touched: ${changedPath}.`);
  if (/^supabase\/migrations\//.test(changedPath)) fail(`Migration touched: ${changedPath}.`);
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
  console.error("Phase 2B.7H official safe synthetic data catalog failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7H official safe synthetic data catalog remains blocked as expected.");
