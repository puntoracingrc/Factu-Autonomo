import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const moduleDir = path.join(root, "src", "lib", "fiscal-payload-candidate");
const localScript =
  "scripts/test-phase2b4o-fiscal-payload-candidate-local.mjs";
const localTest =
  "scripts/phase2b4o-fiscal-payload-candidate-local.test.ts";
const docsFile =
  "docs/phase2b4n-o-fiscal-payload-candidate-local-acceptance-v1.md";
const packageJsonPath = path.join(root, "package.json");
const errors = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

function listModuleFiles() {
  if (!fs.existsSync(moduleDir)) return [];
  return fs
    .readdirSync(moduleDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => path.join(moduleDir, entry.name))
    .sort();
}

function expectPattern(label, source, regex) {
  if (!regex.test(source)) errors.push(`Missing ${label}.`);
}

function forbidPattern(label, source, regex) {
  if (regex.test(source)) errors.push(`Forbidden ${label}.`);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const moduleFiles = listModuleFiles();
const implementationSource = moduleFiles
  .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const testSource = moduleFiles
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const localScriptSource = read(localScript);
const localTestSource = read(localTest);
const docs = read(docsFile);

if (!fs.existsSync(moduleDir)) errors.push("Missing fiscal payload candidate module.");
if (!localScriptSource) errors.push(`Missing ${localScript}.`);
if (!localTestSource) errors.push(`Missing ${localTest}.`);
if (!docs) errors.push(`Missing ${docsFile}.`);

if (
  packageJson.scripts?.["validate:phase2b4n-o-fiscal-payload-candidate"] !==
  "node scripts/validate-phase2b4n-o-fiscal-payload-candidate.mjs"
) {
  errors.push("Missing npm script validate:phase2b4n-o-fiscal-payload-candidate.");
}

if (
  packageJson.scripts?.["test:phase2b4o-fiscal-payload-candidate-local"] !==
  "node scripts/test-phase2b4o-fiscal-payload-candidate-local.mjs"
) {
  errors.push("Missing npm script test:phase2b4o-fiscal-payload-candidate-local.");
}

for (const expected of [
  "types.ts",
  "errors.ts",
  "payload-builder.ts",
  "payload-builder.test.ts",
  "index.ts",
]) {
  if (!fs.existsSync(path.join(moduleDir, expected))) {
    errors.push(`Missing module file ${expected}.`);
  }
}

expectPattern("server-only guard", implementationSource, /assertServerOnlyModule/i);
expectPattern("payload builder", implementationSource, /buildFiscalPayloadCandidate/);
expectPattern("candidate finality", implementationSource, /candidate_not_aeat/);
expectPattern("non transportable payload", implementationSource, /transportable:\s*false/);
expectPattern(
  "candidate XML marker",
  implementationSource,
  /PHASE2B4N_O_XML_CANDIDATE_NOT_AEAT_FINAL/,
);
expectPattern(
  "phase marker",
  implementationSource,
  /PHASE2B4N_O_FISCAL_PAYLOAD_CANDIDATE_LOCAL_ACCEPTANCE_V1/,
);
expectPattern("chain consistency", implementationSource, /chain_state_inconsistent/);
expectPattern("record hash validation", implementationSource, /record_hash_missing/);

forbidPattern(
  "Supabase client or service role in implementation",
  implementationSource,
  /createClient|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_.*SERVICE_ROLE/i,
);
forbidPattern(
  "database writes in implementation",
  implementationSource,
  /\.from\(|\.rpc\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(/i,
);
forbidPattern(
  "transport table usage in implementation",
  implementationSource,
  /fiscal_transport_attempts/i,
);
forbidPattern(
  "UI imports in implementation",
  implementationSource,
  /from\s+["']react["']|lucide-react|@\/components|@\/app\//i,
);
forbidPattern(
  "AEAT endpoint in implementation",
  implementationSource,
  /agenciatributaria|suministro(?:lr)?facturas|<Suministro/i,
);
forbidPattern(
  "certificates or signing in implementation",
  implementationSource,
  /BEGIN CERTIFICATE|BEGIN PRIVATE KEY|private_key|cert_pem|pfx|pkcs12|XMLSignature|SignedXml/i,
);
forbidPattern(
  "Stripe/OpenAI/importer implementation",
  implementationSource,
  /stripe|openai|importador|importer/i,
);

for (const expected of [
  "construye payload candidato desde registro alta",
  "construye payload candidato desde registro anulacion",
  "recordHash",
  "previousHash",
  "recordSequence",
  "candidate_not_aeat",
  "transportable",
  "record_hash_missing",
  "issuer_nif_missing",
  "numserie_missing",
  "fecha_expedicion_missing",
  "chain_state_inconsistent",
  "not.toContain(\"agenciatributaria\")",
  "not.toContain(\"Signature\")",
  "not.toContain(\"Certificate\")",
]) {
  if (!testSource.includes(expected)) errors.push(`Unit tests missing ${expected}.`);
}

for (const expected of [
  "PHASE2B4O_LOCAL_ACCEPTANCE",
  "assertLocalUrl",
  "fiscal_records",
  "fiscal_chain_state",
  "buildFiscalPayloadCandidate",
  "chain_state_inconsistent",
  "record_hash_missing",
  "fiscal_transport_attempts",
  "not.toContain(\"Suministro\")",
  "not.toContain(\"agenciatributaria\")",
]) {
  if (!localTestSource.includes(expected) && !localScriptSource.includes(expected)) {
    errors.push(`Local acceptance missing ${expected}.`);
  }
}

forbidPattern(
  "production Supabase host in local acceptance",
  `${localScriptSource}\n${localTestSource}`,
  /https:\/\/[^"'\s]+\.supabase\.co/i,
);
forbidPattern(
  "secret literals in local acceptance",
  `${localScriptSource}\n${localTestSource}`,
  /sk-proj|sb_secret_|service_role\s*[:=]\s*["'][^"']+/i,
);
forbidPattern(
  "transport mutation in local acceptance",
  `${localScriptSource}\n${localTestSource}`,
  /\b(?:insert|update|delete|upsert)\b[\s\S]{0,120}fiscal_transport_attempts/i,
);

expectPattern(
  "docs phase marker",
  docs,
  /PHASE2B4N_O_FISCAL_PAYLOAD_CANDIDATE_LOCAL_ACCEPTANCE_V1/,
);
expectPattern("docs persistence decision", docs, /no se persiste/i);
expectPattern("docs immutable records", docs, /inmutabilidad/i);
expectPattern("docs no production", docs, /No Supabase produccion/i);
expectPattern("docs no final XML", docs, /No XML AEAT definitivo/i);
expectPattern("docs no transport", docs, /No transporte AEAT/i);

if (errors.length > 0) {
  console.error("Phase 2B.4N/O fiscal payload candidate validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Phase 2B.4N/O fiscal payload candidate validation passed.");
