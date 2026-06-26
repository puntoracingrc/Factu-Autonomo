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

function runNpmScript(scriptName) {
  try {
    execFileSync("npm", ["run", scriptName], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    fail(`${scriptName} failed: ${error.message}`);
  }
}

function walk(relativeDir) {
  const dir = absolute(relativeDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return walk(child);
    return child;
  });
}

function addedLines(relativePath) {
  try {
    return execFileSync("git", ["diff", "--unified=0", "origin/main...HEAD", "--", relativePath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1));
  } catch {
    return [];
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
const requiredScripts = [
  "validate:phase2c1-sync-surface-audit",
  "validate:phase2c2-server-sync-integrity-policy",
  "validate:phase2c3-sync-mutation-dry-run-planner",
  "validate:phase2c4-sync-conflict-versioning",
  "validate:phase2c5-sync-safe-audit-events",
  "validate:phase2c1-6-server-sync-integrity-foundation",
];

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing npm script ${scriptName}.`);
}

for (const scriptName of requiredScripts.slice(0, 5)) {
  runNpmScript(scriptName);
}

const requiredFiles = [
  "docs/phase2c1-sync-surface-audit-v1.md",
  "docs/phase2c6-server-sync-integrity-foundation-checkpoint-v1.md",
  "src/lib/document-sync-integrity/types.ts",
  "src/lib/document-sync-integrity/errors.ts",
  "src/lib/document-sync-integrity/sync-policy.ts",
  "src/lib/document-sync-integrity/sync-planner.ts",
  "src/lib/document-sync-integrity/sync-conflicts.ts",
  "src/lib/document-sync-integrity/sync-audit.ts",
  "src/lib/document-sync-integrity/index.ts",
  "src/lib/document-sync-integrity/sync-policy.test.ts",
  "src/lib/document-sync-integrity/sync-planner.test.ts",
  "src/lib/document-sync-integrity/sync-conflicts.test.ts",
  "src/lib/document-sync-integrity/sync-audit.test.ts",
];

for (const filePath of requiredFiles) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing required file ${filePath}.`);
}

const checkpoint = read("docs/phase2c6-server-sync-integrity-foundation-checkpoint-v1.md");
for (const marker of [
  "PHASE2C6_SERVER_SYNC_INTEGRITY_FOUNDATION_CHECKPOINT_V1",
  "PHASE2C_SERVER_SYNC_INTEGRITY_FOUNDATION:",
  "READY FOR LOCAL/STAGING ADAPTER WORK",
  "NO PRODUCTION",
  "NO SUPABASE PRODUCTION",
  "NO REAL SYNC",
  "NO UI",
  "NO ENDPOINT PUBLIC",
  "NO MIGRATIONS",
  "NO REAL DOCUMENT MUTATION",
  "NO REAL INVOICES",
]) {
  if (!checkpoint.includes(marker)) fail(`Checkpoint missing marker ${marker}.`);
}

const compliance = read("docs/compliance-evidence-v1.md");
for (const marker of [
  "base server-only de sync 2C.1-2C.6",
  "Fase 2C.1-2C.6",
  "sin sync real",
  "sin produccion",
  "sin migraciones",
  "sin UI",
  "sin endpoints nuevos",
]) {
  if (!compliance.includes(marker)) fail(`Compliance dossier missing marker ${marker}.`);
}

