import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const scriptPath = path.join(
  root,
  "scripts",
  "test-phase2b4e-fiscal-operation-rpc-local.mjs",
);

const errors = [];

if (!fs.existsSync(scriptPath)) {
  errors.push("Missing scripts/test-phase2b4e-fiscal-operation-rpc-local.mjs.");
}

const source = fs.existsSync(scriptPath)
  ? fs.readFileSync(scriptPath, "utf8")
  : "";

const requiredPatterns = [
  {
    label: "supabase local status",
    regex: /supabase",\s*\[\s*"status",\s*"--output",\s*"json"\s*\]/,
  },
  {
    label: "local URL guard",
    regex: /localhost.*127\.0\.0\.1|127\.0\.0\.1.*localhost/s,
  },
  {
    label: "anon permission check",
    regex: /expectRpcDenied\(anon/,
  },
  {
    label: "authenticated permission check",
    regex: /expectRpcDenied\(authClient/,
  },
  {
    label: "service role RPC execution",
    regex: /rpc\("reserve_fiscal_operation"/,
  },
  {
    label: "concurrency check",
    regex: /Promise\.all\(/,
  },
  {
    label: "rollback check",
    regex: /applySql\(status\.DB_URL,\s*rollbackFile\)/,
  },
  {
    label: "migration reapply check",
    regex: /applySql\(status\.DB_URL,\s*migrationFile\)/,
  },
];

for (const { label, regex } of requiredPatterns) {
  if (!regex.test(source)) {
    errors.push(`Acceptance script missing ${label}.`);
  }
}

const forbiddenPatterns = [
  {
    label: "production domain",
    regex: /facturacion-autonomos\.app|supabase\.co|vercel\.app/i,
  },
  {
    label: "remote/staging target",
    regex: /STAGING|staging|remote/i,
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
    label: "Stripe/OpenAI/importer usage",
    regex: /stripe|openai|importador|importer/i,
  },
  {
    label: "write to fiscal_records",
    regex: /\.from\(["']fiscal_records["']\)\.(?:insert|update|delete|upsert)/i,
  },
  {
    label: "write to fiscal_chain_state",
    regex: /\.from\(["']fiscal_chain_state["']\)\.(?:insert|update|delete|upsert)/i,
  },
  {
    label: "write to fiscal_transport_attempts",
    regex: /\.from\(["']fiscal_transport_attempts["']\)\.(?:insert|update|delete|upsert)/i,
  },
  {
    label: "secret console output",
    regex: /console\.(?:log|error|warn)\([^)]*(?:SERVICE_ROLE|ANON_KEY|SECRET|TOKEN|JWT|S3_PROTOCOL_ACCESS_KEY_SECRET)/is,
  },
];

for (const { label, regex } of forbiddenPatterns) {
  if (regex.test(source)) {
    errors.push(`Acceptance script contains forbidden ${label}.`);
  }
}

if (errors.length > 0) {
  console.error("Phase 2B.4E local acceptance validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  "Phase 2B.4E local acceptance script validation passed (test-phase2b4e-fiscal-operation-rpc-local.mjs).",
);
