import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const migrationFile =
  "supabase/migrations/20260625142000_phase2b4m_fiscal_record_chain_atomicity.sql";
const rollbackFile =
  "supabase/rollbacks/20260625142000_phase2b4m_fiscal_record_chain_atomicity.down.sql";
const docsFile =
  "docs/phase2b4m-fiscal-record-chain-local-staging-atomicity-v1.md";
const packageJsonPath = path.join(root, "package.json");
const errors = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

function listSourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

const migration = read(migrationFile);
const rollback = read(rollbackFile);
const docs = read(docsFile);
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const fiscalRecordSource = listSourceFiles(
  path.join(root, "src", "lib", "fiscal-records"),
);
const implementationSource = fiscalRecordSource
  .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const testsSource = fiscalRecordSource
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

if (!migration) errors.push(`Missing ${migrationFile}.`);
if (!rollback) errors.push(`Missing ${rollbackFile}.`);
if (!docs) errors.push(`Missing ${docsFile}.`);

if (
  packageJson.scripts?.["validate:phase2b4m-fiscal-record-chain-atomicity"] !==
  "node scripts/validate-phase2b4m-fiscal-record-chain-atomicity.mjs"
) {
  errors.push("Missing npm script validate:phase2b4m-fiscal-record-chain-atomicity.");
}

if (
  packageJson.scripts?.["test:phase2b4m-fiscal-record-chain-local"] !==
  "node scripts/test-phase2b4m-fiscal-record-chain-local.mjs"
) {
  errors.push("Missing npm script test:phase2b4m-fiscal-record-chain-local.");
}

const requiredMigrationPatterns = [
  {
    label: "atomic RPC",
    regex: /create\s+or\s+replace\s+function\s+public\.create_fiscal_record_with_chain_local_staging/i,
  },
  { label: "security definer", regex: /security\s+definer/i },
  { label: "empty search path", regex: /set\s+search_path\s*=\s*''/i },
  { label: "service role guard", regex: /auth\.role\(\)\s*<>\s*'service_role'/i },
  {
    label: "public anon authenticated revoke",
    regex:
      /revoke\s+all\s+on\s+function\s+public\.create_fiscal_record_with_chain_local_staging[\s\S]+from\s+public,\s*anon,\s*authenticated/i,
  },
  {
    label: "service role grant",
    regex:
      /grant\s+execute\s+on\s+function\s+public\.create_fiscal_record_with_chain_local_staging[\s\S]+to\s+service_role/i,
  },
  {
    label: "operation loaded by user and operation id",
    regex:
      /from\s+public\.fiscal_operations[\s\S]+where\s+id\s*=\s*p_operation_id[\s\S]+and\s+user_id\s*=\s*p_user_id/i,
  },
  { label: "processing guard", regex: /v_operation\.status\s*<>\s*'processing'/i },
  { label: "chain row insert", regex: /insert\s+into\s+public\.fiscal_chain_state/i },
  { label: "chain row lock", regex: /from\s+public\.fiscal_chain_state[\s\S]+for\s+update/i },
  { label: "fiscal record insert", regex: /insert\s+into\s+public\.fiscal_records/i },
  { label: "chain update", regex: /update\s+public\.fiscal_chain_state/i },
  { label: "record count increment", regex: /v_chain\.record_count\s+\+\s+1/i },
  { label: "last record update", regex: /last_record_id\s*=\s*v_record\.id/i },
  { label: "last hash update", regex: /last_hash\s*=\s*v_record\.record_hash/i },
  { label: "head changed conflict", regex: /record_chain_head_changed/i },
  { label: "non AEAT XML marker", regex: /PHASE2B4M_NO_AEAT_XML_CANDIDATE/ },
];

for (const { label, regex } of requiredMigrationPatterns) {
  if (!regex.test(migration)) errors.push(`Missing migration requirement: ${label}.`);
}

if (!/drop\s+function\s+if\s+exists\s+public\.create_fiscal_record_with_chain_local_staging/i.test(rollback)) {
  errors.push("Rollback does not drop create_fiscal_record_with_chain_local_staging.");
}

