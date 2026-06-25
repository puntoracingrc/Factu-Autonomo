import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const moduleDir = path.join(root, "src", "lib", "fiscal-operation-pipeline");
const expectedFiles = [
  "dry-run-pipeline.test.ts",
  "dry-run-pipeline.ts",
  "errors.ts",
  "index.ts",
  "types.ts",
];

const errors = [];

function read(file) {
  const fullPath = path.join(moduleDir, file);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

for (const file of expectedFiles) {
  if (!fs.existsSync(path.join(moduleDir, file))) {
    errors.push(`Missing ${path.join(moduleDir, file)}.`);
  }
}

const source = expectedFiles.map(read).join("\n");
const pipeline = read("dry-run-pipeline.ts");
const test = read("dry-run-pipeline.test.ts");
const docs = fs.existsSync(
  path.join(root, "docs", "phase2b4h-fiscal-operation-dry-run-pipeline-v1.md"),
)
  ? fs.readFileSync(
      path.join(
        root,
        "docs",
        "phase2b4h-fiscal-operation-dry-run-pipeline-v1.md",
      ),
      "utf8",
    )
  : "";

const requiredPatterns = [
  {
    label: "phase marker",
    regex: /PHASE2B4H_FISCAL_OPERATION_DRY_RUN_PIPELINE_V1/,
    haystack: docs,
  },
  {
    label: "reservation call",
    regex: /reserveFiscalOperation/,
    haystack: pipeline,
  },
  {
    label: "processing call",
    regex: /markFiscalOperationProcessing/,
    haystack: pipeline,
  },
  {
    label: "material dry-run builder",
    regex: /buildFiscalRecordMaterialDryRun/,
    haystack: pipeline,
  },
  {
    label: "safe material summary",
    regex: /hashInputCandidateLength/,
    haystack: source,
  },
  {
    label: "idempotent existing test",
    regex: /ya existe por idempotencia/,
    haystack: test,
  },
  {
    label: "version conflict test",
    regex: /conflicto de version/,
    haystack: test,
  },
  {
    label: "not eligible test",
    regex: /documento no elegible/,
    haystack: test,
  },
];

for (const { label, regex, haystack } of requiredPatterns) {
  if (!regex.test(haystack)) {
    errors.push(`Phase 2B.4H pipeline missing ${label}.`);
  }
}

const forbiddenPipelinePatterns = [
  {
    label: "database writes",
    regex: /\.(?:insert|update|delete|upsert)\(/i,
  },
  {
    label: "final fiscal records table",
    regex: /\bfiscal_records\b/i,
  },
  {
    label: "fiscal chain table",
    regex: /\bfiscal_chain_state\b/i,
  },
  {
    label: "transport attempts table",
    regex: /\bfiscal_transport_attempts\b/i,
  },
  {
    label: "AEAT XML generation",
    regex: /xml_payload|xmlPayload|Suministro|agenciatributaria/i,
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
];

for (const { label, regex } of forbiddenPipelinePatterns) {
  if (regex.test(pipeline)) {
    errors.push(`Pipeline contains forbidden ${label}.`);
  }
}

for (const table of [
  "fiscal_records",
  "fiscal_chain_state",
  "fiscal_transport_attempts",
]) {
  if (!test.includes(`not.toContain("${table}")`)) {
    errors.push(`Tests do not assert absence of ${table}.`);
  }
}

if (!test.includes('not.toContain("xml")')) {
  errors.push("Tests do not assert absence of XML.");
}

if (errors.length > 0) {
  console.error("Phase 2B.4H fiscal operation dry-run pipeline validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Phase 2B.4H fiscal operation dry-run pipeline validation passed (src/lib/fiscal-operation-pipeline).",
);
