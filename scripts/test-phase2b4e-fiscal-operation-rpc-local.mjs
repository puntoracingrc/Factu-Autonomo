#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const prefix = `phase2b4e_${randomUUID().replace(/-/g, "_")}`;
const password = `Phase2B4E-${randomUUID()}!`;
const now = "2026-06-25T10:00:00.000Z";
const migrationFile =
  "supabase/migrations/20260625070000_phase2b4d_fiscal_operation_transaction_rpc.sql";
const rollbackFile =
  "supabase/rollbacks/20260625070000_phase2b4d_fiscal_operation_transaction_rpc.down.sql";

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
      `${cmd} ${args.join(" ")} failed\nSTDOUT:\n${redact(result.stdout)}\nSTDERR:\n${redact(result.stderr)}`,
    );
  }
  return result.stdout;
}

function redact(value) {
  return value
    .replace(/eyJ[a-zA-Z0-9._-]+/g, "[redacted-jwt]")
    .replace(/sb_(?:secret|publishable)_[a-zA-Z0-9._-]+/g, "[redacted-key]")
    .replace(/[a-f0-9]{64}/gi, "[redacted-hex]");
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

function client(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function createUser(admin) {
  const email = `${prefix}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    fail(`Could not create local test user: ${error?.message ?? "unknown"}`);
  }
  return { id: data.user.id, email };
}

async function signInUser(anon, email) {
  const authClient = anon;
  const { error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) fail(`Could not sign in local test user: ${error.message}`);
  return authClient;
}

async function createServerDocument(admin, userId) {
  const { data, error } = await admin
    .from("server_documents")
    .insert({
      user_id: userId,
      local_document_id: `${prefix}_local_document`,
      document_type: "factura",
      document_kind: "standard",
      document_lifecycle: "issued",
      integrity_lock: "locked",
      status_legacy: "enviado",
      version: 9,
      payload: { source: "phase2b4e-redacted" },
      document_snapshot: { source: "phase2b4e-redacted" },
      pdf_snapshot: { source: "phase2b4e-redacted" },
      snapshot_hash: "fnv1a32:phase2b4e",
      pdf_content_hash: "fnv1a32:phase2b4e_pdf",
      issuer_nif: "B12345678",
      numserie: `${prefix.toUpperCase()}-0001`,
      issue_date: "2026-06-25",
      issued_at: now,
    })
    .select("id, user_id, version")
    .single();
  if (error || !data) {
    fail(`Could not create local server document: ${error?.message ?? "unknown"}`);
  }
  return data;
}

async function reserve(admin, args) {
  const { data, error } = await admin.rpc("reserve_fiscal_operation", args).single();
  if (error || !data) {
    fail(`reserve_fiscal_operation failed: ${error?.message ?? "empty result"}`);
  }
  return data;
}

async function expectRpcDenied(clientInstance, args, label) {
  const { error } = await clientInstance.rpc("reserve_fiscal_operation", args).single();
  if (!error) fail(`${label} unexpectedly executed reserve_fiscal_operation.`);
}

async function countRows(admin, table, filters) {
  let query = admin.from(table).select("user_id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { count, error } = await query;
  if (error) fail(`Could not count ${table}: ${error.message}`);
  return count ?? 0;
}

async function cleanup(admin, userId) {
  if (!userId) return;
  await admin.from("fiscal_operations").delete().eq("user_id", userId);
  await admin.from("fiscal_invoice_identities").delete().eq("user_id", userId);
  await admin.from("server_documents").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

function psql(dbUrl, args) {
  return run("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", ...args]);
}

function functionExists(dbUrl) {
  return (
    psql(dbUrl, [
      "-Atc",
      "select exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'reserve_fiscal_operation');",
    ]).trim() === "t"
  );
}

function applySql(dbUrl, file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) fail(`Missing SQL file: ${file}`);
  psql(dbUrl, ["-f", absolute]);
}

async function main() {
  const status = loadLocalSupabaseStatus();
  const admin = client(status.API_URL, status.SERVICE_ROLE_KEY);
  const anon = client(status.API_URL, status.ANON_KEY);
  let userId = null;
  let rollbackChecked = false;

  if (!functionExists(status.DB_URL)) {
    fail("reserve_fiscal_operation does not exist in local Supabase.");
  }

  try {
    const user = await createUser(admin);
    userId = user.id;
    const authClient = await signInUser(client(status.API_URL, status.ANON_KEY), user.email);
    const document = await createServerDocument(admin, user.id);
    const baseArgs = {
      p_user_id: user.id,
      p_server_document_id: document.id,
      p_operation_type: "alta_inicial",
      p_environment: "test",
      p_expected_document_version: 9,
      p_idempotency_key: `${prefix}_alta_inicial`,
      p_requested_by: user.id,
      p_requested_at: now,
    };

    await expectRpcDenied(anon, baseArgs, "anon");
    await expectRpcDenied(authClient, baseArgs, "authenticated");

    const created = await reserve(admin, baseArgs);
    if (created.result_status !== "created") {
      fail(`Expected created, received ${created.result_status}.`);
    }

    const repeated = await reserve(admin, baseArgs);
    if (repeated.result_status !== "existing") {
      fail(`Expected existing, received ${repeated.result_status}.`);
    }

    const conflict = await reserve(admin, {
      ...baseArgs,
      p_expected_document_version: 8,
      p_idempotency_key: `${prefix}_version_conflict`,
    });
    if (
      conflict.result_status !== "conflict" ||
      conflict.reason !== "document_version_conflict"
    ) {
      fail(`Expected document_version_conflict, received ${conflict.result_status}.`);
    }

    const subsanacion = await reserve(admin, {
      ...baseArgs,
      p_operation_type: "alta_subsanacion",
      p_idempotency_key: `${prefix}_alta_subsanacion`,
    });
    const anulacion = await reserve(admin, {
      ...baseArgs,
      p_operation_type: "anulacion",
      p_idempotency_key: `${prefix}_anulacion`,
    });
    if (subsanacion.result_status !== "created" || anulacion.result_status !== "created") {
      fail("Subsanacion/anulacion legitimas were not created.");
    }

    const raceKey = `${prefix}_race`;
    const race = await Promise.all([
      reserve(admin, { ...baseArgs, p_idempotency_key: raceKey }),
      reserve(admin, { ...baseArgs, p_idempotency_key: raceKey }),
    ]);
    const raceStatuses = race.map((entry) => entry.result_status).sort();
    if (raceStatuses.join(",") !== "created,existing") {
      fail(`Expected concurrent created/existing, received ${raceStatuses.join(",")}.`);
    }

    const operationCount = await countRows(admin, "fiscal_operations", {
      user_id: user.id,
    });
    const identityCount = await countRows(admin, "fiscal_invoice_identities", {
      user_id: user.id,
    });
    const recordCount = await countRows(admin, "fiscal_records", {
      user_id: user.id,
    });
    const chainCount = await countRows(admin, "fiscal_chain_state", {
      user_id: user.id,
    });
    const transportCount = await countRows(admin, "fiscal_transport_attempts", {
      user_id: user.id,
    });

    if (operationCount !== 4) {
      fail(`Expected 4 fiscal operations, found ${operationCount}.`);
    }
    if (identityCount !== 1) {
      fail(`Expected 1 fiscal invoice identity, found ${identityCount}.`);
    }
    if (recordCount !== 0 || chainCount !== 0 || transportCount !== 0) {
      fail("Forbidden fiscal tables were written.");
    }

    await cleanup(admin, user.id);
    userId = null;

    applySql(status.DB_URL, rollbackFile);
    if (functionExists(status.DB_URL)) {
      fail("Rollback did not remove reserve_fiscal_operation.");
    }
    applySql(status.DB_URL, migrationFile);
    rollbackChecked = functionExists(status.DB_URL);
    if (!rollbackChecked) {
      fail("Reapplying migration did not restore reserve_fiscal_operation.");
    }

    console.log("Phase 2B.4E local RPC acceptance passed.");
    console.log("Cases: permissions, created, existing, conflict, identity reuse, legitimate operations, concurrency, forbidden tables, rollback.");
    console.log("Environment: local Supabase only.");
  } finally {
    if (userId) await cleanup(admin, userId);
    if (!rollbackChecked && !functionExists(status.DB_URL)) {
      applySql(status.DB_URL, migrationFile);
    }
  }
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
