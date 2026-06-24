#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

function fail(message) {
  throw new Error(message);
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
      `${cmd} ${args.join(" ")} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );
  }
  return result.stdout.trim();
}

function parseEnv(source) {
  const result = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

function requireStatusEnv(statusEnv, name) {
  const value = statusEnv[name];
  if (!value) fail(`Supabase local status did not expose ${name}.`);
  return value;
}

function assertLocalUrl(value, label) {
  const url = new URL(value);
  if (!localHosts.has(url.hostname)) {
    fail(`${label} must point to localhost/127.0.0.1, got ${url.hostname}.`);
  }
}

function assertNoProductionEnv(statusEnv) {
  const apiUrl = requireStatusEnv(statusEnv, "API_URL");
  const dbUrl = requireStatusEnv(statusEnv, "DB_URL");
  assertLocalUrl(apiUrl, "API_URL");
  assertLocalUrl(dbUrl, "DB_URL");

  if (process.env.NEXT_PUBLIC_SERVER_DOCUMENT_INGEST_ROUTE_ENABLED) {
    fail("Refusing run: NEXT_PUBLIC_SERVER_DOCUMENT_INGEST_ROUTE_ENABLED is set.");
  }
  if (process.env.SERVER_DOCUMENT_INGEST_ROUTE_ENABLED) {
    fail("Refusing run: SERVER_DOCUMENT_INGEST_ROUTE_ENABLED must be set only by this script.");
  }
}

function assertTablesExist(databaseUrl) {
  const sql = `
    select string_agg(missing_table, ', ' order by missing_table)
    from (
      values
        ('public.server_documents'),
        ('public.server_document_versions'),
        ('public.document_conflicts')
    ) as expected(missing_table)
    where to_regclass(expected.missing_table) is null;
  `;
  const missing = run("psql", [
    databaseUrl,
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    sql,
  ]);
  if (missing) {
    fail(`Missing Phase 2B.2 local tables: ${missing}.`);
  }
}

function runAcceptance(statusEnv) {
  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: requireStatusEnv(statusEnv, "ANON_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: requireStatusEnv(statusEnv, "API_URL"),
    PHASE2B3H_INGEST_LOCAL_ENABLED: "true",
    SERVER_DOCUMENT_INGEST_ROUTE_ENABLED: "true",
    SUPABASE_SERVICE_ROLE_KEY: requireStatusEnv(statusEnv, "SERVICE_ROLE_KEY"),
  };

  const result = spawnSync(
    "npx",
    [
      "vitest",
      "run",
      "src/app/api/server-documents/ingest/route.local-acceptance.test.ts",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env,
      stdio: "inherit",
    },
  );

  if (result.error) {
    fail(`vitest local ingest acceptance failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail("vitest local ingest acceptance failed.");
  }
}

const statusOutput = run("supabase", ["status", "-o", "env"]);
const statusEnv = parseEnv(statusOutput);
assertNoProductionEnv(statusEnv);
assertTablesExist(requireStatusEnv(statusEnv, "DB_URL"));
runAcceptance(statusEnv);

console.log("Phase 2B.3H Supabase local ingest route acceptance passed.");
