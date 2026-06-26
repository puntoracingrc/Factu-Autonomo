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
  packageJson.scripts?.["validate:phase2b7n-official-aligned-xml-preflight-gate"] !==
  "node scripts/validate-phase2b7n-official-aligned-xml-preflight-gate.mjs"
) {
  fail("Missing npm script validate:phase2b7n-official-aligned-xml-preflight-gate.");
}

const doc = read("docs/phase2b7n-official-aligned-xml-preflight-gate-v1.md");
for (const marker of [
  "PHASE2B7N_OFFICIAL_ALIGNED_XML_PREFLIGHT_GATE_V1",
  "BLOCKED_XSD_NOT_COMMITTED",
  "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
  "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
  "BLOCKED_OFFICIAL_FIELD_MAPPING_NOT_READY",
]) {
  if (!doc.includes(marker)) fail(`2B.7N doc missing marker ${marker}.`);
}

const source = read("src/lib/verifactu-official-gates/official-xml-preflight-gate.ts");
for (const marker of [
  "evaluateOfficialAlignedXmlPreflight",
  "PHASE2B7N_OFFICIAL_ALIGNED_XML_PREFLIGHT_GATE_V1",
  "canProceedToQr: false",
  "canProceedToSignature: false",
  "canProceedToTransport: false",
  "networkUsed: false",
  "supabaseUsed: false",
  "transportUsed: false",
  "xmlPrinted: false",
  "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
  "BLOCKED_OFFICIAL_FIELD_MAPPING_NOT_READY",
]) {
  if (!source.includes(marker)) fail(`2B.7N source missing marker ${marker}.`);
}
for (const forbiddenPattern of [
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\bnode:http\b/,
  /\bnode:https\b/,
  /@supabase|createClient\(|from ["'][^"']*supabase/i,
  /\bfiscal_transport_attempts\b/i,
  /transportable:\s*true/,
  /BEGIN CERTIFICATE/,
  /PRIVATE KEY/,
]) {
  if (forbiddenPattern.test(source)) fail(`Forbidden 2B.7N source pattern ${forbiddenPattern}.`);
}

const testSource = read("src/lib/verifactu-official-gates/official-xml-preflight-gate.test.ts");
for (const marker of [
  "canSerializeOfficialAlignedXml).toBe(false)",
  "canValidateOfflineXsd).toBe(false)",
  "canProceedToQr).toBe(false)",
  "canProceedToSignature).toBe(false)",
  "canProceedToTransport).toBe(false)",
]) {
  if (!testSource.includes(marker)) fail(`2B.7N test missing assertion ${marker}.`);
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
  if (/\.(?:xml|xsd|pem|p12|pfx|key|crt|cer)$/i.test(changedPath)) {
    fail(`Forbidden artifact path touched: ${changedPath}.`);
  }
}

if (errors.length > 0) {
  console.error("Phase 2B.7N official aligned XML preflight gate validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.7N official aligned XML preflight gate validation passed.");
