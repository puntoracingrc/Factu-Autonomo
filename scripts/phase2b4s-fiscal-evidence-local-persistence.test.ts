import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { buildFiscalEvidencePacket } from "@/lib/fiscal-evidence-packet";
import { FiscalEvidencePersistenceRepository, SupabaseFiscalEvidencePersistenceStore } from "@/lib/fiscal-evidence-persistence";
import type { SupabaseFiscalEvidencePersistenceClient } from "@/lib/fiscal-evidence-persistence";
import { buildFiscalPayloadCandidate } from "@/lib/fiscal-payload-candidate";
import { validateFiscalPayloadCandidate } from "@/lib/fiscal-payload-validation";
import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
  FiscalOperationType,
} from "@/lib/fiscal-operations";
import type {
  FiscalChainHeadState,
  FiscalRecordWithChainLocalStagingRecord,
} from "@/lib/fiscal-records";

const enabled = process.env.PHASE2B4S_LOCAL_ACCEPTANCE === "1";
const maybeDescribe = enabled ? describe.sequential : describe.skip;
const prefix = `phase2b4s_${randomUUID().replaceAll("-", "_")}`;
const password = `Phase2B4S-${randomUUID()}!`;
const now = "2026-06-25T15:30:00.000Z";
const issuerNif = `B4S${prefix.slice(-8).toUpperCase()}`;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function fail(message: string): never {
  throw new Error(message);
}

function assertLocalUrl(rawUrl: string, label: string): void {
  const parsed = new URL(rawUrl);
  if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    fail(`${label} must be local. Refusing ${parsed.hostname}.`);
  }
}

function client(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

type SupabaseClient = ReturnType<typeof client>;

function candidateHash(label: string, previousHash: string | null): string {
  return `sha256:${createHash("sha256")
    .update(`${prefix}|${label}|${previousHash ?? "first"}`)
    .digest("hex")}`;
}

function mapOperation(row: Record<string, unknown>): FiscalOperationRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    serverDocumentId: String(row.server_document_id),
    operationType: String(row.operation_type) as FiscalOperationType,
    environment: row.environment === "production" ? "production" : "test",
    idempotencyKey: String(row.idempotency_key),
    requestedBy: String(row.requested_by),
    requestedAt: String(row.requested_at),
    expectedDocumentVersion: Number(row.expected_document_version),
    documentSnapshotHash: String(row.document_snapshot_hash),
    status: String(row.status) as FiscalOperationRecord["status"],
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    failedAt: typeof row.failed_at === "string" ? row.failed_at : null,
    failureCode: typeof row.failure_code === "string" ? row.failure_code : null,
    failureMessage:
      typeof row.failure_message === "string" ? row.failure_message : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapIdentity(row: Record<string, unknown>): FiscalInvoiceIdentityRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    serverDocumentId: String(row.server_document_id),
    environment: row.environment === "production" ? "production" : "test",
    issuerNif: String(row.issuer_nif),
    numserie: String(row.numserie),
    fechaExpedicion: String(row.fecha_expedicion),
    createdAt: String(row.created_at),
  };
}

function mapRecord(
  row: Record<string, unknown>,
): FiscalRecordWithChainLocalStagingRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    operationId: String(row.operation_id),
    invoiceIdentityId: String(row.invoice_identity_id),
    serverDocumentId: String(row.server_document_id),
    environment: row.environment === "production" ? "production" : "test",
    issuerNif: String(row.issuer_nif),
    numserie: String(row.numserie),
    fechaExpedicion: String(row.fecha_expedicion),
    recordTypeCandidate:
      row.record_type === "anulacion" ? "anulacion" : "alta",
    recordSequence: Number(row.record_sequence),
    previousRecordId:
      typeof row.previous_record_id === "string" ? row.previous_record_id : null,
    previousHash: typeof row.previous_hash === "string" ? row.previous_hash : null,
    recordHash: String(row.record_hash),
    hashAlgorithm: "sha256-candidate",
    recordTimestamp: String(row.record_timestamp),
    documentSnapshotHash: String(row.document_snapshot_hash),
    pdfContentHash:
      typeof row.pdf_content_hash === "string" ? row.pdf_content_hash : null,
    schemaVersion: "phase2b4m-chain-local-staging-v1",
    rendererVersion:
      typeof row.renderer_version === "string" ? row.renderer_version : null,
    createdAt: String(row.created_at),
  };
}

