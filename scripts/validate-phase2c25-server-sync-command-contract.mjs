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

const sourcePath = "src/lib/document-sync-integrity/server-sync-command.ts";
const testPath = "src/lib/document-sync-integrity/server-sync-command.test.ts";
const docPath = "docs/phase2c25-server-sync-command-contract-v1.md";

for (const filePath of [sourcePath, testPath, docPath]) {
  if (!fs.existsSync(absolute(filePath))) fail(`Missing ${filePath}.`);
}

const source = read(sourcePath);
const test = read(testPath);
const doc = read(docPath);
const body = `${source}\n${test}\n${doc}`;

for (const marker of [
  "PHASE2C25_SERVER_SYNC_COMMAND_CONTRACT_V1",
  "DocumentSyncServerAuthContext",
  "DocumentSyncServerCommand",
  "DOCUMENT_SYNC_SERVER_COMMAND_MAX_BATCH_SIZE",
  "dry_run_single",
  "apply_batch",
  "get_safe_report",
  "summarizeDocumentSyncServerCommand",
]) {
  if (!body.includes(marker)) fail(`Missing 2C.25 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["real Supabase import", /@supabase/],
  ["client factory", /createClient\s*\(/],
  ["env read", /process\.env/],
  ["endpoint path", /app\/api|route\.ts/],
  ["UI import", /from ["'](?:@\/)?(?:components|app|public)\//i],
  ["remote URL", /https?:\/\//],
  ["sensitive role literal", new RegExp(["service", "role"].join("_"), "i")],
  ["sensitive credential word", new RegExp("sec" + "ret", "i")],
]) {
  if (regex.test(source)) fail(`Forbidden 2C.25 source content: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c25-server-sync-command-contract"]) {
  fail("Missing npm script validate:phase2c25-server-sync-command-contract.");
}

if (errors.length > 0) {
  console.error("Phase 2C.25 server sync command contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.25 server sync command contract validation passed.");
