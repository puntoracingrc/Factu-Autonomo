#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);

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
  if (result.status !== 0) {
    fail(
      `${cmd} ${args.join(" ")} failed\nSTDOUT:\n${redact(result.stdout)}\nSTDERR:\n${redact(result.stderr)}`,
    );
  }
  return result.stdout;
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
  const status = parseJsonFromSupabaseStatus(
    run("supabase", ["status", "--output", "json"]),
  );
  for (const key of ["API_URL", "DB_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]) {
    if (!status[key]) fail(`Missing local Supabase status field: ${key}`);
  }
  assertLocalUrl(status.API_URL, "Supabase API URL");
  assertLocalDatabaseUrl(status.DB_URL);
  return status;
}

function main() {
  const status = loadLocalSupabaseStatus();
  const vitestBin = path.join(root, "node_modules", ".bin", "vitest");
  const testFile = path.join(
    "scripts",
    "phase2b4i-fiscal-dry-run-pipeline-local.test.ts",
  );

  run(vitestBin, ["run", testFile], {
    env: {
      ...process.env,
      PHASE2B4I_LOCAL_ACCEPTANCE: "1",
      PHASE2B4I_SUPABASE_URL: status.API_URL,
      PHASE2B4I_SUPABASE_DB_URL: status.DB_URL,
      PHASE2B4I_SUPABASE_ANON_KEY: status.ANON_KEY,
      PHASE2B4I_SUPABASE_ADMIN_KEY: status.SERVICE_ROLE_KEY,
    },
  });

  console.log("Phase 2B.4I fiscal dry-run pipeline local acceptance passed.");
  console.log("Cases: complete dry-run, idempotency, version conflict, already processing, subsanacion, anulacion, forbidden tables, safe response.");
  console.log("Environment: local Supabase only.");
}

try {
  main();
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
}
