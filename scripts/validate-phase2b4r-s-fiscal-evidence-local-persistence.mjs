import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const migrationFile =
  "supabase/migrations/20260625153000_phase2b4r_fiscal_evidence_packets_local_staging.sql";
const rollbackFile =
  "supabase/rollbacks/20260625153000_phase2b4r_fiscal_evidence_packets_local_staging.down.sql";
const moduleDir = path.join(root, "src", "lib", "fiscal-evidence-persistence");
const localScript =
  "scripts/test-phase2b4s-fiscal-evidence-local-persistence.mjs";
const localTest =
  "scripts/phase2b4s-fiscal-evidence-local-persistence.test.ts";
const docsFile =
  "docs/phase2b4r-s-fiscal-evidence-local-staging-persistence-v1.md";
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

function forbidPattern(label, source, regex) {
  if (regex.test(source)) errors.push(`Forbidden ${label}.`);
}

const migration = read(migrationFile);
const rollback = read(rollbackFile);
const docs = read(docsFile);
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const moduleFiles = listSourceFiles(moduleDir);
const implementationSource = moduleFiles
  .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const testSource = moduleFiles
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const localSource = `${read(localScript)}\n${read(localTest)}`;

if (!migration) errors.push(`Missing ${migrationFile}.`);
if (!rollback) errors.push(`Missing ${rollbackFile}.`);
if (!fs.existsSync(moduleDir)) errors.push("Missing fiscal evidence persistence module.");
if (!read(localScript)) errors.push(`Missing ${localScript}.`);
if (!read(localTest)) errors.push(`Missing ${localTest}.`);
if (!docs) errors.push(`Missing ${docsFile}.`);

if (
  packageJson.scripts?.["validate:phase2b4r-s-fiscal-evidence-local-persistence"] !==
  "node scripts/validate-phase2b4r-s-fiscal-evidence-local-persistence.mjs"
) {
  errors.push("Missing npm script validate:phase2b4r-s-fiscal-evidence-local-persistence.");
}

if (
  packageJson.scripts?.["test:phase2b4s-fiscal-evidence-local-persistence"] !==
  "node scripts/test-phase2b4s-fiscal-evidence-local-persistence.mjs"
) {
  errors.push("Missing npm script test:phase2b4s-fiscal-evidence-local-persistence.");
}

for (const expected of [
  "types.ts",
  "errors.ts",
  "repository.ts",
  "supabase-store.ts",
  "repository.test.ts",
  "supabase-store.test.ts",
  "index.ts",
]) {
  if (!fs.existsSync(path.join(moduleDir, expected))) {
    errors.push(`Missing fiscal evidence persistence ${expected}.`);
  }
}