function mapChain(row: Record<string, unknown>): FiscalChainHeadState {
  return {
    userId: String(row.user_id),
    environment: row.environment === "production" ? "production" : "test",
    issuerNif: String(row.issuer_nif),
    lastRecordId:
      typeof row.last_record_id === "string" ? row.last_record_id : null,
    lastHash: typeof row.last_hash === "string" ? row.last_hash : null,
    recordCount: Number(row.record_count),
    updatedAt: String(row.updated_at),
  };
}

async function createUser(admin: SupabaseClient) {
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

async function createServerDocument(
  admin: SupabaseClient,
  userId: string,
  label: string,
) {
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
      payload: { source: "phase2b4s-redacted" },
      document_snapshot: { source: "phase2b4s-redacted" },
      pdf_snapshot: { source: "phase2b4s-redacted" },
      snapshot_hash: `fnv1a32:${label}`,
      pdf_content_hash: `fnv1a32:${label}_pdf`,
      issuer_nif: issuerNif,
      numserie: `${prefix.toUpperCase()}-${label}`,
      issue_date: "2026-06-25",
      issued_at: now,
    })
    .select("id, version")
    .single();
  if (error || !data) {
    fail(`Could not create local server document: ${error?.message ?? "unknown"}`);
  }
  return data as { id: string; version: number };
}

async function reserve(
  admin: SupabaseClient,
  userId: string,
  document: { id: string; version: number },
  operationType: FiscalOperationType,
  key: string,
) {
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
  const row = data as Record<string, unknown>;
  if (row.result_status !== "created") {
    fail(`Expected created reserve result, received ${String(row.result_status)}.`);
  }
  return String(row.operation_id);
}

async function markProcessing(
  admin: SupabaseClient,
  userId: string,
  operationId: string,
) {
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
  const row = data as Record<string, unknown>;
  if (row.result_status !== "processing") {
    fail(`Expected processing, received ${String(row.result_status)}.`);
  }
}

async function prepareProcessingOperation(
  admin: SupabaseClient,
  userId: string,
  label: string,
  operationType: FiscalOperationType,
) {
  const document = await createServerDocument(admin, userId, label);
  const operationId = await reserve(admin, userId, document, operationType, label);
  await markProcessing(admin, userId, operationId);
  return operationId;
}

async function readOperation(
  admin: SupabaseClient,
  userId: string,
  operationId: string,
) {
  const { data, error } = await admin
    .from("fiscal_operations")
    .select("*")
    .eq("user_id", userId)
    .eq("id", operationId)
    .single();
  if (error || !data) fail(`Could not read operation: ${error?.message}`);
  return mapOperation(data);
}

async function readIdentity(
  admin: SupabaseClient,
  userId: string,
  identityId: string,
) {
  const { data, error } = await admin
    .from("fiscal_invoice_identities")
    .select("*")
    .eq("user_id", userId)
    .eq("id", identityId)
    .single();
  if (error || !data) fail(`Could not read identity: ${error?.message}`);
  return mapIdentity(data);
}

async function readRecord(
  admin: SupabaseClient,
  userId: string,
  recordId: string,
) {
  const { data, error } = await admin
    .from("fiscal_records")
    .select("*")
    .eq("user_id", userId)
    .eq("id", recordId)
    .single();
  if (error || !data) fail(`Could not read fiscal record: ${error?.message}`);
  return mapRecord(data);
}

async function readChain(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("fiscal_chain_state")
    .select("*")
    .eq("user_id", userId)
    .eq("environment", "test")
    .eq("issuer_nif", issuerNif)
    .single();
  if (error || !data) fail(`Could not read chain state: ${error?.message}`);
  return mapChain(data);
}

async function getChainHead(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("fiscal_chain_state")
    .select("last_record_id, last_hash")
    .eq("user_id", userId)
    .eq("environment", "test")
    .eq("issuer_nif", issuerNif)
    .maybeSingle();
  if (error) fail(`Could not read chain head: ${error.message}`);
  return data as { last_record_id: string | null; last_hash: string | null } | null;
}