const forbiddenMigrationPatterns = [
  {
    label: "transport attempts mutation",
    regex: /\b(?:insert\s+into|update|delete\s+from)\s+public\.fiscal_transport_attempts\b/i,
  },
  {
    label: "AEAT endpoint/XML implementation",
    regex: /suministro(?:lr)?facturas|agenciatributaria|xml_payload\s*:=|<\?xml|<Suministro/i,
  },
  {
    label: "certificate or private key handling",
    regex: /begin certificate|begin private key|private_key|cert_pem|pfx|pkcs12/i,
  },
  {
    label: "Stripe/OpenAI/importer implementation",
    regex: /stripe|openai|importador|importer/i,
  },
];

for (const { label, regex } of forbiddenMigrationPatterns) {
  if (regex.test(migration)) errors.push(`Migration contains forbidden ${label}.`);
}

const requiredSourcePatterns = [
  { label: "chain repository", regex: /FiscalRecordWithChainLocalStagingRepository/ },
  { label: "chain store", regex: /SupabaseFiscalRecordChainLocalStagingStore/ },
  { label: "record candidate build", regex: /buildFiscalRecordCandidate/ },
  { label: "chain link candidate build", regex: /buildFiscalChainLinkCandidate/ },
  { label: "atomic RPC call", regex: /create_fiscal_record_with_chain_local_staging/ },
  { label: "retry conflict", regex: /record_chain_head_changed/ },
  { label: "schema version constant", regex: /phase2b4m-chain-local-staging-v1/ },
];

for (const { label, regex } of requiredSourcePatterns) {
  if (!regex.test(implementationSource)) {
    errors.push(`Missing source requirement: ${label}.`);
  }
}

const forbiddenSourcePatterns = [
  {
    label: "client creation or secret access",
    regex: /createClient|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_.*SERVICE_ROLE/i,
  },
  {
    label: "direct fiscal table write from TS",
    regex: /\.from\(["']fiscal_records["']\)[\s\S]{0,240}\.(?:insert|update|delete|upsert)\(/i,
  },
  {
    label: "chain state mutation from TS",
    regex: /\.from\(["']fiscal_chain_state["']\)[\s\S]{0,240}\.(?:insert|update|delete|upsert)\(/i,
  },
  {
    label: "transport attempts usage",
    regex: /fiscal_transport_attempts/i,
  },
  {
    label: "UI imports",
    regex: /from\s+["']react["']|lucide-react|@\/components|@\/app\//i,
  },
  {
    label: "AEAT/certificate/XML implementation",
    regex: /agenciatributaria|Suministro|<\?xml|private_key|cert_pem|pfx|pkcs12/i,
  },
  {
    label: "Stripe/OpenAI/importer implementation",
    regex: /stripe|openai|importador|importer/i,
  },
];

for (const { label, regex } of forbiddenSourcePatterns) {
  if (regex.test(implementationSource)) {
    errors.push(`Implementation contains forbidden ${label}.`);
  }
}

for (const expected of [
  "record_chain_head_changed",
  "create_fiscal_record_with_chain_local_staging",
  "not.toContain(\"xml\")",
  "not.toContain(\"AEAT\")",
  "reintenta si la cabecera cambia",
]) {
  if (!testsSource.includes(expected)) errors.push(`Tests missing ${expected}.`);
}

if (!/PHASE2B4M_FISCAL_RECORD_CHAIN_LOCAL_STAGING_ATOMICITY_V1/.test(docs)) {
  errors.push("Docs missing phase marker.");
}
if (!/misma transaccion/i.test(docs)) {
  errors.push("Docs missing atomic transaction explanation.");
}
if (!/No Supabase produccion/i.test(docs)) {
  errors.push("Docs missing production exclusion.");
}

if (errors.length > 0) {
  console.error("Phase 2B.4M fiscal record chain atomicity validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.4M fiscal record chain atomicity validation passed.");
