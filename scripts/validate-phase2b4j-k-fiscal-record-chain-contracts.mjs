import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const modules = [
  path.join(root, "src", "lib", "fiscal-records"),
  path.join(root, "src", "lib", "fiscal-chain"),
];
const docsPath = path.join(
  root,
  "docs",
  "phase2b4j-k-fiscal-record-chain-contracts-v1.md",
);
const packageJsonPath = path.join(root, "package.json");
const errors = [];

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

for (const dir of modules) {
  if (!fs.existsSync(dir)) errors.push(`Missing module ${dir}.`);
}

const expectedFiles = [
  "src/lib/fiscal-records/types.ts",
  "src/lib/fiscal-records/errors.ts",
  "src/lib/fiscal-records/record-builder.ts",
  "src/lib/fiscal-records/record-builder.test.ts",
  "src/lib/fiscal-records/index.ts",
  "src/lib/fiscal-chain/types.ts",
  "src/lib/fiscal-chain/errors.ts",
  "src/lib/fiscal-chain/hash-input.ts",
  "src/lib/fiscal-chain/chain-builder.ts",
  "src/lib/fiscal-chain/chain-builder.test.ts",
  "src/lib/fiscal-chain/index.ts",
];

for (const file of expectedFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing ${file}.`);
}

const sourceFiles = modules.flatMap(listFiles);
const source = sourceFiles.map(read).join("\n");
const docs = read(docsPath);
const packageJson = JSON.parse(read(packageJsonPath));

if (!docs) errors.push(`Missing ${docsPath}.`);
if (
  packageJson.scripts?.["validate:phase2b4j-k-fiscal-record-chain-contracts"] !==
  "node scripts/validate-phase2b4j-k-fiscal-record-chain-contracts.mjs"
) {
  errors.push("Missing npm script validate:phase2b4j-k-fiscal-record-chain-contracts.");
}

const requiredPatterns = [
  {
    label: "phase marker",
    regex: /PHASE2B4J_K_FISCAL_RECORD_AND_CHAIN_CONTRACTS_V1/,
    haystack: docs,
  },
  {
    label: "record candidate schema",
    regex: /phase2b4j-record-candidate-v1/,
    haystack: source,
  },
  {
    label: "record type alta mapping",
    regex: /alta_inicial[\s\S]+alta_subsanacion[\s\S]+return "alta"/,
    haystack: source,
  },
  {
    label: "anulacion mapping",
    regex: /anulacion[\s\S]+return "anulacion"/,
    haystack: source,
  },
  {
    label: "hash input marker",
    regex: /PHASE2B4K_HASH_INPUT_CANDIDATE/,
    haystack: source,
  },
  {
    label: "candidate not final hash",
    regex: /candidate_not_final/,
    haystack: source,
  },
  {
    label: "previous hash consistency",
    regex: /assertPreviousHashConsistency/,
    haystack: source,
  },
  {
    label: "stable canonical input",
    regex: /stableStringify/,
    haystack: source,
  },
];

for (const { label, regex, haystack } of requiredPatterns) {
  if (!regex.test(haystack)) errors.push(`Missing ${label}.`);
}

const forbiddenPatterns = [
  {
    label: "Supabase client",
    regex: /@supabase\/supabase-js|createClient|\.rpc\(/i,
  },
  {
    label: "database writes",
    regex:
      /(?:createClient|supabase|\.(?:from|schema)\()[\s\S]{0,160}\.(?:insert|update|delete|upsert)\(/i,
  },
  {
    label: "fiscal records write/table usage in builders",
    regex: /\bfiscal_records\b/i,
  },
  {
    label: "fiscal chain table usage in builders",
    regex: /\bfiscal_chain_state\b/i,
  },
  {
    label: "transport attempts table usage in builders",
    regex: /\bfiscal_transport_attempts\b/i,
  },
  {
    label: "AEAT XML generation",
    regex: /xml_payload|xmlPayload|Suministro|agenciatributaria/i,
  },
  {
    label: "certificate or private key handling",
    regex: /begin certificate|begin private key|private_key|cert_pem|pfx|pkcs12/i,
  },
  {
    label: "UI imports",
    regex: /from\s+["']react["']|lucide-react|@\/components|@\/app\//i,
  },
  {
    label: "production Supabase URL",
    regex: /https:\/\/[a-z0-9-]+\.supabase\.co/i,
  },
  {
    label: "Stripe/OpenAI/importer implementation",
    regex: /stripe|openai|importador|importer/i,
  },
  {
    label: "client service role exposure",
    regex: /NEXT_PUBLIC_.*SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/i,
  },
];

const implementationSource = sourceFiles
  .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
  .map(read)
  .join("\n");

for (const { label, regex } of forbiddenPatterns) {
  if (regex.test(implementationSource)) {
    errors.push(`Implementation contains forbidden ${label}.`);
  }
}

const tests = sourceFiles
  .filter((file) => file.endsWith(".test.ts"))
  .map(read)
  .join("\n");

for (const expected of [
  "operation_not_processing",
  "invoice_identity_missing",
  "document_snapshot_hash_missing",
  "issuer_nif_missing",
  "numserie_missing",
  "fecha_expedicion_missing",
  "previous_hash_missing",
  "previous_hash_not_normalized",
  "not.toContain(\"xml\")",
  "not.toContain(\"AEAT\")",
]) {
  if (!tests.includes(expected)) errors.push(`Tests missing ${expected}.`);
}

if (errors.length > 0) {
  console.error("Phase 2B.4J/K fiscal record and chain contracts validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Phase 2B.4J/K fiscal record and chain contracts validation passed.",
);
