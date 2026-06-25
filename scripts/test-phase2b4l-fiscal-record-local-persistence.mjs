#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const prefix = `phase2b4l_${randomUUID().replace(/-/g, "_")}`;
const password = `Phase2B4L-${randomUUID()}!`;
const now = "2026-06-25T13:40:00.000Z";
const issuerNif = `B4L${prefix.slice(-8).toUpperCase()}`;
const migrationFile =
  "supabase/migrations/20260625133500_phase2b4l_fiscal_record_local_persistence.sql";

function fail(message) {
  throw new Error(message);
}

function redact(value) {
  return value
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

function client(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function psql(dbUrl, args) {
  return run("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", ...args]);
}

function functionExists(dbUrl) {
  return (
    psql(dbUrl, [
      "-Atc",
      "select exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'create_fiscal_record_local_staging');",
    ]).trim() === "t"
  );
}

function applySql(dbUrl, file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) fail(`Missing SQL file: ${file}`);
  psql(dbUrl, ["-f", absolute]);
}

function candidateHash(label) {
  return `candidate_not_final:sha256:${createHash("sha256")
    .update(`${prefix}|${label}`)
    .digest("hex")}`;
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
      payload: { source: "phase2b4l-redacted" },
      document_snapshot: { source: "phase2b4l-redacted" },
      pdf_snapshot: { source: "phase2b4l-redacted" },
      snapshot_hash: `fnv1a32:${label}`,
      pdf_content_hash: `fnv1a32:${label}_pdf`,
      issuer_nif: issuerNif,
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

async function reserve(admin, userId, document, operationType, key) {
  const { data, error } = await admin
    .rpc("reserve_fiscal_operation", {
      p_user_id: userId,
      p_server_document_id: document.id,
      p_operation_type: operationType,
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

async function markProcessing(admin, userId, operationId) {
  const { data, error } = await admin
    .rpc("mark_fiscal_operation_processing", {
      p_user_id: userId,
      p_operation_id: operationId,
      p_marked_at: now,
    })
    .single();
  if (error || !data) {
    fail(
      `mark_fiscal_operation_processing failed: ${error?.message ?? "empty result"}`,
    );
  }
  if (data.result_status !== "processing") {
    fail(`Expected processing, received ${data.result_status}.`);
  }
  return data;
}

async function createRecord(clientInstance, args) {
  const { data, error } = await clientInstance
    .rpc("create_fiscal_record_local_staging", args)
    .single();
  if (error || !data) {
    fail(
      `create_fiscal_record_local_staging failed: ${error?.message ?? "empty result"}`,
    );
  }
  return data;
}

async function expectRpcDenied(clientInstance, args, label) {
  const { error } = await clientInstance
    .rpc("create_fiscal_record_local_staging", args)
    .single();
  if (!error) {
    fail(`${label} unexpectedly executed create_fiscal_record_local_staging.`);
  }
}

async function countRows(admin, table, filters) {
  let query = admin.from(table).select("user_id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { count, error } = await query;
  if (error) fail(`Could not count ${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const status = loadLocalSupabaseStatus();
  if (!functionExists(status.DB_URL)) applySql(status.DB_URL, migrationFile);
  if (!functionExists(status.DB_URL)) {
    fail("create_fiscal_record_local_staging does not exist in local Supabase.");
  }

  const admin = client(status.API_URL, status.SERVICE_ROLE_KEY);
  const anon = client(status.API_URL, status.ANON_KEY);
  const userA = await createUser(admin, "user_a");
  const userB = await createUser(admin, "user_b");
  const authClient = await signInUser(status.API_URL, status.ANON_KEY, userA.email);
  const documentAlta = await createServerDocument(admin, userA.id, "ALTA");
  const altaRequested = await reserve(
    admin,
    userA.id,
    documentAlta,
    "alta_inicial",
    "alta_requested",
  );
  const altaProcessing = await reserve(
    admin,
    userA.id,
    documentAlta,
    "alta_inicial",
    "alta_processing",
  );
  await markProcessing(admin, userA.id, altaProcessing.operation_id);

  const permissionArgs = {
    p_user_id: userA.id,
    p_operation_id: altaProcessing.operation_id,
    p_expected_previous_record_id: null,
    p_expected_previous_hash: null,
    p_record_hash: candidateHash("permission"),
    p_hash_algorithm: "sha256-candidate",
    p_record_timestamp: now,
    p_schema_version: "phase2b4l-local-staging-v1",
    p_renderer_version: "phase2b4l-test",
  };

  await expectRpcDenied(anon, permissionArgs, "anon");
  await expectRpcDenied(authClient, permissionArgs, "authenticated");

  const requestedResult = await createRecord(admin, {
    ...permissionArgs,
    p_operation_id: altaRequested.operation_id,
    p_record_hash: candidateHash("requested"),
  });
  if (
    requestedResult.result_status !== "rejected" ||
    requestedResult.reason !== "operation_not_processing"
  ) {
    fail("Requested operation was not rejected.");
  }

  const documentOther = await createServerDocument(admin, userB.id, "OTHER");
  const otherOperation = await reserve(
    admin,
    userB.id,
    documentOther,
    "alta_inicial",
    "other_user",
  );
  await markProcessing(admin, userB.id, otherOperation.operation_id);
  const otherUserResult = await createRecord(admin, {
    ...permissionArgs,
    p_operation_id: otherOperation.operation_id,
    p_record_hash: candidateHash("other_user"),
  });
  if (
    otherUserResult.result_status !== "rejected" ||
    otherUserResult.reason !== "operation_not_found"
  ) {
    fail("Operation from another user was not rejected.");
  }

  const altaRecord = await createRecord(admin, {
    ...permissionArgs,
    p_record_hash: candidateHash("alta"),
  });
  if (
    altaRecord.result_status !== "created" ||
    altaRecord.record_operation_id !== altaProcessing.operation_id ||
    altaRecord.record_type_candidate !== "alta" ||
    altaRecord.record_sequence !== 1 ||
    altaRecord.record_previous_record_id !== null ||
    altaRecord.record_previous_hash !== null
  ) {
    fail("Alta candidate record was not persisted correctly.");
  }
  if (Object.keys(altaRecord).some((key) => key.toLowerCase().includes("xml"))) {
    fail("RPC returned XML payload fields.");
  }

  const repeated = await createRecord(admin, {
    ...permissionArgs,
    p_record_hash: candidateHash("alta_repeat"),
  });
  if (
    repeated.result_status !== "existing" ||
    repeated.record_id !== altaRecord.record_id
  ) {
    fail("Repeated operation did not return existing fiscal record.");
  }

  const documentAnulacion = await createServerDocument(admin, userA.id, "ANULACION");
  const anulacionProcessing = await reserve(
    admin,
    userA.id,
    documentAnulacion,
    "anulacion",
    "anulacion_processing",
  );
  await markProcessing(admin, userA.id, anulacionProcessing.operation_id);
  const anulacionRecord = await createRecord(admin, {
    ...permissionArgs,
    p_operation_id: anulacionProcessing.operation_id,
    p_expected_previous_record_id: altaRecord.record_id,
    p_expected_previous_hash: altaRecord.record_hash,
    p_record_hash: candidateHash("anulacion"),
  });
  if (
    anulacionRecord.result_status !== "created" ||
    anulacionRecord.record_type_candidate !== "anulacion" ||
    anulacionRecord.record_sequence !== 2 ||
    anulacionRecord.record_previous_record_id !== altaRecord.record_id ||
    anulacionRecord.record_previous_hash !== altaRecord.record_hash
  ) {
    fail("Anulacion candidate record was not chained locally.");
  }

  const transportCount = await countRows(admin, "fiscal_transport_attempts", {
    user_id: userA.id,
  });
  const chainCount = await countRows(admin, "fiscal_chain_state", {
    user_id: userA.id,
  });
  if (transportCount !== 0) fail("fiscal_transport_attempts was written.");
  if (chainCount !== 0) fail("fiscal_chain_state was written.");

  const { data: rawRecord, error: rawError } = await admin
    .from("fiscal_records")
    .select("xml_payload, schema_version, invoice_identity_id")
    .eq("id", altaRecord.record_id)
    .single();
  if (rawError || !rawRecord) {
    fail(`Could not read raw local fiscal record: ${rawError?.message ?? "empty"}`);
  }
  if (rawRecord.xml_payload !== "PHASE2B4L_NO_AEAT_XML_CANDIDATE") {
    fail("Fiscal record does not contain the non-AEAT XML marker.");
  }
  if (rawRecord.schema_version !== "phase2b4l-local-staging-v1") {
    fail("Unexpected fiscal record schema version.");
  }
  if (!rawRecord.invoice_identity_id) {
    fail("Fiscal record is not linked to invoice_identity_id.");
  }

  console.log("Phase 2B.4L local fiscal record persistence passed.");
  console.log("Cases: permissions, processing create, requested reject, wrong user reject, existing, alta, anulacion, no transport, no chain_state, no final AEAT XML.");
  console.log("Environment: local Supabase only.");
  console.log("Note: immutable local fiscal_records remain for this test prefix; reset local Supabase to clean them.");
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
