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

function assertExists(relativePath) {
  if (!fs.existsSync(absolute(relativePath))) fail(`Missing ${relativePath}`);
}

const required = [
  "src/lib/document-sync-integrity/types.ts",
  "src/lib/document-sync-integrity/errors.ts",
  "src/lib/document-sync-integrity/sync-policy.ts",
  "src/lib/document-sync-integrity/sync-policy.test.ts",
  "src/lib/document-sync-integrity/index.ts",
];

for (const filePath of required) assertExists(filePath);

const policy = read("src/lib/document-sync-integrity/sync-policy.ts");
const types = read("src/lib/document-sync-integrity/types.ts");
const test = read("src/lib/document-sync-integrity/sync-policy.test.ts");

for (const marker of [
  "PHASE2C2_SERVER_SYNC_INTEGRITY_POLICY_V1",
  "create_draft",
  "update_draft",
  "delete_draft",
  "sync_local_backup",
  "restore_draft_backup",
  "attach_snapshot_reference",
  "preserve_issued_remote",
  "reject_locked_mutation",
  "accepted",
  "rejected",
  "conflict",
  "noop",
]) {
  if (!(`${types}\n${policy}\n${test}`).includes(marker)) {
    fail(`2C.2 marker missing: ${marker}`);
  }
}

const runtime = `${types}\n${read("src/lib/document-sync-integrity/errors.ts")}\n${policy}\n${read("src/lib/document-sync-integrity/index.ts")}`;
for (const [label, regex] of [
  ["Supabase import", /@supabase|createClient\(|supabase\//i],
  ["UI import", /from ["'](?:@\/)?(?:components|app|public)\//i],
  ["fetch", /\bfetch\s*\(/],
  ["axios", /\baxios\b/],
  ["node http", /node:http|node:https/],
  ["remote URL", /https?:\/\//],
  ["localStorage", /\blocalStorage\b/],
]) {
  if (regex.test(runtime)) fail(`Forbidden runtime pattern: ${label}`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c2-server-sync-integrity-policy"]) {
  fail("Missing npm script validate:phase2c2-server-sync-integrity-policy.");
}

if (errors.length > 0) {
  console.error("Phase 2C.2 server sync integrity policy validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.2 server sync integrity policy validation passed.");
