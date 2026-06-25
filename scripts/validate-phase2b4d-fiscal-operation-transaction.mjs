import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const migrationsDir = path.join(root, "supabase", "migrations");
const rollbacksDir = path.join(root, "supabase", "rollbacks");
const migrationSuffix = "_phase2b4d_fiscal_operation_transaction_rpc.sql";
const rollbackSuffix = "_phase2b4d_fiscal_operation_transaction_rpc.down.sql";

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

function stripSqlComments(sql) {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

const errors = [];
const migrationFiles = listFiles(migrationsDir).filter((file) =>
  file.endsWith(migrationSuffix),
);

if (migrationFiles.length !== 1) {
  errors.push(
    `Expected exactly one Phase 2B.4D migration, found ${migrationFiles.length}.`,
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
const executableMigrationSql = stripSqlComments(migrationSql);

const requiredPatterns = [
  {
    label: "reserve_fiscal_operation function",
    regex: /create\s+or\s+replace\s+function\s+public\.reserve_fiscal_operation\b/i,
  },
  {
    label: "SECURITY DEFINER",
    regex: /security\s+definer/i,
  },
  {
    label: "empty search_path",
    regex: /set\s+search_path\s*=\s*''/i,
  },
  {
    label: "service_role runtime guard",
    regex: /auth\.role\(\)\s*<>\s*'service_role'/i,
  },
  {
    label: "fiscal_operations insert",
    regex: /insert\s+into\s+public\.fiscal_operations\b/i,
  },
  {
    label: "fiscal_invoice_identities insert",
    regex: /insert\s+into\s+public\.fiscal_invoice_identities\b/i,
  },
  {
    label: "fiscal_operations idempotent conflict handling",
    regex: /on\s+conflict\s*\(\s*user_id\s*,\s*idempotency_key\s*\)\s+do\s+nothing/i,
  },
  {
    label: "identity unique conflict handling",
    regex: /on\s+conflict\s*\(\s*user_id\s*,\s*environment\s*,\s*issuer_nif\s*,\s*numserie\s*,\s*fecha_expedicion\s*\)\s+do\s+nothing/i,
  },
  {
    label: "revoke execute from public anon authenticated",
    regex: /revoke\s+all\s+on\s+function\s+public\.reserve_fiscal_operation\([^;]+from\s+public,\s*anon,\s*authenticated/i,
  },
  {
    label: "grant execute to service_role",
    regex: /grant\s+execute\s+on\s+function\s+public\.reserve_fiscal_operation\([^;]+to\s+service_role/i,
  },
];

for (const { label, regex } of requiredPatterns) {
  if (!regex.test(executableMigrationSql)) {
    errors.push(`Migration missing ${label}.`);
  }
}

const forbiddenExecutablePatterns = [
  {
    label: "fiscal_records write",
    regex: /\b(insert\s+into|update|delete\s+from|create\s+table|alter\s+table|drop\s+table)\s+public\.fiscal_records\b/i,
  },
  {
    label: "fiscal_chain_state write",
    regex: /\b(insert\s+into|update|delete\s+from|create\s+table|alter\s+table|drop\s+table)\s+public\.fiscal_chain_state\b/i,
  },
  {
    label: "fiscal_transport_attempts write",
    regex: /\b(insert\s+into|update|delete\s+from|create\s+table|alter\s+table|drop\s+table)\s+public\.fiscal_transport_attempts\b/i,
  },
  {
    label: "execute grant to anon",
    regex: /grant\s+execute\s+on\s+function\s+public\.reserve_fiscal_operation\([^;]+to\s+anon/i,
  },
  {
    label: "execute grant to authenticated",
    regex: /grant\s+execute\s+on\s+function\s+public\.reserve_fiscal_operation\([^;]+to\s+authenticated/i,
  },
  {
    label: "public execute grant",
    regex: /grant\s+execute\s+on\s+function\s+public\.reserve_fiscal_operation\([^;]+to\s+public/i,
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
    label: "Stripe/OpenAI/importer implementation",
    regex: /stripe|openai|importador|importer/i,
  },
  {
    label: "client service role exposure",
    regex: /NEXT_PUBLIC_.*SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/i,
  },
];

for (const { label, regex } of forbiddenExecutablePatterns) {
  if (regex.test(executableMigrationSql)) {
    errors.push(`Migration contains forbidden ${label}.`);
  }
}

if (!/drop\s+function\s+if\s+exists\s+public\.reserve_fiscal_operation\b/i.test(rollbackSql)) {
  errors.push("Rollback does not drop public.reserve_fiscal_operation.");
}

if (errors.length > 0) {
  console.error("Phase 2B.4D fiscal operation transaction validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Phase 2B.4D fiscal operation transaction validation passed (${migrationFile}, ${rollbackFile}).`,
);
