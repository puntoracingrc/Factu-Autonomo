import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const moduleDir = path.join(root, "src", "lib", "fiscal-evidence-integrity");
const localScript =
  "scripts/test-phase2b4t-fiscal-evidence-read-integrity-local.mjs";
const localTest =
  "scripts/phase2b4t-fiscal-evidence-read-integrity.test.ts";
const docsFile = "docs/phase2b4t-fiscal-evidence-read-integrity-v1.md";
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

function expectPattern(label, source, regex) {
  if (!regex.test(source)) errors.push(`Missing ${label}.`);
}

function forbidPattern(label, source, regex) {
  if (regex.test(source)) errors.push(`Forbidden ${label}.`);
}

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
const docs = read(docsFile);

if (!fs.existsSync(moduleDir)) errors.push("Missing fiscal evidence integrity module.");
if (!read(localScript)) errors.push(`Missing ${localScript}.`);
if (!read(localTest)) errors.push(`Missing ${localTest}.`);
if (!docs) errors.push(`Missing ${docsFile}.`);

if (
  packageJson.scripts?.["validate:phase2b4t-fiscal-evidence-read-integrity"] !==
  "node scripts/validate-phase2b4t-fiscal-evidence-read-integrity.mjs"
) {
  errors.push("Missing npm script validate:phase2b4t-fiscal-evidence-read-integrity.");
}

if (
  packageJson.scripts?.["test:phase2b4t-fiscal-evidence-read-integrity-local"] !==
  "node scripts/test-phase2b4t-fiscal-evidence-read-integrity-local.mjs"
) {
  errors.push("Missing npm script test:phase2b4t-fiscal-evidence-read-integrity-local.");
}

for (const expected of [
  "types.ts",
  "errors.ts",
  "integrity-checker.ts",
  "integrity-checker.test.ts",
  "supabase-store.ts",
  "supabase-store.test.ts",
  "index.ts",
]) {
  if (!fs.existsSync(path.join(moduleDir, expected))) {
    errors.push(`Missing fiscal evidence integrity ${expected}.`);
  }
}

for (const { label, regex } of [
  { label: "phase marker", regex: /PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1/ },
  { label: "server-only guard", regex: /assertServerOnlyModule/ },
  { label: "integrity checker", regex: /FiscalEvidenceIntegrityChecker/ },
  { label: "Supabase read store", regex: /SupabaseFiscalEvidenceIntegrityStore/ },
  { label: "evidence read", regex: /findEvidencePackets/ },
  { label: "record read", regex: /findFiscalRecord/ },
  { label: "chain read", regex: /findFiscalChainState/ },
  { label: "valid status", regex: /"valid"/ },
  { label: "missing_record status", regex: /"missing_record"/ },
  { label: "missing_chain status", regex: /"missing_chain"/ },
  { label: "mismatch status", regex: /"mismatch"/ },
  { label: "unsafe_metadata status", regex: /"unsafe_metadata"/ },
  { label: "rejected status", regex: /"rejected"/ },
  { label: "transportable false check", regex: /transportable[^\n]+false/ },
  { label: "internal dry-run finality", regex: /internal_dry_run_evidence/ },
  { label: "xml digest required", regex: /xml_candidate_digest_missing/ },
  { label: "safe metadata normalization", regex: /normalizedMetadata/ },
]) {
  expectPattern(label, implementationSource, regex);
}

forbidPattern(
  "client creation or secret env access in implementation",
  implementationSource,
  /createClient|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_.*SERVICE_ROLE|process\.env/i,
);
forbidPattern(
  "database writes in implementation",
  implementationSource,
  /\.(?:insert|update|delete|upsert)\(/i,
);
forbidPattern(
  "RPC transport or write path in implementation",
  implementationSource,
  /\.rpc\(|\.from\(["']fiscal_transport_attempts["']\)/i,
);
forbidPattern(
  "UI imports in implementation",
  implementationSource,
  /from\s+["']react["']|lucide-react|@\/components|@\/app\//i,
);
forbidPattern(
  "real AEAT endpoint or final XML implementation",
  implementationSource,
  /https?:\/\/[^"'\s]*agenciatributaria|<\?xml|<Suministro|suministro(?:lr)?facturas/i,
);
forbidPattern(
  "certificate or signing implementation",
  implementationSource,
  /-----BEGIN CERTIFICATE-----|-----BEGIN PRIVATE KEY-----|crypto\.sign|createSign\(|SignedXml|XMLSignature|private_key\s*=|cert_pem\s*=|pfx\s*=|pkcs12\s*=/i,
);
forbidPattern(
  "Stripe, OpenAI, importer, or customer AI implementation",
  implementationSource,
  /\bstripe\b|openai|@\/lib\/importers|@\/lib\/customer-ai|@\/lib\/expense-scan/i,
);

for (const expected of [
  "devuelve valid",
  "record_hash",
  "previous_hash",
  "missing_record",
  "missing_chain",
  "unsafe_metadata",
  "transportable_not_false",
  "xml_candidate_digest_missing",
  "not.toContain(\"document_snapshot\")",
  "not.toContain(\"service_role\")",
  "not.toContain(\"fiscal_transport_attempts\")",
]) {
  if (!testSource.includes(expected)) errors.push(`Tests missing ${expected}.`);
}

for (const expected of [
  "PHASE2B4T_LOCAL_ACCEPTANCE",
  "assertLocalUrl",
  "fiscal_evidence_packets",
  "fiscal_records",
  "fiscal_chain_state",
  "fiscal_transport_attempts",
  "FiscalEvidenceIntegrityChecker",
  "record hash mismatch",
  "previous hash mismatch",
  "missing record",
  "missing chain",
  "unsafe metadata",
  "transportable rejection",
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
forbidPattern(
  "AEAT endpoint/XML/signing in local acceptance",
  localSource,
  /https?:\/\/[^"'\s]*agenciatributaria|<\?xml|<Suministro|crypto\.sign|createSign\(/i,
);

for (const { label, regex } of [
  { label: "docs phase marker", regex: /PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1/ },
  { label: "docs objective", regex: /lectura/i },
  { label: "docs integrity design", regex: /integridad/i },
  { label: "docs possible results", regex: /valid[\s\S]+missing_record[\s\S]+missing_chain[\s\S]+mismatch[\s\S]+unsafe_metadata[\s\S]+rejected/i },
  { label: "docs local Supabase tests", regex: /Supabase local/i },
  { label: "docs read tables", regex: /fiscal_evidence_packets[\s\S]+fiscal_records[\s\S]+fiscal_chain_state/i },
  { label: "docs no production", regex: /No Supabase produccion/i },
  { label: "docs no staging remote", regex: /No staging remoto/i },
  { label: "docs no AEAT", regex: /No AEAT real/i },
  { label: "docs no certificates", regex: /No certificados reales/i },
  { label: "docs no final XML", regex: /No XML AEAT definitivo/i },
  { label: "docs no signing", regex: /No firma/i },
  { label: "docs no transport", regex: /No transporte AEAT/i },
  { label: "docs no production VeriFactu", regex: /No VeriFactu productivo/i },
]) {
  expectPattern(label, docs, regex);
}

forbidPattern(
  "docs presenting real AEAT compliance",
  docs,
  /habilita\s+cumplimiento\s+AEAT\s+real|VeriFactu\s+productivo\s+activado/i,
);

if (errors.length > 0) {
  console.error("Phase 2B.4T fiscal evidence read integrity validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.4T fiscal evidence read integrity validation passed.");
