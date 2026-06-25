import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const validationDir = path.join(root, "src", "lib", "fiscal-payload-validation");
const evidenceDir = path.join(root, "src", "lib", "fiscal-evidence-packet");
const localScript = "scripts/test-phase2b4q-fiscal-evidence-packet-local.mjs";
const localTest = "scripts/phase2b4q-fiscal-evidence-packet-local.test.ts";
const docsFile = "docs/phase2b4p-q-fiscal-payload-validation-evidence-v1.md";
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
const validationFiles = listSourceFiles(validationDir);
const evidenceFiles = listSourceFiles(evidenceDir);
const implementationSource = [...validationFiles, ...evidenceFiles]
  .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const testSource = [...validationFiles, ...evidenceFiles]
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const localSource = `${read(localScript)}\n${read(localTest)}`;
const docs = read(docsFile);

if (!fs.existsSync(validationDir)) errors.push("Missing fiscal payload validation module.");
if (!fs.existsSync(evidenceDir)) errors.push("Missing fiscal evidence packet module.");
if (!read(localScript)) errors.push(`Missing ${localScript}.`);
if (!read(localTest)) errors.push(`Missing ${localTest}.`);
if (!docs) errors.push(`Missing ${docsFile}.`);

if (
  packageJson.scripts?.["validate:phase2b4p-q-fiscal-payload-validation-evidence"] !==
  "node scripts/validate-phase2b4p-q-fiscal-payload-validation-evidence.mjs"
) {
  errors.push("Missing npm script validate:phase2b4p-q-fiscal-payload-validation-evidence.");
}

if (
  packageJson.scripts?.["test:phase2b4q-fiscal-evidence-packet-local"] !==
  "node scripts/test-phase2b4q-fiscal-evidence-packet-local.mjs"
) {
  errors.push("Missing npm script test:phase2b4q-fiscal-evidence-packet-local.");
}

for (const dir of [validationDir, evidenceDir]) {
  for (const expected of ["types.ts", "errors.ts", "index.ts"]) {
    if (!fs.existsSync(path.join(dir, expected))) {
      errors.push(`Missing ${path.relative(root, path.join(dir, expected))}.`);
    }
  }
}

for (const expected of [
  "payload-validator.ts",
  "payload-validator.test.ts",
]) {
  if (!fs.existsSync(path.join(validationDir, expected))) {
    errors.push(`Missing fiscal payload validation ${expected}.`);
  }
}

for (const expected of [
  "evidence-packet-builder.ts",
  "evidence-packet-builder.test.ts",
]) {
  if (!fs.existsSync(path.join(evidenceDir, expected))) {
    errors.push(`Missing fiscal evidence packet ${expected}.`);
  }
}

expectPattern("server-only guard", implementationSource, /assertServerOnlyModule/i);
expectPattern("payload validation function", implementationSource, /validateFiscalPayloadCandidate/);
expectPattern("evidence packet function", implementationSource, /buildFiscalEvidencePacket/);
expectPattern("candidate finality check", implementationSource, /candidate_not_aeat/);
expectPattern("transportable false check", implementationSource, /transportable_invalid|transportable:\s*false/);
expectPattern("non-final XML marker", implementationSource, /FISCAL_PAYLOAD_CANDIDATE_XML_MARKER/);
expectPattern("phase marker", implementationSource, /PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1/);
expectPattern("no full XML evidence flag", implementationSource, /includesFullXml:\s*false/);
expectPattern("no snapshot evidence flag", implementationSource, /includesDocumentSnapshot:\s*false/);

forbidPattern(
  "Supabase client or service role in implementation",
  implementationSource,
  /createClient|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_.*SERVICE_ROLE/i,
);
forbidPattern(
  "database writes in implementation",
  implementationSource,
  /\.from\(|\.rpc\(|\.insert\(|\.delete\(|\.upsert\(/i,
);
forbidPattern(
  "transport table mutation in implementation",
  implementationSource,
  /\b(?:insert|update|delete|upsert)\b[\s\S]{0,120}fiscal_transport_attempts/i,
);
forbidPattern(
  "UI imports in implementation",
  implementationSource,
  /from\s+["']react["']|lucide-react|@\/components|@\/app\//i,
);
forbidPattern(
  "real AEAT endpoint in implementation",
  implementationSource,
  /https?:\/\/[^"'\s]*agenciatributaria|suministro(?:lr)?facturas\s*:/i,
);
forbidPattern(
  "real certificates or signing implementation",
  implementationSource,
  /-----BEGIN CERTIFICATE-----|-----BEGIN PRIVATE KEY-----|crypto\.sign|createSign\(/i,
);
forbidPattern(
  "Stripe/OpenAI/importer implementation",
  implementationSource,
  /stripe|openai|importador|importer/i,
);

for (const expected of [
  "payload candidato valido",
  "alta y anulacion",
  "record_hash_missing",
  "previous_hash_missing",
  "transportable_invalid",
  "finality_invalid",
  "signature_detected",
  "certificate_detected",
  "aeat_endpoint_detected",
  "candidate_xml_unmarked",
  "crea paquete de evidencia valido",
  "payload invalido",
  "transportable",
  "not.toContain(\"<FiscalPayloadCandidate\")",
  "not.toContain(\"documentSnapshot\")",
  "not.toContain(\"service_role\")",
]) {
  if (!testSource.includes(expected)) errors.push(`Tests missing ${expected}.`);
}

for (const expected of [
  "PHASE2B4Q_LOCAL_ACCEPTANCE",
  "assertLocalUrl",
  "fiscal_records",
  "fiscal_chain_state",
  "buildFiscalPayloadCandidate",
  "validateFiscalPayloadCandidate",
  "buildFiscalEvidencePacket",
  "payload_invalid",
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

expectPattern("docs phase marker", docs, /PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1/);
expectPattern("docs validation scope", docs, /validacion semantica/i);
expectPattern("docs evidence scope", docs, /paquete de evidencia/i);
expectPattern("docs no persistence", docs, /no se persiste/i);
expectPattern("docs no production", docs, /No Supabase produccion/i);
expectPattern("docs no final XML", docs, /No XML AEAT definitivo/i);
expectPattern("docs no signing", docs, /No firma/i);
expectPattern("docs no transport", docs, /No transporte AEAT/i);

if (errors.length > 0) {
  console.error("Phase 2B.4P/Q fiscal payload validation evidence failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.4P/Q fiscal payload validation evidence validation passed.");
