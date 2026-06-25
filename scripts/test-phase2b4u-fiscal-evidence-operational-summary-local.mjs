#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const migrations = [
  {
    functionName: "reserve_fiscal_operation",
    file: "supabase/migrations/20260625070000_phase2b4d_fiscal_operation_transaction_rpc.sql",
  },
  {
    functionName: "mark_fiscal_operation_processing",
    file: "supabase/migrations/20260625093000_phase2b4f_fiscal_operation_processing_rpc.sql",
  },
  {
    functionName: "create_fiscal_record_with_chain_local_staging",
    file: "supabase/migrations/20260625142000_phase2b4m_fiscal_record_chain_atomicity.sql",
  },
  {
    functionName: "create_fiscal_evidence_packet_local_staging",
    file: "supabase/migrations/20260625153000_phase2b4r_fiscal_evidence_packets_local_staging.sql",
  },
];

function fail(message) {
  throw new Error(message);
}

function redact(value) {
  return String(value)
    .replace(/eyJ[a-zA-Z0-9._-]+/g, "[redacted-jwt]")
    .replace(/sb_(?:secret|publishable)_[a-zA-Z0-9._-]+/g, "[redacted-key]")
    .replace(/[a-f0-9]{64}/gi, "[redacted-hex]");
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.error) {
    fail(`${cmd} ${args.join(" ")} failed: ${result.error.message}`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    fail(
      `${cmd} ${args.join(" ")} failed\nSTDOUT:\n${redact(result.stdout)}\nSTDERR:\n${redact(result.stderr)}`,
    );
  }
  return result;
}

function parseJsonFromSupabaseStatus(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) fail("Could not parse supabase status JSON.");
  return JSON.parse(output.slice(start, end + 1));
}

function assertLocalUrl(rawUrl, label) {
  const parsed = new URL(rawUrl);
  if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    fail(`${label} must be local. Refusing ${parsed.hostname}.`);
  }
}

function assertLocalDatabaseUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    fail(`Database URL must be local. Refusing ${parsed.hostname}.`);
  }
}

function loadLocalSupabaseStatus() {
  const statusResult = run("supabase", ["status", "--output", "json"]);
  const status = parseJsonFromSupabaseStatus(statusResult.stdout);
  for (const key of ["API_URL", "DB_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]) {
    if (!status[key]) fail(`Missing local Supabase status field: ${key}`);
  }
  assertLocalUrl(status.API_URL, "Supabase API URL");
  assertLocalDatabaseUrl(status.DB_URL);
  return status;
}

function ensureLocalSupabase() {
  const initial = run("supabase", ["status", "--output", "json"], {
    allowFailure: true,
  });
  if (initial.status === 0) {
    const status = parseJsonFromSupabaseStatus(initial.stdout);
    if (status.API_URL && status.DB_URL) {
      assertLocalUrl(status.API_URL, "Supabase API URL");
      assertLocalDatabaseUrl(status.DB_URL);
      return { status, startedByScript: false };
    }
  }

  run("supabase", ["start"]);
  return { status: loadLocalSupabaseStatus(), startedByScript: true };
}

function psql(dbUrl, args) {
  return run("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", ...args]).stdout;
}

function functionExists(dbUrl, functionName) {
  return (
    psql(dbUrl, [
      "-Atc",
      `select exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = '${functionName}');`,
    ]).trim() === "t"
  );
}

function applySql(dbUrl, file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) fail(`Missing SQL file: ${file}`);
  psql(dbUrl, ["-f", absolute]);
}

function runAcceptance(status) {
  for (const migration of migrations) {
    if (!functionExists(status.DB_URL, migration.functionName)) {
      applySql(status.DB_URL, migration.file);
    }
    if (!functionExists(status.DB_URL, migration.functionName)) {
      fail(`${migration.functionName} does not exist locally.`);
    }
  }

  const vitestBin = path.join(root, "node_modules", ".bin", "vitest");
  const testFile = path.join(
    "scripts",
    "phase2b4u-fiscal-evidence-operational-summary.test.ts",
  );

  run(vitestBin, ["run", testFile], {
    env: {
      ...process.env,
      PHASE2B4U_LOCAL_ACCEPTANCE: "1",
      PHASE2B4U_SUPABASE_URL: status.API_URL,
      PHASE2B4U_SUPABASE_DB_URL: status.DB_URL,
      PHASE2B4U_SUPABASE_ANON_KEY: status.ANON_KEY,
      PHASE2B4U_SUPABASE_ADMIN_KEY: status.SERVICE_ROLE_KEY,
    },
  });
}

let startedByScript = false;

try {
  const local = ensureLocalSupabase();
  startedByScript = local.startedByScript;
  runAcceptance(local.status);

  console.log("Phase 2B.4U fiscal evidence operational summary acceptance passed.");
  console.log("Cases: alta, chained alta, anulacion, aggregate counts, latest sequence/hash, zero transport attempts, safe summary response.");
  console.log("Environment: local Supabase only.");
  console.log(
    startedByScript
      ? "Supabase local was started by this script and will be stopped."
      : "Supabase local was already running and was left as it was.",
  );
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
} finally {
  if (startedByScript) {
    const stop = run("supabase", ["stop"], { allowFailure: true });
    if (stop.status !== 0) {
      console.error(redact(stop.stderr || stop.stdout));
      process.exitCode = 1;
    }
  }
}
