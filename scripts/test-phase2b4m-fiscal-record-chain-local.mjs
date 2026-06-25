#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const prefix = `phase2b4m_${randomUUID().replace(/-/g, "_")}`;
const password = `Phase2B4M-${randomUUID()}!`;
const now = "2026-06-25T14:20:00.000Z";
const issuerNif = `B4M${prefix.slice(-8).toUpperCase()}`;
const migrationFile =
  "supabase/migrations/20260625142000_phase2b4m_fiscal_record_chain_atomicity.sql";
const rollbackFile =
  "supabase/rollbacks/20260625142000_phase2b4m_fiscal_record_chain_atomicity.down.sql";

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
      "select exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'create_fiscal_record_with_chain_local_staging');",
    ]).trim() === "t"
  );
}

function applySql(dbUrl, file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) fail(`Missing SQL file: ${file}`);
  psql(dbUrl, ["-f", absolute]);
}

function candidateHash(label, previousHash) {
  return `sha256:${createHash("sha256")
    .update(`${prefix}|${label}|${previousHash ?? "first"}`)
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
      payload: { source: "phase2b4m-redacted" },
      document_snapshot: { source: "phase2b4m-redacted" },
      pdf_snapshot: { source: "phase2b4m-redacted" },
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

async function getChainHead(admin, userId) {
  const { data, error } = await admin
    .from("fiscal_chain_state")
    .select("user_id, environment, issuer_nif, last_record_id, last_hash, record_count, updated_at")
    .eq("user_id", userId)
    .eq("environment", "test")
    .eq("issuer_nif", issuerNif)
    .maybeSingle();
  if (error) fail(`Could not read chain head: ${error.message}`);
  return data;
}

async function createRecordDirect(clientInstance, args) {
  const { data, error } = await clientInstance
    .rpc("create_fiscal_record_with_chain_local_staging", args)
    .single();
  if (error || !data) {
    fail(
      `create_fiscal_record_with_chain_local_staging failed: ${error?.message ?? "empty result"}`,
    );
  }
  return data;
}

async function createAtomicRecord(admin, userId, operationId, label) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const head = await getChainHead(admin, userId);
    const data = await createRecordDirect(admin, {
      p_user_id: userId,
      p_operation_id: operationId,
      p_expected_previous_record_id: head?.last_record_id ?? null,
      p_expected_previous_hash: head?.last_hash ?? null,
      p_record_hash: candidateHash(`${label}_${attempt}`, head?.last_hash ?? null),
      p_hash_algorithm: "sha256-candidate",
      p_record_timestamp: now,
      p_schema_version: "phase2b4m-chain-local-staging-v1",
      p_renderer_version: "phase2b4m-test",
    });
    if (
      data.result_status === "conflict" &&
      data.reason === "record_chain_head_changed"
    ) {
      continue;
    }
    return { ...data, attempts: attempt };
  }
  fail(`Atomic create did not settle for ${label}.`);
}

async function expectRpcDenied(clientInstance, args, label) {
  const { error } = await clientInstance
    .rpc("create_fiscal_record_with_chain_local_staging", args)
    .single();
  if (!error) {
    fail(`${label} unexpectedly executed create_fiscal_record_with_chain_local_staging.`);
  }
}

async function countRows(admin, table, filters) {
  let query = admin.from(table).select("user_id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { count, error } = await query;
  if (error) fail(`Could not count ${table}: ${error.message}`);
  return count ?? 0;
}

async function prepareProcessingOperation(admin, userId, label, operationType = "alta_inicial") {
  const document = await createServerDocument(admin, userId, label);
  const operation = await reserve(admin, userId, document, operationType, label);
  await markProcessing(admin, userId, operation.operation_id);
  return operation;
}

async function main() {
  const status = loadLocalSupabaseStatus();
  if (!functionExists(status.DB_URL)) applySql(status.DB_URL, migrationFile);
  if (!functionExists(status.DB_URL)) {
    fail("create_fiscal_record_with_chain_local_staging does not exist locally.");
  }

  const admin = client(status.API_URL, status.SERVICE_ROLE_KEY);
  const anon = client(status.API_URL, status.ANON_KEY);
  const userA = await createUser(admin, "user_a");
  const userB = await createUser(admin, "user_b");
  const authClient = await signInUser(status.API_URL, status.ANON_KEY, userA.email);
  const requestedDocument = await createServerDocument(admin, userA.id, "REQUESTED");
  const requestedOperation = await reserve(
    admin,
    userA.id,
    requestedDocument,
    "alta_inicial",
    "requested",
  );
  const firstOperation = await prepareProcessingOperation(admin, userA.id, "FIRST");

  const permissionArgs = {
    p_user_id: userA.id,
    p_operation_id: firstOperation.operation_id,
    p_expected_previous_record_id: null,
    p_expected_previous_hash: null,
    p_record_hash: candidateHash("permission", null),
    p_hash_algorithm: "sha256-candidate",
    p_record_timestamp: now,
    p_schema_version: "phase2b4m-chain-local-staging-v1",
    p_renderer_version: "phase2b4m-test",
  };

  await expectRpcDenied(anon, permissionArgs, "anon");
  await expectRpcDenied(authClient, permissionArgs, "authenticated");

  const requestedResult = await createRecordDirect(admin, {
    ...permissionArgs,
    p_operation_id: requestedOperation.operation_id,
    p_record_hash: candidateHash("requested", null),
  });
  if (
    requestedResult.result_status !== "rejected" ||
    requestedResult.reason !== "operation_not_processing"
  ) {
    fail("Requested operation was not rejected.");
  }

  const otherOperation = await prepareProcessingOperation(admin, userB.id, "OTHER");
  const otherUserResult = await createRecordDirect(admin, {
    ...permissionArgs,
    p_operation_id: otherOperation.operation_id,
    p_record_hash: candidateHash("other_user", null),
  });
  if (
    otherUserResult.result_status !== "rejected" ||
    otherUserResult.reason !== "operation_not_found"
  ) {
    fail("Operation from another user was not rejected.");
  }

  const firstRecord = await createAtomicRecord(
    admin,
    userA.id,
    firstOperation.operation_id,
    "first",
  );
  if (
    firstRecord.result_status !== "created" ||
    firstRecord.record_sequence !== 1 ||
    firstRecord.record_previous_record_id !== null ||
    firstRecord.record_previous_hash !== null ||
    firstRecord.chain_last_record_id !== firstRecord.record_id ||
    firstRecord.chain_last_hash !== firstRecord.record_hash ||
    firstRecord.chain_record_count !== 1
  ) {
    fail("First record and chain state were not created atomically.");
  }

  const repeated = await createAtomicRecord(
    admin,
    userA.id,
    firstOperation.operation_id,
    "first_repeat",
  );
  if (
    repeated.result_status !== "existing" ||
    repeated.record_id !== firstRecord.record_id ||
    repeated.chain_record_count !== 1
  ) {
    fail("Repeated operation duplicated or changed chain unexpectedly.");
  }

  const secondOperation = await prepareProcessingOperation(
    admin,
    userA.id,
    "SECOND",
    "anulacion",
  );
  const staleHead = await getChainHead(admin, userA.id);
  const secondRecord = await createAtomicRecord(
    admin,
    userA.id,
    secondOperation.operation_id,
    "second",
  );
  if (
    secondRecord.result_status !== "created" ||
    secondRecord.record_sequence !== 2 ||
    secondRecord.record_previous_record_id !== firstRecord.record_id ||
    secondRecord.record_previous_hash !== firstRecord.record_hash ||
    secondRecord.record_type_candidate !== "anulacion" ||
    secondRecord.chain_last_record_id !== secondRecord.record_id ||
    secondRecord.chain_record_count !== 2
  ) {
    fail("Second record did not chain to the first record.");
  }

  const staleOperation = await prepareProcessingOperation(admin, userA.id, "STALE");
  const staleResult = await createRecordDirect(admin, {
    ...permissionArgs,
    p_operation_id: staleOperation.operation_id,
    p_expected_previous_record_id: staleHead?.last_record_id ?? null,
    p_expected_previous_hash: staleHead?.last_hash ?? null,
    p_record_hash: candidateHash("stale", staleHead?.last_hash ?? null),
  });
  if (
    staleResult.result_status !== "conflict" ||
    staleResult.reason !== "record_chain_head_changed"
  ) {
    fail("Stale chain head did not produce conflict.");
  }

  const concurrentA = await prepareProcessingOperation(admin, userA.id, "CONCURRENT_A");
  const concurrentB = await prepareProcessingOperation(admin, userA.id, "CONCURRENT_B");
  const concurrent = await Promise.all([
    createAtomicRecord(admin, userA.id, concurrentA.operation_id, "concurrent_a"),
    createAtomicRecord(admin, userA.id, concurrentB.operation_id, "concurrent_b"),
  ]);
  const sequences = concurrent
    .map((entry) => Number(entry.record_sequence))
    .sort((a, b) => a - b);
  if (sequences.join(",") !== "3,4") {
    fail(`Concurrent sequence expected 3,4, received ${sequences.join(",")}.`);
  }

  const chain = await getChainHead(admin, userA.id);
  const lastConcurrent = concurrent.find(
    (entry) => entry.record_id === chain?.last_record_id,
  );
  if (
    !chain ||
    chain.record_count !== 4 ||
    !lastConcurrent ||
    chain.last_hash !== lastConcurrent.record_hash
  ) {
    fail("Chain head is not consistent after concurrent records.");
  }

  const recordCount = await countRows(admin, "fiscal_records", {
    user_id: userA.id,
    issuer_nif: issuerNif,
  });
  const chainCount = await countRows(admin, "fiscal_chain_state", {
    user_id: userA.id,
    issuer_nif: issuerNif,
  });
  const transportCount = await countRows(admin, "fiscal_transport_attempts", {
    user_id: userA.id,
  });
  if (recordCount !== 4) fail(`Expected 4 records, found ${recordCount}.`);
  if (chainCount !== 1) fail(`Expected 1 chain row, found ${chainCount}.`);
  if (transportCount !== 0) fail("fiscal_transport_attempts was written.");

  const { data: rawRecord, error: rawError } = await admin
    .from("fiscal_records")
    .select("xml_payload, schema_version")
    .eq("id", firstRecord.record_id)
    .single();
  if (rawError || !rawRecord) {
    fail(`Could not read raw fiscal record: ${rawError?.message ?? "empty"}`);
  }
  if (rawRecord.xml_payload !== "PHASE2B4M_NO_AEAT_XML_CANDIDATE") {
    fail("Fiscal record does not contain the non-AEAT XML marker.");
  }
  if (rawRecord.schema_version !== "phase2b4m-chain-local-staging-v1") {
    fail("Unexpected fiscal record schema version.");
  }

  applySql(status.DB_URL, rollbackFile);
  if (functionExists(status.DB_URL)) {
    fail("Rollback did not remove create_fiscal_record_with_chain_local_staging.");
  }
  applySql(status.DB_URL, migrationFile);
  if (!functionExists(status.DB_URL)) {
    fail("Reapplying migration did not restore create_fiscal_record_with_chain_local_staging.");
  }

  console.log("Phase 2B.4M local fiscal record + chain atomicity passed.");
  console.log("Cases: permissions, first chain record, second record, same operation idempotency, stale head conflict, concurrent operations, no transport, no final AEAT XML, rollback.");
  console.log("Environment: local Supabase only.");
  console.log("Note: immutable local fiscal_records and chain rows remain for this test prefix; reset local Supabase to clean them.");
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
