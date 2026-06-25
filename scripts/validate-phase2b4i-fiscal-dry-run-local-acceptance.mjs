import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const localScriptPath = path.join(
  root,
  "scripts",
  "test-phase2b4i-fiscal-dry-run-pipeline-local.mjs",
);
const localTestPath = path.join(
  root,
  "scripts",
  "phase2b4i-fiscal-dry-run-pipeline-local.test.ts",
);
const docsPath = path.join(
  root,
  "docs",
  "phase2b4i-fiscal-dry-run-pipeline-local-acceptance-v1.md",
);
const packageJsonPath = path.join(root, "package.json");

const errors = [];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

for (const file of [localScriptPath, localTestPath, docsPath]) {
  if (!fs.existsSync(file)) errors.push(`Missing ${file}.`);
}

const localScript = read(localScriptPath);
const localTest = read(localTestPath);
const docs = read(docsPath);
const packageJson = JSON.parse(read(packageJsonPath));

const scripts = packageJson.scripts ?? {};
if (
  scripts["test:phase2b4i-fiscal-dry-run-local"] !==
  "node scripts/test-phase2b4i-fiscal-dry-run-pipeline-local.mjs"
) {
  errors.push("Missing npm script test:phase2b4i-fiscal-dry-run-local.");
}
if (
  scripts["validate:phase2b4i-fiscal-dry-run-local-acceptance"] !==
  "node scripts/validate-phase2b4i-fiscal-dry-run-local-acceptance.mjs"
) {
  errors.push("Missing npm script validate:phase2b4i-fiscal-dry-run-local-acceptance.");
}

const requiredPatterns = [
  {
    label: "phase marker",
    regex: /PHASE2B4I_FISCAL_DRY_RUN_PIPELINE_LOCAL_ACCEPTANCE_V1/,
    haystack: docs,
  },
  {
    label: "supabase status JSON",
    regex: /supabase",\s*\[\s*"status",\s*"--output",\s*"json"\s*\]/,
    haystack: localScript,
  },
  {
    label: "local API guard",
    regex: /localhost.*127\.0\.0\.1|127\.0\.0\.1.*localhost/s,
    haystack: localScript,
  },
  {
    label: "opt-in local acceptance env",
    regex: /PHASE2B4I_LOCAL_ACCEPTANCE/,
    haystack: localScript + localTest,
  },
  {
    label: "pipeline execution",
    regex: /runFiscalOperationDryRunPipeline/,
    haystack: localTest,
  },
  {
    label: "reserve store",
    regex: /SupabaseFiscalOperationTransactionStore/,
    haystack: localTest,
  },
  {
    label: "processing store",
    regex: /SupabaseFiscalOperationProcessingStore/,
    haystack: localTest,
  },
  {
    label: "complete material case",
    regex: /finality.*preliminary_not_aeat/s,
    haystack: localTest,
  },
  {
    label: "idempotency case",
    regex: /existing_processing/,
    haystack: localTest,
  },
  {
    label: "version conflict case",
    regex: /document_version_conflict/,
    haystack: localTest,
  },
  {
    label: "subsanacion case",
    regex: /alta_subsanacion/,
    haystack: localTest,
  },
  {
    label: "anulacion case",
    regex: /anulacion/,
    haystack: localTest,
  },
];

for (const { label, regex, haystack } of requiredPatterns) {
  if (!regex.test(haystack)) errors.push(`Missing ${label}.`);
}

const joined = `${localScript}\n${localTest}`;
const forbiddenPatterns = [
  {
    label: "remote Supabase URL",
    regex: /https:\/\/[a-z0-9-]+\.supabase\.co/i,
  },
  {
    label: "AEAT endpoint",
    regex: /agenciatributaria|suministro(?:lr)?facturas/i,
  },
  {
    label: "certificate/private key handling",
    regex: /begin certificate|begin private key|private_key|cert_pem|pfx|pkcs12/i,
  },
  {
    label: "Stripe/OpenAI/importer implementation",
    regex: /stripe|openai|importador|importer/i,
  },
  {
    label: "client service role exposure",
    regex: /NEXT_PUBLIC_.*SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/i,
  },
  {
    label: "service role logging",
    regex: /console\.(?:log|error|warn)[^\n]*SERVICE_ROLE/i,
  },
];

for (const { label, regex } of forbiddenPatterns) {
  if (regex.test(joined)) errors.push(`Local acceptance contains forbidden ${label}.`);
}

const forbiddenWrites = [
  "fiscal_records",
  "fiscal_chain_state",
  "fiscal_transport_attempts",
];
for (const table of forbiddenWrites) {
  const writeRegex = new RegExp(
    `\\.from\\(["']${table}["']\\)[\\s\\S]{0,160}\\.(?:insert|update|delete|upsert)\\(`,
    "i",
  );
  if (writeRegex.test(localTest)) {
    errors.push(`Local acceptance writes forbidden table ${table}.`);
  }
  if (!localTest.includes(`"${table}"`)) {
    errors.push(`Local acceptance does not check forbidden table ${table}.`);
  }
}

for (const unsafe of [
  "not.toContain(\"xml\")",
  "not.toContain(\"AEAT\")",
  "not.toContain(\"service_role\")",
  "not.toContain(\"stack\")",
]) {
  if (!localTest.includes(unsafe)) errors.push(`Missing safe response assertion: ${unsafe}.`);
}

if (errors.length > 0) {
  console.error("Phase 2B.4I local acceptance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Phase 2B.4I fiscal dry-run local acceptance validation passed.",
);