async function createAtomicRecord(
  admin: SupabaseClient,
  userId: string,
  operationId: string,
  label: string,
) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const head = await getChainHead(admin, userId);
    const { data, error } = await admin
      .rpc("create_fiscal_record_with_chain_local_staging", {
        p_user_id: userId,
        p_operation_id: operationId,
        p_expected_previous_record_id: head?.last_record_id ?? null,
        p_expected_previous_hash: head?.last_hash ?? null,
        p_record_hash: candidateHash(`${label}_${attempt}`, head?.last_hash ?? null),
        p_hash_algorithm: "sha256-candidate",
        p_record_timestamp: now,
        p_schema_version: "phase2b4m-chain-local-staging-v1",
        p_renderer_version: "phase2b4s-test",
      })
      .single();
    if (error || !data) {
      fail(`create_fiscal_record_with_chain_local_staging failed: ${error?.message}`);
    }
    const row = data as Record<string, unknown>;
    if (
      row.result_status === "conflict" &&
      row.reason === "record_chain_head_changed"
    ) {
      continue;
    }
    if (row.result_status !== "created") {
      fail(`Expected created atomic record, received ${String(row.result_status)}.`);
    }
    return String(row.record_id);
  }
  fail(`Atomic create did not settle for ${label}.`);
}

async function countRows(
  admin: SupabaseClient,
  table: string,
  filters: Record<string, unknown>,
): Promise<number> {
  let query = admin.from(table).select("user_id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { count, error } = await query;
  if (error) fail(`Could not count ${table}: ${error.message}`);
  return count ?? 0;
}

async function readEvidenceRows(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("fiscal_evidence_packets")
    .select("*")
    .eq("user_id", userId)
    .order("record_sequence", { ascending: true });
  if (error || !data) fail(`Could not read evidence rows: ${error?.message}`);
  return data as Array<Record<string, unknown>>;
}

async function buildAndPersistEvidenceForRecord(
  admin: SupabaseClient,
  repository: FiscalEvidencePersistenceRepository,
  userId: string,
  operationId: string,
  recordId: string,
  chain: FiscalChainHeadState,
) {
  const record = await readRecord(admin, userId, recordId);
  const payload = buildFiscalPayloadCandidate({
    record,
    chain,
    operation: await readOperation(admin, userId, operationId),
    invoiceIdentity: await readIdentity(admin, userId, record.invoiceIdentityId),
    generatedAtCandidate: now,
  });
  const validation = validateFiscalPayloadCandidate(payload, { checkedAt: now });
  const packet = buildFiscalEvidencePacket({
    record,
    chain,
    payload,
    validation,
    generatedAt: now,
  });
  const result = await repository.persistFiscalEvidencePacketLocalStaging({
    record,
    chain,
    payload,
    validation,
    packet,
    createdAt: now,
  });
  return { record, payload, validation, packet, result };
}

function assertSafeEvidence(value: unknown): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("<FiscalPayloadCandidate");
  expect(serialized).not.toContain("PHASE2B4N_O_XML_CANDIDATE_NOT_AEAT_FINAL");
  expect(serialized).not.toContain("documentSnapshot");
  expect(serialized).not.toContain("document_snapshot");
  expect(serialized).not.toContain("pdf_snapshot");
  expect(serialized).not.toContain("payloadDocument");
  expect(serialized.toLowerCase()).not.toContain("token");
  expect(serialized).not.toContain("service_role");
  expect(serialized).not.toContain("private_key");
  expect(serialized).not.toContain("Certificate");
  expect(serialized).not.toContain("agenciatributaria");
  expect(serialized).not.toContain("fiscal_transport_attempts");
}