const requiredMigrationPatterns = [
  {
    label: "separate evidence table",
    regex: /create\s+table\s+if\s+not\s+exists\s+public\.fiscal_evidence_packets/i,
  },
  {
    label: "record unique idempotency",
    regex: /fiscal_evidence_packets_record_unique\s+unique\s*\(\s*record_id\s*\)/i,
  },
  { label: "transportable false check", regex: /check\s*\(\s*transportable\s*=\s*false\s*\)/i },
  {
    label: "internal evidence finality check",
    regex: /evidence_finality\s+text\s+not\s+null\s+check\s*\(\s*evidence_finality\s*=\s*'internal_dry_run_evidence'\s*\)/i,
  },
  {
    label: "xml digest only",
    regex: /xml_candidate_digest\s+text\s+check\s*\(\s*xml_candidate_digest\s+is\s+null\s+or\s+xml_candidate_digest\s+~\s+'\^sha256:/i,
  },
  { label: "metadata safe jsonb", regex: /metadata_safe\s+jsonb\s+not\s+null/i },
  { label: "RLS enabled", regex: /alter\s+table\s+public\.fiscal_evidence_packets\s+enable\s+row\s+level\s+security/i },
  {
    label: "table revoke",
    regex: /revoke\s+all\s+on\s+table\s+public\.fiscal_evidence_packets\s+from\s+public,\s*anon,\s*authenticated/i,
  },
  {
    label: "service role table select",
    regex: /grant\s+select\s+on\s+table\s+public\.fiscal_evidence_packets\s+to\s+service_role/i,
  },
  {
    label: "RPC",
    regex: /create\s+or\s+replace\s+function\s+public\.create_fiscal_evidence_packet_local_staging/i,
  },
  { label: "security definer", regex: /security\s+definer/i },
  { label: "empty search path", regex: /set\s+search_path\s*=\s*''/i },
  { label: "service role guard", regex: /auth\.role\(\)\s*<>\s*'service_role'/i },
  {
    label: "record loaded by user and record id",
    regex:
      /from\s+public\.fiscal_records[\s\S]+where\s+id\s*=\s*p_record_id[\s\S]+and\s+user_id\s*=\s*p_user_id/i,
  },
  {
    label: "chain state validation",
    regex: /from\s+public\.fiscal_chain_state[\s\S]+for\s+update/i,
  },
  {
    label: "evidence insert",
    regex: /insert\s+into\s+public\.fiscal_evidence_packets/i,
  },
  {
    label: "RPC revoke",
    regex:
      /revoke\s+all\s+on\s+function\s+public\.create_fiscal_evidence_packet_local_staging[\s\S]+from\s+public,\s*anon,\s*authenticated/i,
  },
  {
    label: "RPC grant service role",
    regex:
      /grant\s+execute\s+on\s+function\s+public\.create_fiscal_evidence_packet_local_staging[\s\S]+to\s+service_role/i,
  },
];

for (const { label, regex } of requiredMigrationPatterns) {
  if (!regex.test(migration)) errors.push(`Missing migration requirement: ${label}.`);
}

if (!/drop\s+function\s+if\s+exists\s+public\.create_fiscal_evidence_packet_local_staging/i.test(rollback)) {
  errors.push("Rollback does not drop create_fiscal_evidence_packet_local_staging.");
}
if (!/drop\s+table\s+if\s+exists\s+public\.fiscal_evidence_packets/i.test(rollback)) {
  errors.push("Rollback does not drop fiscal_evidence_packets.");
}

const forbiddenMigrationPatterns = [
  {
    label: "transport table creation/drop",
    regex: /\b(?:create|drop)\s+table\b[\s\S]{0,120}public\.fiscal_transport_attempts/i,
  },
  {
    label: "transport attempts mutation",
    regex: /\b(?:insert\s+into|update|delete\s+from|alter\s+table)\s+public\.fiscal_transport_attempts\b/i,
  },
  {
    label: "full XML or snapshot storage column",
    regex: /\b(?:xml_payload|candidate_xml|candidateXml|document_snapshot|pdf_snapshot|payload_document|payloadDocument)\b\s+(?:text|jsonb|xml)\b/i,
  },
  {
    label: "AEAT endpoint/XML implementation",
    regex: /https?:\/\/[^"'\s]*agenciatributaria|<\?xml|<Suministro|suministro(?:lr)?facturas\s*:/i,
  },
  {
    label: "certificate or private key handling",
    regex: /-----BEGIN CERTIFICATE-----|-----BEGIN PRIVATE KEY-----|private_key\s+|cert_pem|pfx|pkcs12/i,
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
  { label: "server-only guard", regex: /assertServerOnlyModule/i },
  {
    label: "repository class",
    regex: /FiscalEvidencePersistenceRepository/,
  },
  {
    label: "supabase store",
    regex: /SupabaseFiscalEvidencePersistenceStore/,
  },
  {
    label: "RPC call",
    regex: /create_fiscal_evidence_packet_local_staging/,
  },
  {
    label: "phase marker",
    regex: /PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1/,
  },
  {
    label: "safe metadata false flags",
    regex: /includesFullXml:\s*false[\s\S]+includesDocumentMaterial:\s*false[\s\S]+signed:\s*false/i,
  },
  {
    label: "transportable false",
    regex: /transportable:\s*false/,
  },
];

for (const { label, regex } of requiredSourcePatterns) {
  if (!regex.test(implementationSource)) {
    errors.push(`Missing source requirement: ${label}.`);
  }
}

const forbiddenSourcePatterns = [
  {
    label: "client creation or secret access",
    regex: /createClient|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_.*SERVICE_ROLE|process\.env/i,
  },
  {
    label: "direct table writes from TS",
    regex: /\.from\(["']fiscal_(?:evidence_packets|records|chain_state|transport_attempts)["']\)[\s\S]{0,240}\.(?:insert|update|delete|upsert)\(/i,
  },
  {
    label: "UI imports",
    regex: /from\s+["']react["']|lucide-react|@\/components|@\/app\//i,
  },
  {
    label: "AEAT endpoint/XML implementation",
    regex: /https?:\/\/[^"'\s]*agenciatributaria|<\?xml|<Suministro|suministro(?:lr)?facturas/i,
  },
  {
    label: "certificate or signing implementation",
    regex: /-----BEGIN CERTIFICATE-----|-----BEGIN PRIVATE KEY-----|crypto\.sign|createSign\(|SignedXml|XMLSignature|private_key|cert_pem|pfx|pkcs12/i,
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
  "persiste un paquete de evidencia interno",
  "devuelve existing",
  "payload_validation_not_valid",
  "record_packet_mismatch",
  "chain_state_inconsistent",
  "not.toContain(\"<FiscalPayloadCandidate\")",
  "not.toContain(\"documentSnapshot\")",
  "not.toContain(\"service_role\")",
  "not.toContain(\"fiscal_transport_attempts\")",
]) {
  if (!testSource.includes(expected)) errors.push(`Unit tests missing ${expected}.`);
}

for (const expected of [
  "PHASE2B4S_LOCAL_ACCEPTANCE",
  "assertLocalUrl",
  "fiscal_records",
  "fiscal_chain_state",
  "fiscal_evidence_packets",
  "buildFiscalPayloadCandidate",
  "validateFiscalPayloadCandidate",
  "buildFiscalEvidencePacket",
  "FiscalEvidencePersistenceRepository",
  "payload_validation_not_valid",
  "fiscal_transport_attempts",
]) {
  if (!localSource.includes(expected)) errors.push(`Local acceptance missing ${expected}.`);
}

forbidPattern(
  "production Supabase host in local acceptance",
  localSource,
  /https:\/\/[^"'\s]+\.supabase\.co/i,
);
forbidPattern(
  "secret literals in local acceptance",
  localSource,
  /sk-proj|sb_secret_|service_role\s*[:=]\s*["'][^"']+/i,
);
forbidPattern(
  "transport mutation in local acceptance",
  localSource,
  /\b(?:insert|update|delete|upsert)\b[\s\S]{0,120}fiscal_transport_attempts/i,
);

for (const { label, regex } of [
  {
    label: "docs phase marker",
    regex: /PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1/,
  },
  { label: "docs separated persistence", regex: /tabla propia/i },
  { label: "docs table", regex: /fiscal_evidence_packets/ },
  { label: "docs RPC", regex: /create_fiscal_evidence_packet_local_staging/ },
  { label: "docs no production", regex: /No Supabase produccion/i },
  { label: "docs no final XML", regex: /No XML AEAT definitivo/i },
  { label: "docs no signing", regex: /No firma/i },
  { label: "docs no transport", regex: /No transporte AEAT/i },
  { label: "docs no transport attempts", regex: /No `fiscal_transport_attempts`/ },
]) {
  if (!regex.test(docs)) errors.push(`Missing ${label}.`);
}

if (errors.length > 0) {
  console.error("Phase 2B.4R/S fiscal evidence local persistence validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.4R/S fiscal evidence local persistence validation passed.");
