#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const prefix = `phase2b4f_${randomUUID().replace(/-/g, "_")}`;
const password = `Phase2B4F-${randomUUID()}!`;
const now = "2026-06-25T11:00:00.000Z";
const processingMigrationFile =
  "supabase/migrations/20260625093000_phase2b4f_fiscal_operation_processing_rpc.sql";
const processingRollbackFile =
  "supabase/rollbacks/20260625093000_phase2b4f_fiscal_operation_processing_rpc.down.sql";

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

async function createUser(admin, label) {
  const email = `${prefix}_${label}@example.test`;
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

async function signInUser(apiUrl, anonKey, email) {
  const authClient = client(apiUrl, anonKey);
  const { error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) fail(`Could not sign in local test user: ${error.message}`);
  return authClient;
}

async function createServerDocument(admin, userId, label) {
  const { data, error } = await admin
    .from("server_documents")
    .insert({
      user_id: userId,
      local_document_id: `${prefix}_${label}_local_document`,
      document_type: "factura",
      document_kind: "standard",
      document_lifecycle: "issued",
      integrity_lock: "locked",
      status_legacy: "enviado",
      version: 9,
      payload: { source: "phase2b4f-redacted" },
      document_snapshot: { source: "phase2b4f-redacted" },
      pdf_snapshot: { source: "phase2b4f-redacted" },
      snapshot_hash: `fnv1a32:${label}`,
      pdf_content_hash: `fnv1a32:${label}_pdf`,
      issuer_nif: "B12345678",
      numserie: `${prefix.toUpperCase()}-${label}`,
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

async function reserve(admin, userId, document, key) {
  const { data, error } = await admin
    .rpc("reserve_fiscal_operation", {
      p_user_id: userId,
      p_server_document_id: document.id,
      p_operation_type: "alta_inicial",
      p_environment: "test",
      p_expected_document_version: document.version,
      p_idempotency_key: `${prefix}_${key}`,
      p_requested_by: userId,
      p_requested_at: now,
    })
    .single();
  if (error || !data) {
    fail(`reserve_fiscal_operation failed: ${error?.message ?? "empty result"}`);
  }
  if (data.result_status !== "created") {
    fail(`Expected created reserve result, received ${data.result_status}.`);
  }
  return data;
}

async function mark(clientInstance, args) {
  const { data, error } = await clientInstance
    .rpc("mark_fiscal_operation_processing", args)
    .single();
  if (error || !data) {
    fail(
      `mark_fiscal_operation_processing failed: ${error?.message ?? "empty result"}`,
    );
  }
  return data;
}

async function expectRpcDenied(clientInstance, args, label) {
  const { error } = await clientInstance
    .rpc("mark_fiscal_operation_processing", args)
    .single();
  if (!error) {
    fail(`${label} unexpectedly executed mark_fiscal_operation_processing.`);
  }
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
      "select exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'mark_fiscal_operation_processing');",
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
  let userAId = null;
  let userBId = null;
  let rollbackChecked = false;

  if (!functionExists(status.DB_URL)) {
    fail("mark_fiscal_operation_processing does not exist in local Supabase.");
  }

  try {
    const userA = await createUser(admin, "user_a");
    const userB = await createUser(admin, "user_b");
    userAId = userA.id;
    userBId = userB.id;
    const authClient = await signInUser(
      status.API_URL,
      status.ANON_KEY,
      userA.email,
    );

    const documentA = await createServerDocument(admin, userA.id, "DOC_A");
    const requested = await reserve(admin, userA.id, documentA, "requested");
    const markArgs = {
      p_user_id: userA.id,
      p_operation_id: requested.operation_id,
      p_marked_at: now,
    };

    await expectRpcDenied(anon, markArgs, "anon");
    await expectRpcDenied(authClient, markArgs, "authenticated");

    const processing = await mark(admin, markArgs);
    if (
      processing.result_status !== "processing" ||
      processing.operation_status !== "processing"
    ) {
      fail(`Expected processing result, received ${processing.result_status}.`);
    }

    const repeated = await mark(admin, markArgs);
    if (
      repeated.result_status !== "existing_processing" ||
      repeated.operation_status !== "processing"
    ) {
      fail(`Expected existing_processing, received ${repeated.result_status}.`);
    }

    const documentB = await createServerDocument(admin, userB.id, "DOC_B");
    const otherUserOperation = await reserve(
      admin,
      userB.id,
      documentB,
      "other_user",
    );
    const otherUserResult = await mark(admin, {
      p_user_id: userA.id,
      p_operation_id: otherUserOperation.operation_id,
      p_marked_at: now,
    });
    if (
      otherUserResult.result_status !== "rejected" ||
      otherUserResult.reason !== "operation_not_found"
    ) {
      fail("Operation from another user was not rejected.");
    }

    const incompatible = await reserve(
      admin,
      userA.id,
      documentA,
      "incompatible",
    );
    const { error: completeError } = await admin
      .from("fiscal_operations")
      .update({
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq("user_id", userA.id)
      .eq("id", incompatible.operation_id);
    if (completeError) {
      fail(`Could not prepare incompatible status: ${completeError.message}`);
    }
    const incompatibleResult = await mark(admin, {
      p_user_id: userA.id,
      p_operation_id: incompatible.operation_id,
      p_marked_at: now,
    });
    if (
      incompatibleResult.result_status !== "rejected" ||
      incompatibleResult.reason !== "operation_status_incompatible"
    ) {
      fail(`Expected incompatible rejection, received ${incompatibleResult.result_status}.`);
    }

    const concurrent = await reserve(admin, userA.id, documentA, "concurrent");
    const race = await Promise.all([
      mark(admin, {
        p_user_id: userA.id,
        p_operation_id: concurrent.operation_id,
        p_marked_at: now,
      }),
      mark(admin, {
        p_user_id: userA.id,
        p_operation_id: concurrent.operation_id,
        p_marked_at: now,
      }),
    ]);
    const raceStatuses = race.map((entry) => entry.result_status).sort();
    if (raceStatuses.join(",") !== "existing_processing,processing") {
      fail(`Expected concurrent processing/existing, received ${raceStatuses.join(",")}.`);
    }

    const recordCount = await countRows(admin, "fiscal_records", {
      user_id: userA.id,
    });
    const chainCount = await countRows(admin, "fiscal_chain_state", {
      user_id: userA.id,
    });
    const transportCount = await countRows(admin, "fiscal_transport_attempts", {
      user_id: userA.id,
    });
    if (recordCount !== 0 || chainCount !== 0 || transportCount !== 0) {
      fail("Forbidden fiscal tables were written.");
    }

    await cleanup(admin, userA.id);
    await cleanup(admin, userB.id);
    userAId = null;
    userBId = null;

    applySql(status.DB_URL, processingRollbackFile);
    if (functionExists(status.DB_URL)) {
      fail("Rollback did not remove mark_fiscal_operation_processing.");
    }
    applySql(status.DB_URL, processingMigrationFile);
    rollbackChecked = functionExists(status.DB_URL);
    if (!rollbackChecked) {
      fail("Reapplying migration did not restore mark_fiscal_operation_processing.");
    }

    console.log("Phase 2B.4F local processing transition passed.");
    console.log("Cases: permissions, requested->processing, existing_processing, wrong user, incompatible status, concurrency, forbidden tables, rollback.");
    console.log("Environment: local Supabase only.");
  } finally {
    if (userAId) await cleanup(admin, userAId);
    if (userBId) await cleanup(admin, userBId);
    if (!rollbackChecked && !functionExists(status.DB_URL)) {
      applySql(status.DB_URL, processingMigrationFile);
    }
  }
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
