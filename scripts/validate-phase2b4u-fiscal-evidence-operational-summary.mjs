import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const moduleDir = path.join(
  root,
  "src",
  "lib",
  "fiscal-evidence-operational-summary",
);
const localScript =
  "scripts/test-phase2b4u-fiscal-evidence-operational-summary-local.mjs";
const localTest =
  "scripts/phase2b4u-fiscal-evidence-operational-summary.test.ts";
const checkpointFile =
  "docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md";
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
const checkpoint = read(checkpointFile);

if (!fs.existsSync(moduleDir)) {
  errors.push("Missing fiscal evidence operational summary module.");
}
if (!read(localScript)) errors.push(`Missing ${localScript}.`);
if (!read(localTest)) errors.push(`Missing ${localTest}.`);
if (!checkpoint) errors.push(`Missing ${checkpointFile}.`);

if (
  packageJson.scripts?.["validate:phase2b4u-fiscal-evidence-operational-summary"] !==
  "node scripts/validate-phase2b4u-fiscal-evidence-operational-summary.mjs"
) {
  errors.push("Missing npm script validate:phase2b4u-fiscal-evidence-operational-summary.");
}

if (
  packageJson.scripts?.["test:phase2b4u-fiscal-evidence-operational-summary-local"] !==
  "node scripts/test-phase2b4u-fiscal-evidence-operational-summary-local.mjs"
) {
  errors.push("Missing npm script test:phase2b4u-fiscal-evidence-operational-summary-local.");
}

for (const expected of [
  "types.ts",
  "errors.ts",
  "summary-builder.ts",
  "summary-builder.test.ts",
  "supabase-store.ts",
  "supabase-store.test.ts",
  "index.ts",
]) {
  if (!fs.existsSync(path.join(moduleDir, expected))) {
    errors.push(`Missing fiscal evidence operational summary ${expected}.`);
  }
}

for (const { label, regex } of [
  {
    label: "phase marker",
    regex: /PHASE2B4U_FISCAL_EVIDENCE_OPERATIONAL_SUMMARY_CHECKPOINT_V1/,
  },
  { label: "server-only guard", regex: /assertServerOnlyModule/ },
  { label: "summary builder", regex: /FiscalEvidenceOperationalSummaryBuilder/ },
  {
    label: "Supabase summary store",
    regex: /SupabaseFiscalEvidenceOperationalSummaryStore/,
  },
  { label: "evidence packet total", regex: /totalEvidencePackets/ },
  { label: "covered record total", regex: /totalCoveredRecords/ },
  { label: "latest sequence", regex: /latestRecordSequence/ },
  { label: "latest hash", regex: /latestRecordHash/ },
  { label: "valid count", regex: /validEvidenceCount/ },
  { label: "mismatch count", regex: /mismatchEvidenceCount/ },
  { label: "rejected count", regex: /rejectedEvidenceCount/ },
  { label: "unsafe metadata count", regex: /unsafeMetadataEvidenceCount/ },
  { label: "sequence gaps", regex: /hasSequenceGaps/ },
  { label: "transportable flag", regex: /hasTransportableNotFalse/ },
  { label: "full XML or snapshot metadata flag", regex: /hasFullXmlOrSnapshotMetadata/ },
  { label: "transport attempts count", regex: /countFiscalTransportAttempts/ },
  { label: "read evidence table", regex: /fiscal_evidence_packets/ },
  { label: "read transport attempts count", regex: /fiscal_transport_attempts/ },
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
  "transport attempts mutation in implementation",
  implementationSource,
  /\b(?:insert|update|delete|upsert)\b[\s\S]{0,160}fiscal_transport_attempts|\.from\(["']fiscal_transport_attempts["']\)[\s\S]{0,240}\.(?:insert|update|delete|upsert)\(/i,
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
  "crea resumen ok",
  "ultimo registro",
  "gaps",
  "mismatch",
  "rechazos",
  "metadata insegura",
  "transporte",
  "not.toContain(\"document_snapshot\")",
  "not.toContain(\"service_role\")",
]) {
  if (!testSource.includes(expected)) errors.push(`Tests missing ${expected}.`);
}

for (const expected of [
  "PHASE2B4U_LOCAL_ACCEPTANCE",
  "assertLocalUrl",
  '["start"]',
  '["stop"]',
  "FiscalEvidenceOperationalSummaryBuilder",
  "fiscal_evidence_packets",
  "fiscal_transport_attempts",
  "alta, chained alta, anulacion",
  "aggregate counts",
  "latest sequence/hash",
  "safe summary response",
]) {
  if (!localSource.includes(expected)) {
    errors.push(`Local acceptance missing ${expected}.`);
  }
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
  { label: "checkpoint apto local", regex: /APTO PARA CERRAR BLOQUE LOCAL\/STAGING 2B\.4/ },
  { label: "checkpoint no production", regex: /NO APTO PARA PRODUCCION/ },
  { label: "checkpoint no AEAT", regex: /NO APTO PARA AEAT REAL/ },
  { label: "checkpoint no certificates", regex: /NO APTO PARA CERTIFICADOS/ },
  { label: "checkpoint no transport", regex: /NO APTO PARA TRANSPORTE/ },
  { label: "checkpoint no productive VeriFactu", regex: /NO ES VERIFACTU PRODUCTIVO/ },
  { label: "operation fiscal summary", regex: /operacion fiscal/i },
  { label: "processing summary", regex: /processing/i },
  { label: "records summary", regex: /fiscal_records/ },
  { label: "chain summary", regex: /fiscal_chain_state/ },
  { label: "payload candidate summary", regex: /payload candidato/i },
  { label: "semantic validation summary", regex: /validacion semantica/i },
  { label: "evidence packet summary", regex: /evidence packet/i },
  { label: "evidence persistence summary", regex: /evidence persistence/i },
  { label: "evidence integrity summary", regex: /evidence integrity/i },
  { label: "operational summary", regex: /operational summary/i },
  { label: "outside final XML", regex: /XML AEAT definitivo/ },
  { label: "outside QR", regex: /QR definitivo/ },
  { label: "outside signing", regex: /firma/ },
  { label: "outside certificates", regex: /certificados/ },
  { label: "outside transport", regex: /transporte AEAT/ },
]) {
  expectPattern(label, checkpoint, regex);
}

forbidPattern(
  "checkpoint presenting real AEAT compliance",
  checkpoint,
  /habilita\s+cumplimiento\s+AEAT\s+real|VeriFactu\s+productivo\s+activado/i,
);

if (errors.length > 0) {
  console.error("Phase 2B.4U fiscal evidence operational summary validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.4U fiscal evidence operational summary validation passed.");
