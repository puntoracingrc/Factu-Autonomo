import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  FiscalEvidenceIntegrityChecker,
  SupabaseFiscalEvidenceIntegrityStore,
  type SupabaseFiscalEvidenceIntegrityClient,
} from "@/lib/fiscal-evidence-integrity";
import {
  FiscalEvidenceOperationalSummaryBuilder,
  SupabaseFiscalEvidenceOperationalSummaryStore,
  type SupabaseFiscalEvidenceOperationalSummaryClient,
} from "@/lib/fiscal-evidence-operational-summary";
import type { FiscalOperationType } from "@/lib/fiscal-operations";

const enabled = process.env.PHASE2B4U_LOCAL_ACCEPTANCE === "1";
const maybeDescribe = enabled ? describe.sequential : describe.skip;
const prefix = `phase2b4u_${randomUUID().replaceAll("-", "_")}`;
const password = `Phase2B4U-${randomUUID()}!`;
const now = "2026-06-25T18:30:00.000Z";
const issuerNif = `B4U${prefix.slice(-8).toUpperCase()}`;

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

interface LocalFiscalRecord {
  readonly id: string;
  readonly recordHash: string;
  readonly previousHash: string | null;
  readonly recordSequence: number;
}

function candidateHash(label: string, previousHash: string | null): string {
  return `sha256:${createHash("sha256")
    .update(`${prefix}|${label}|${previousHash ?? "first"}`)
    .digest("hex")}`;
}

function candidateXmlDigest(label: string): string {
  return `sha256:${createHash("sha256")
    .update(`${prefix}|${label}|xml-candidate-digest-only`)
    .digest("hex")}`;
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
      payload: { source: "phase2b4u-redacted" },
      document_snapshot: { source: "phase2b4u-redacted" },
      pdf_snapshot: { source: "phase2b4u-redacted" },
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
): Promise<LocalFiscalRecord> {
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
        p_renderer_version: "phase2b4u-test",
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
    return {
      id: String(row.record_id),
      recordHash: String(row.record_hash),
      previousHash:
        typeof row.record_previous_hash === "string"
          ? row.record_previous_hash
          : null,
      recordSequence: Number(row.record_sequence),
    };
  }
  fail(`Atomic create did not settle for ${label}.`);
}

async function persistEvidence(
  admin: SupabaseClient,
  userId: string,
  recordId: string,
  label: string,
) {
  const { data, error } = await admin
    .rpc("create_fiscal_evidence_packet_local_staging", {
      p_user_id: userId,
      p_record_id: recordId,
      p_payload_candidate_id: `${prefix}_${label}_payload`,
      p_payload_validation_status: "valid",
      p_xml_candidate_digest: candidateXmlDigest(label),
      p_evidence_finality: "internal_dry_run_evidence",
      p_transportable: false,
      p_metadata_safe: {
        phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
        evidencePacketPhase:
          "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1",
        source: "local_staging_internal_evidence",
        includesFullXml: false,
        includesDocumentMaterial: false,
        signed: false,
        aeatReady: false,
        payloadXmlMarkerPresent: true,
      },
      p_created_at: now,
    })
    .single();
  if (error || !data) {
    fail(
      `create_fiscal_evidence_packet_local_staging failed: ${error?.message ?? "empty result"}`,
    );
  }
  const row = data as Record<string, unknown>;
  if (row.result_status !== "created") {
    fail(`Expected created evidence, received ${String(row.result_status)}.`);
  }
  return row;
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

function assertSafeSummary(value: unknown): void {
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
  expect(serialized).not.toContain("Suministro");
  expect(serialized).not.toContain("fiscal_transport_attempts");
}

maybeDescribe("Phase 2B.4U fiscal evidence operational summary acceptance", () => {
  it("resume evidencia local para alta, encadenada y anulacion sin transporte", async () => {
    const apiUrl = requiredEnv("PHASE2B4U_SUPABASE_URL");
    const adminKey = requiredEnv("PHASE2B4U_SUPABASE_ADMIN_KEY");
    assertLocalUrl(apiUrl, "Supabase API URL");

    const admin = client(apiUrl, adminKey);
    const summaryStore = new SupabaseFiscalEvidenceOperationalSummaryStore(
      admin as unknown as SupabaseFiscalEvidenceOperationalSummaryClient,
    );
    const integrityStore = new SupabaseFiscalEvidenceIntegrityStore(
      admin as unknown as SupabaseFiscalEvidenceIntegrityClient,
    );
    const summaryBuilder = new FiscalEvidenceOperationalSummaryBuilder(
      summaryStore,
      new FiscalEvidenceIntegrityChecker(integrityStore),
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

    const first = await createAtomicRecord(
      admin,
      user.id,
      firstOperationId,
      "first",
    );
    const second = await createAtomicRecord(
      admin,
      user.id,
      secondOperationId,
      "second",
    );
    const anulacion = await createAtomicRecord(
      admin,
      user.id,
      anulacionOperationId,
      "anulacion",
    );

    expect(first).toMatchObject({ recordSequence: 1, previousHash: null });
    expect(second).toMatchObject({
      recordSequence: 2,
      previousHash: first.recordHash,
    });
    expect(anulacion).toMatchObject({
      recordSequence: 3,
      previousHash: second.recordHash,
    });

    await persistEvidence(admin, user.id, first.id, "alta_1");
    await persistEvidence(admin, user.id, second.id, "alta_2");
    await persistEvidence(admin, user.id, anulacion.id, "anulacion");

    const summary = await summaryBuilder.buildFiscalEvidenceOperationalSummary({
      userId: user.id,
      environment: "test",
      generatedAt: now,
    });

    expect(summary).toMatchObject({
      phase: "PHASE2B4U_FISCAL_EVIDENCE_OPERATIONAL_SUMMARY_CHECKPOINT_V1",
      status: "ok",
      totalEvidencePackets: 3,
      totalCoveredRecords: 3,
      latestRecordSequence: 3,
      latestRecordHash: anulacion.recordHash,
      validEvidenceCount: 3,
      mismatchEvidenceCount: 0,
      rejectedEvidenceCount: 0,
      unsafeMetadataEvidenceCount: 0,
      missingRecordCount: 0,
      missingChainCount: 0,
      hasSequenceGaps: false,
      sequenceGaps: [],
      hasTransportableNotFalse: false,
      hasFullXmlOrSnapshotMetadata: false,
      transportAttemptCount: 0,
      hasTransportAttempts: false,
    });
    assertSafeSummary(summary);

    const evidenceCount = await countRows(admin, "fiscal_evidence_packets", {
      user_id: user.id,
      environment: "test",
    });
    expect(evidenceCount).toBe(3);

    const transportCount = await countRows(admin, "fiscal_transport_attempts", {
      user_id: user.id,
      environment: "test",
    });
    expect(transportCount).toBe(0);
  });
});
