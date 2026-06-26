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

function checkChangedPath(changedPath) {
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
  if (/\.(?:xml|pem|p12|pfx|key|crt|cer)$/i.test(changedPath)) {
    fail(`Forbidden tracked artifact path: ${changedPath}.`);
  }
  if (/^test\/fixtures\/verifactu-official-artifacts\/.*\.(?:pdf|xlsx)$/i.test(changedPath)) {
    fail(`Forbidden official binary fixture: ${changedPath}.`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (
  packageJson.scripts?.["validate:phase2b7f-official-artifact-offline-fixture-policy"] !==
  "node scripts/validate-phase2b7f-official-artifact-offline-fixture-policy.mjs"
) {
  fail("Missing npm script validate:phase2b7f-official-artifact-offline-fixture-policy.");
}

const doc = read("docs/phase2b7f-official-artifact-offline-fixture-policy-v1.md");
for (const marker of [
  "PHASE2B7F_OFFICIAL_ARTIFACT_OFFLINE_FIXTURE_POLICY_V1",
  "BLOCKED_XSD_NOT_COMMITTED",
  "SuministroLR.xsd",
  "SuministroInformacion.xsd",
  "cbdac8d427cc5ab5d77ca48974cab0f35d6bb819c4c66db361681e3710aeba36",
  "ee4c1655175644de44c4c25055ffeb8e5f4bb4bc3834ce8254d4222ef18c8aa1",
  "No PDF or XLSX official artifact is committed",
]) {
  if (!doc.includes(marker)) fail(`2B.7F doc missing marker ${marker}.`);
}

const manifest = read("src/lib/verifactu-official-alignment/artifact-manifest.ts");
for (const marker of [
  "PHASE2B7F_K_OFFLINE_XSD_VALIDATION_GATE_V1",
  "BLOCKED_XSD_NOT_COMMITTED",
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
  "xsdFixturesCommitted: false",
]) {
  if (!manifest.includes(marker)) fail(`Manifest missing 2B.7F-K marker ${marker}.`);
}

for (const changedPath of [
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
]) {
  checkChangedPath(changedPath);
}

for (const trackedPath of gitLines(["ls-files", "test/fixtures/verifactu-official-artifacts"])) {
  if (/\.(?:xsd|xml|pdf|xlsx)$/i.test(trackedPath)) {
    fail(`No official artifact fixture should be tracked while 2B.7F is blocked: ${trackedPath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2B.7F official offline artifact fixture policy failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7F official offline artifact fixture policy remains blocked as expected.");
