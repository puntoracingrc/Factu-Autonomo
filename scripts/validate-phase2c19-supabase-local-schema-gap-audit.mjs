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

const docPath = "docs/phase2c19-supabase-local-schema-gap-audit-v1.md";
if (!fs.existsSync(absolute(docPath))) fail(`Missing ${docPath}.`);

const doc = read(docPath);
for (const marker of [
  "PHASE2C19_SUPABASE_LOCAL_SCHEMA_GAP_AUDIT_V1",
  "server_documents.scope_id",
  "server_documents.payload_hash",
  "server_documents.document_series",
  "server_document_versions.scope_id",
  "document_conflicts.expected_version",
  "No se toca produccion",
]) {
  if (!doc.includes(marker)) fail(`Missing 2C.19 marker: ${marker}.`);
}

for (const [label, regex] of [
  ["secret literal", /\bsecret\b/i],
  ["remote URL", /https?:\/\//],
  ["Vercel", /vercel\.json|\.vercel\//i],
  ["ViDA", /vida/i],
]) {
  if (regex.test(doc)) fail(`Forbidden 2C.19 doc content: ${label}.`);
}

const packageJson = JSON.parse(read("package.json") || "{}");
if (!packageJson.scripts?.["validate:phase2c19-supabase-local-schema-gap-audit"]) {
  fail("Missing npm script validate:phase2c19-supabase-local-schema-gap-audit.");
}

if (errors.length > 0) {
  console.error("Phase 2C.19 Supabase local schema gap audit validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2C.19 Supabase local schema gap audit validation passed.");
