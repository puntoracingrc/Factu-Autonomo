import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const migrationsDir = path.join(root, "supabase", "migrations");
const rollbacksDir = path.join(root, "supabase", "rollbacks");

const migrationSuffix = "_phase2b_server_schema_local_staging.sql";
const rollbackSuffix = "_phase2b_server_schema_local_staging.down.sql";

const requiredTables = [
  "server_documents",
  "server_document_versions",
  "document_conflicts",
  "fiscal_operations",
  "fiscal_invoice_identities",
  "fiscal_records",
  "fiscal_chain_state",
  "fiscal_transport_attempts",
];

const requiredViews = [
  "server_documents_safe",
  "fiscal_records_safe",
  "fiscal_transport_attempts_safe",
];

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const errors = [];
const migrationFiles = listFiles(migrationsDir).filter((file) =>
  file.endsWith(migrationSuffix),
);

if (migrationFiles.length !== 1) {
  errors.push(
    `Expected exactly one Phase 2B.2 migration, found ${migrationFiles.length}.`,
  );
}

const migrationFile = migrationFiles[0];
const migrationVersion = migrationFile?.match(/^(\d{14})_/)?.[1];
const rollbackFile = migrationVersion
  ? `${migrationVersion}${rollbackSuffix}`
  : undefined;

if (rollbackFile && !fs.existsSync(path.join(rollbacksDir, rollbackFile))) {
  errors.push(`Missing matching rollback: ${rollbackFile}`);
}

const migrationSql = migrationFile
  ? fs.readFileSync(path.join(migrationsDir, migrationFile), "utf8")
  : "";
const rollbackSql = rollbackFile && fs.existsSync(path.join(rollbacksDir, rollbackFile))
  ? fs.readFileSync(path.join(rollbacksDir, rollbackFile), "utf8")
  : "";

for (const table of requiredTables) {
  const createTable = new RegExp(
    `create\\s+table\\s+public\\.${escapeRegex(table)}\\b`,
    "i",
  );
  const enableRls = new RegExp(
    `alter\\s+table\\s+public\\.${escapeRegex(table)}\\s+enable\\s+row\\s+level\\s+security`,
    "i",
  );
  const dropTable = new RegExp(
    `drop\\s+table\\s+if\\s+exists\\s+public\\.${escapeRegex(table)}\\b`,
    "i",
  );

  if (!createTable.test(migrationSql)) {
    errors.push(`Missing table creation for public.${table}.`);
  }
  if (!enableRls.test(migrationSql)) {
    errors.push(`Missing RLS enable statement for public.${table}.`);
  }
  if (!dropTable.test(rollbackSql)) {
    errors.push(`Rollback does not drop public.${table}.`);
  }
}

for (const view of requiredViews) {
  const createView = new RegExp(
    `create\\s+view\\s+public\\.${escapeRegex(view)}\\b`,
    "i",
  );
  const dropView = new RegExp(
    `drop\\s+view\\s+if\\s+exists\\s+public\\.${escapeRegex(view)}\\b`,
    "i",
  );

  if (!createView.test(migrationSql)) {
    errors.push(`Missing safe view public.${view}.`);
  }
  if (!dropView.test(rollbackSql)) {
    errors.push(`Rollback does not drop safe view public.${view}.`);
  }
}

const requiredConstraints = [
  /unique\s*\(\s*user_id\s*,\s*local_document_id\s*\)/i,
  /unique\s*\(\s*user_id\s*,\s*idempotency_key\s*\)/i,
  /unique\s*\(\s*operation_id\s*\)/i,
  /unique\s*\(\s*user_id\s*,\s*environment\s*,\s*issuer_nif\s*,\s*record_sequence\s*\)/i,
];

for (const constraint of requiredConstraints) {
  if (!constraint.test(migrationSql)) {
    errors.push(`Missing required constraint matching ${constraint}.`);
  }
}

const forbiddenPatterns = [
  {
    label: "forbidden document/record type uniqueness",
    regex: /unique\s*\(\s*user_id\s*,\s*document_id\s*,\s*record_type\s*\)/i,
  },
  {
    label: "authenticated write grant",
    regex: /grant\s+(?:all|insert|update|delete)\b[^;]*\bto\s+authenticated\b/i,
  },
  {
    label: "anon grant",
    regex: /grant\s+(?:all|select|insert|update|delete)\b[^;]*\bto\s+anon\b/i,
  },
  {
    label: "legacy verifactu_records mutation",
    regex: /\b(create|alter|drop)\s+table\s+(?:if\s+exists\s+)?(?:public\.)?verifactu_records\b/i,
  },
  {
    label: "legacy verifactu_chain_state mutation",
    regex: /\b(create|alter|drop)\s+table\s+(?:if\s+exists\s+)?(?:public\.)?verifactu_chain_state\b/i,
  },
  {
    label: "AEAT service endpoint implementation",
    regex: /suministro(?:lr)?facturas|agenciatributaria\.gob\.es\/.*veri/i,
  },
  {
    label: "certificate or private key handling",
    regex: /begin certificate|begin private key|private_key|cert_pem|pfx|pkcs12/i,
  },
  {
    label: "unrelated Stripe/OpenAI implementation",
    regex: /stripe|openai/i,
  },
];

for (const { label, regex } of forbiddenPatterns) {
  if (regex.test(migrationSql)) {
    errors.push(`Migration contains ${label}.`);
  }
}

const forbiddenAuthenticatedColumns = [
  "payload",
  "document_snapshot",
  "pdf_snapshot",
  "xml_payload",
  "response_body",
  "failure_message",
];

for (const column of forbiddenAuthenticatedColumns) {
  const regex = new RegExp(
    `grant\\s+select\\s*\\([^;]*\\b${escapeRegex(column)}\\b[^;]*\\)\\s+on\\s+table\\s+public\\.[a-z_]+\\s+to\\s+authenticated`,
    "i",
  );
  if (regex.test(migrationSql)) {
    errors.push(`Sensitive column ${column} is granted to authenticated.`);
  }
}

if (!/create\s+trigger\s+fiscal_records_prevent_update_delete/i.test(migrationSql)) {
  errors.push("Missing fiscal_records immutability trigger.");
}

if (!/revoke\s+all\s+on\s+function\s+public\.prevent_fiscal_records_mutation\(\)\s+from\s+public,\s*anon,\s*authenticated/i.test(migrationSql)) {
  errors.push("Missing function EXECUTE revoke for fiscal record mutation guard.");
}

if (errors.length > 0) {
  console.error("Phase 2B.2 server schema validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Phase 2B.2 server schema validation passed (${migrationFile}, ${rollbackFile}).`,
);