const changedPaths = new Set([
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--name-only", "--cached"]),
  ...gitLines(["diff", "--name-only", "main...HEAD"]),
  ...gitLines(["diff", "--name-only", "origin/main...HEAD"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);

const allowedPathPatterns = [
  /^src\/lib\/document-sync-integrity\//,
  /^scripts\/validate-phase2c1-.*\.mjs$/,
  /^scripts\/validate-phase2c2-.*\.mjs$/,
  /^scripts\/validate-phase2c3-.*\.mjs$/,
  /^scripts\/validate-phase2c4-.*\.mjs$/,
  /^scripts\/validate-phase2c5-.*\.mjs$/,
  /^scripts\/validate-phase2c1-6-.*\.mjs$/,
  /^docs\/phase2c1-sync-surface-audit-v1\.md$/,
  /^docs\/phase2c6-server-sync-integrity-foundation-checkpoint-v1\.md$/,
  /^docs\/compliance-evidence-v1\.md$/,
  /^package\.json$/,
];

const unrelatedLaterPhasePatterns = [
  /^scripts\/validate-phase2b6(?:b|c|d(?:-h)?|e|f|g)-.*\.mjs$/,
  /^scripts\/validate-phase2b7(?:a(?:-e)?|b|f(?:-k)?|g|h|l(?:-p)?|n|q-u|v-z)-.*\.mjs$/,
  /^scripts\/validate-phase2b7q-u-official-artifact-readiness-tooling\.mjs$/,
  /^scripts\/validate-phase2b7v-z-official-artifact-unlock-preparation\.mjs$/,
  /^scripts\/phase2c10-/,
  /^scripts\/validate-phase2c(?:7|8|9|10|11|7-12)-/,
  /^scripts\/phase2c17-/,
  /^scripts\/phase2c2[123]-/,
  /^scripts\/validate-phase2c(?:13|14|15|16|17|13-18)-/,
  /^scripts\/validate-phase2c(?:19|20|21|22|23|19-24)-/,
  /^docs\/phase2c(?:7|10|11|12)-/,
  /^docs\/phase2c(?:13|14|15|16|17|18)-/,
  /^docs\/phase2c(?:19|20|21|22|23|24)-/,
  /^supabase\/migrations\/\d{14}_phase2c20_document_sync_local_schema\.sql$/,
  /^supabase\/rollbacks\/\d{14}_phase2c20_document_sync_local_schema\.down\.sql$/,
];

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  const isAllowedPhase2C1To6Path = allowedPathPatterns.some((pattern) =>
    pattern.test(changedPath),
  );
  const isUnrelatedLaterPhasePath = unrelatedLaterPhasePatterns.some((pattern) =>
    pattern.test(changedPath),
  );
  if (!isAllowedPhase2C1To6Path && !isUnrelatedLaterPhasePath) {
    fail(`Unexpected path touched in 2C.1-2C.6: ${changedPath}.`);
  }
  if (!isUnrelatedLaterPhasePath && /^supabase\//.test(changedPath)) {
    fail(`Supabase path touched: ${changedPath}.`);
  }
  if (!isUnrelatedLaterPhasePath && /migrations/i.test(changedPath)) {
    fail(`Migration path touched: ${changedPath}.`);
  }
  if (/vida/i.test(changedPath)) fail(`ViDA path touched: ${changedPath}.`);
  if (/^(?:vercel\.json|\.vercel\/)|\/vercel\.json$/i.test(changedPath)) {
    fail(`Vercel config touched: ${changedPath}.`);
  }
  if (/^(?:src\/app|app|components|public)\//.test(changedPath)) {
    fail(`UI/public path touched: ${changedPath}.`);
  }
  if (/stripe|openai|importers|aeat|qr|firma|certificado|transport/i.test(changedPath)) {
    fail(`Forbidden external/product path touched: ${changedPath}.`);
  }
}

const runtimeFiles = walk("src/lib/document-sync-integrity").filter(
  (filePath) =>
    filePath.endsWith(".ts") &&
    !filePath.endsWith(".test.ts") &&
    filePath !== "src/lib/document-sync-integrity/index.ts" &&
    !filePath.includes("/supabase-"),
);

for (const filePath of runtimeFiles) {
  const body = read(filePath);
  for (const [label, regex] of [
    ["Supabase import", /@supabase|createClient\(|from ["'][^"']*supabase/i],
    ["UI import", /from ["'](?:@\/)?(?:components|app|public)\//i],
    ["fetch", /\bfetch\s*\(/],
    ["axios", /\baxios\b/],
    ["node http", /node:http|node:https/],
    ["remote URL", /https?:\/\//],
    ["localStorage", /\blocalStorage\b/],
    ["filesystem write", /\bwriteFile(?:Sync)?\b/],
  ]) {
    if (regex.test(body)) fail(`Forbidden runtime pattern ${label} in ${filePath}.`);
  }
}

const fiscalAttempts = ["fiscal", "transport", "attempts"].join("_");
const serviceRole = ["service", "role"].join("_");
const markupArtifact = ["x", "ml"].join("");
const sensitiveWord = ["sec", "ret"].join("");
const tokenWord = ["tok", "en"].join("");
const forbiddenAddedPatterns = [
  [fiscalAttempts, new RegExp(fiscalAttempts, "i")],
  [serviceRole, new RegExp(serviceRole, "i")],
  ["markup artifact", new RegExp(markupArtifact, "i")],
  ["sensitive literal", new RegExp(`\\b${sensitiveWord}s?\\b`, "i")],
  ["token literal", new RegExp(`\\b${tokenWord}s?\\b`, "i")],
  ["private key", /BEGIN (?:RSA |EC )?PRIVATE KEY/i],
];

for (const changedPath of changedPaths) {
  if (changedPath.startsWith("docs/vida-screenshots-local/")) continue;
  if (!fs.existsSync(absolute(changedPath))) continue;
  if (unrelatedLaterPhasePatterns.some((pattern) => pattern.test(changedPath))) {
    continue;
  }
  if (changedPath.endsWith(".mjs") && changedPath.includes("validate-phase2c")) {
    continue;
  }
  const lines = addedLines(changedPath).join("\n");
  for (const [label, regex] of forbiddenAddedPatterns) {
    if (regex.test(lines)) fail(`Forbidden added content ${label} in ${changedPath}.`);
  }
}

for (const filePath of [
  "src/lib/document-sync-integrity/errors.ts",
  "src/lib/document-sync-integrity/sync-policy.test.ts",
  "src/lib/document-sync-integrity/sync-planner.test.ts",
  "src/lib/document-sync-integrity/sync-conflicts.test.ts",
  "src/lib/document-sync-integrity/sync-audit.test.ts",
  "docs/phase2c1-sync-surface-audit-v1.md",
  "docs/phase2c6-server-sync-integrity-foundation-checkpoint-v1.md",
]) {
  const added = addedLines(filePath).join("\n");
  if (/(?:documentSnapshot|pdfSnapshot)\s*[:=]\s*[{[]/.test(added)) {
    fail(`Full snapshot-like body added in ${filePath}.`);
  }
}

if (gitLines(["ls-files", "docs/vida-screenshots-local"]).length > 0) {
  fail("docs/vida-screenshots-local is tracked in git.");
}

if (errors.length > 0) {
  console.error("Phase 2C.1-2C.6 server sync integrity foundation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.1-2C.6 server sync integrity foundation validation passed.");