maybeDescribe("Phase 2B.4S fiscal evidence local persistence acceptance", () => {
  it("persiste evidencia interna en tabla separada para alta, encadenada y anulacion", async () => {
    const apiUrl = requiredEnv("PHASE2B4S_SUPABASE_URL");
    const adminKey = requiredEnv("PHASE2B4S_SUPABASE_ADMIN_KEY");
    assertLocalUrl(apiUrl, "Supabase API URL");

    const admin = client(apiUrl, adminKey);
    const repository = new FiscalEvidencePersistenceRepository(
      new SupabaseFiscalEvidencePersistenceStore(
        admin as unknown as SupabaseFiscalEvidencePersistenceClient,
      ),
    );
    const user = await createUser(admin);

    const firstOperationId = await prepareProcessingOperation(
      admin,
      user.id,
      "ALTA_1",
      "alta_inicial",
    );
    const secondOperationId = await prepareProcessingOperation(
      admin,
      user.id,
      "ALTA_2",
      "alta_subsanacion",
    );
    const anulacionOperationId = await prepareProcessingOperation(
      admin,
      user.id,
      "ANULACION",
      "anulacion",
    );

    const firstRecordId = await createAtomicRecord(
      admin,
      user.id,
      firstOperationId,
      "first",
    );
    const secondRecordId = await createAtomicRecord(
      admin,
      user.id,
      secondOperationId,
      "second",
    );
    const anulacionRecordId = await createAtomicRecord(
      admin,
      user.id,
      anulacionOperationId,
      "anulacion",
    );

    const chain = await readChain(admin, user.id);
    const first = await buildAndPersistEvidenceForRecord(
      admin,
      repository,
      user.id,
      firstOperationId,
      firstRecordId,
      chain,
    );
    const second = await buildAndPersistEvidenceForRecord(
      admin,
      repository,
      user.id,
      secondOperationId,
      secondRecordId,
      chain,
    );
    const anulacion = await buildAndPersistEvidenceForRecord(
      admin,
      repository,
      user.id,
      anulacionOperationId,
      anulacionRecordId,
      chain,
    );

    if (first.result.status !== "created") {
      fail(`Expected first created: ${JSON.stringify(first.result)}`);
    }
    if (second.result.status !== "created") {
      fail(`Expected second created: ${JSON.stringify(second.result)}`);
    }
    if (anulacion.result.status !== "created") {
      fail(`Expected anulacion created: ${JSON.stringify(anulacion.result)}`);
    }

    expect(first.result.evidence).toMatchObject({
      recordId: firstRecordId,
      recordSequence: 1,
      previousHash: null,
      payloadValidationStatus: "valid",
      evidenceFinality: "internal_dry_run_evidence",
      transportable: false,
    });
    expect(second.result.evidence).toMatchObject({
      recordId: secondRecordId,
      recordSequence: 2,
      previousHash: first.record.recordHash,
      payloadValidationStatus: "valid",
      evidenceFinality: "internal_dry_run_evidence",
      transportable: false,
    });
    expect(anulacion.result.evidence).toMatchObject({
      recordId: anulacionRecordId,
      recordSequence: 3,
      previousHash: second.record.recordHash,
      payloadValidationStatus: "valid",
      evidenceFinality: "internal_dry_run_evidence",
      transportable: false,
    });

    assertSafeEvidence(first.result.evidence);
    assertSafeEvidence(second.result.evidence);
    assertSafeEvidence(anulacion.result.evidence);

    const duplicate = await repository.persistFiscalEvidencePacketLocalStaging({
      record: first.record,
      chain,
      payload: first.payload,
      validation: first.validation,
      packet: first.packet,
      createdAt: now,
    });
    expect(duplicate.status).toBe("existing");

    const invalidPayload = {
      ...first.payload,
      transportable: true,
    };
    const invalidValidation = validateFiscalPayloadCandidate(invalidPayload, {
      checkedAt: now,
    });
    expect(invalidValidation.status).toBe("rejected");
    const rejected = await repository.persistFiscalEvidencePacketLocalStaging({
      record: first.record,
      chain,
      payload: first.payload,
      validation: invalidValidation,
      packet: first.packet,
      createdAt: now,
    });
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: "payload_validation_not_valid",
    });

    const evidenceRows = await readEvidenceRows(admin, user.id);
    expect(evidenceRows).toHaveLength(3);
    for (const row of evidenceRows) {
      expect(row.transportable).toBe(false);
      expect(row.evidence_finality).toBe("internal_dry_run_evidence");
      expect(row.payload_validation_status).toBe("valid");
      expect(row.xml_candidate_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
      assertSafeEvidence(row);
    }

    const evidenceCount = await countRows(admin, "fiscal_evidence_packets", {
      user_id: user.id,
    });
    expect(evidenceCount).toBe(3);

    const transportCount = await countRows(admin, "fiscal_transport_attempts", {
      user_id: user.id,
    });
    expect(transportCount).toBe(0);
    expect(JSON.stringify(evidenceRows)).not.toContain("Suministro");
    expect(JSON.stringify(evidenceRows)).not.toContain("Signature");
  });
});
