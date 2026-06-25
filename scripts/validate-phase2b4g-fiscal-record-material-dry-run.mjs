import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const moduleDir = path.join(root, "src", "lib", "fiscal-record-material");
const expectedFiles = [
  "errors.ts",
  "index.ts",
  "material-builder.test.ts",
  "material-builder.ts",
  "types.ts",
];

const errors = [];

for (const file of expectedFiles) {
  const fullPath = path.join(moduleDir, file);
  if (!fs.existsSync(fullPath)) errors.push(`Missing ${fullPath}.`);
}

function read(file) {
  const fullPath = path.join(moduleDir, file);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

const builder = read("material-builder.ts");
const test = read("material-builder.test.ts");
const allSource = expectedFiles.map(read).join("\n");

const requiredPatterns = [
  {
    label: "dry-run schema marker",
    regex: /phase2b4g-dry-run-v1/,
  },
  {
    label: "processing status guard",
    regex: /operation\.status\s*!==\s*"processing"/,
  },
  {
    label: "identity missing guard",
    regex: /INVOICE_IDENTITY_MISSING/,
  },
  {
    label: "snapshot hash guard",
    regex: /SNAPSHOT_HASH_MISSING/,
  },
  {
    label: "issuer NIF guard",
    regex: /ISSUER_NIF_MISSING/,
  },
  {
    label: "numserie guard",
    regex: /NUMSERIE_MISSING/,
  },
  {
    label: "fecha expedicion guard",
    regex: /FECHA_EXPEDICION_MISSING/,
  },
  {
    label: "candidate hash input",
    regex: /hashInputCandidate/,
  },
  {
    label: "preliminary finality",
    regex: /preliminary_not_aeat/,
  },
  {
    label: "typed error tests",
    regex: /FiscalRecordMaterialError/,
  },
];

for (const { label, regex } of requiredPatterns) {
  if (!regex.test(allSource)) {
    errors.push(`Dry-run material module missing ${label}.`);
  }
}

const forbiddenPatterns = [
  {
    label: "Supabase client",
    regex: /createClient|@supabase\/supabase-js|\.from\(|\.rpc\(/i,
  },
  {
    label: "database writes",
    regex: /\.(?:insert|update|delete|upsert)\(/i,
  },
  {
    label: "fiscal records table",
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
    label: "production rollout wording in code",
    regex: /homologad|certificad|cumple 100/i,
  },
  {
    label: "client service role exposure",
    regex: /NEXT_PUBLIC_.*SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/i,
  },
];

for (const { label, regex } of forbiddenPatterns) {
  if (regex.test(builder)) {
    errors.push(`Dry-run builder contains forbidden ${label}.`);
  }
}

if (!/not\.toContain\("xml/i.test(test)) {
  errors.push("Dry-run tests do not assert absence of XML fields.");
}

if (!/not\.toContain\("fiscal_records"/i.test(test)) {
  errors.push("Dry-run tests do not assert absence of final fiscal table names.");
}

if (errors.length > 0) {
  console.error("Phase 2B.4G fiscal record material dry-run validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  "Phase 2B.4G fiscal record material dry-run validation passed (src/lib/fiscal-record-material).",
);
