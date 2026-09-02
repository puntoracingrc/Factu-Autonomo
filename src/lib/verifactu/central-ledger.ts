import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type {
  CentralInvoiceVerifactuSource,
  CentralVerifactuChainHead,
  CentralVerifactuRecordCandidate,
} from "./central-source";

export type CentralVerifactuRecordStatus =
  | "prepared"
  | "sending"
  | "delivery_unknown"
  | "accepted"
  | "accepted_with_errors"
  | "rejected";

export interface CentralVerifactuStoredRecord {
  id: string;
  centralIdentityId: string;
  issuerNif: string;
  status: CentralVerifactuRecordStatus;
  recordHash: string;
  xml: string;
  xmlSha256: string;
  qrUrl: string;
  csv: string | null;
  aeatEstadoEnvio: string | null;
  aeatEstadoRegistro: string | null;
  aeatDuplicateState: string | null;
}

export interface CentralVerifactuPrepareInput {
  userId: string;
  source: CentralInvoiceVerifactuSource;
  certificateBindingId: string;
  certificateBindingVersion: number;
  candidate: CentralVerifactuRecordCandidate;
  endpointUrl: string;
}

export interface CentralVerifactuPrepareResult {
  resultStatus:
    | "prepared"
    | "replayed_accepted"
    | "replayed_pending"
    | "replayed_requires_retry";
  recordId: string;
  attemptId: string | null;
  recordStatus: CentralVerifactuRecordStatus;
}

export interface CentralVerifactuRetryResult {
  resultStatus:
    | "already_accepted"
    | "already_queued"
    | "already_sending"
    | "retry_queued";
  attemptId: string | null;
  attemptNumber: number | null;
}

export interface CentralVerifactuClaimedAttempt {
  recordId: string;
  attemptId: string;
  leaseToken: string;
  endpointUrl: string;
  xml: string;
  xmlSha256: string;
  issuerNif: string;
  certificateBindingId: string;
  certificateBindingVersion: number;
}

export interface CentralVerifactuAttemptCompletion {
  userId: string;
  attemptId: string;
  leaseToken: string;
  outcome:
    | "accepted"
    | "accepted_duplicate"
    | "accepted_with_errors"
    | "rejected"
    | "delivery_unknown";
  httpStatus: number | null;
  csv: string | null;
  estadoEnvio: string | null;
  estadoRegistro: string | null;
  duplicateState: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  rawResponse: string | null;
  responseSha256: string | null;
}

export interface CentralVerifactuLedgerRepository {
  readSource(input: {
    userId: string;
    localDocumentId: string;
  }): Promise<CentralInvoiceVerifactuSource>;
  loadExistingRecord(input: {
    userId: string;
    centralIdentityId: string;
  }): Promise<CentralVerifactuStoredRecord | null>;
  loadChain(input: {
    userId: string;
    issuerNif: string;
  }): Promise<CentralVerifactuChainHead | null>;
  prepareRecord(
    input: CentralVerifactuPrepareInput,
  ): Promise<CentralVerifactuPrepareResult>;
  queueRetry(input: {
    userId: string;
    recordId: string;
    certificateBindingId: string;
    certificateBindingVersion: number;
    endpointUrl: string;
  }): Promise<CentralVerifactuRetryResult>;
  claimAttempt(input: {
    userId: string;
    attemptId: string;
  }): Promise<CentralVerifactuClaimedAttempt>;
  completeAttempt(input: CentralVerifactuAttemptCompletion): Promise<{
    recordId: string;
    recordStatus: CentralVerifactuRecordStatus;
    completedAt: string;
  }>;
}

export type CentralVerifactuLedgerErrorCode =
  | "LEDGER_UNAVAILABLE"
  | "SOURCE_NOT_FOUND"
  | "CHAIN_CONFLICT"
  | "LEDGER_REJECTED"
  | "INVALID_LEDGER_RESULT";

export class CentralVerifactuLedgerError extends Error {
  constructor(
    readonly code: CentralVerifactuLedgerErrorCode,
    readonly causeCode?: string,
  ) {
    super(code);
    this.name = "CentralVerifactuLedgerError";
  }
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

function firstRow(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row && typeof row === "object" && !Array.isArray(row)
    ? (row as Record<string, unknown>)
    : null;
}

function requiredString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value) {
    throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
  }
  return value;
}

function stringValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
  }
  return value;
}

function nullableString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
  }
  return value;
}

function requiredInteger(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
  }
  return value;
}

function optionalInteger(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return requiredInteger(row, key);
}

function ledgerFailure(error: SupabaseErrorLike | null, source = false): never {
  if (source && error?.code === "P0002") {
    throw new CentralVerifactuLedgerError("SOURCE_NOT_FOUND", error.code);
  }
  if (error?.code === "40001") {
    throw new CentralVerifactuLedgerError("CHAIN_CONFLICT", error.code);
  }
  throw new CentralVerifactuLedgerError("LEDGER_REJECTED", error?.code);
}

function parseRecordStatus(value: unknown): CentralVerifactuRecordStatus {
  if (
    value === "prepared" ||
    value === "sending" ||
    value === "delivery_unknown" ||
    value === "accepted" ||
    value === "accepted_with_errors" ||
    value === "rejected"
  ) {
    return value;
  }
  throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
}

export function createSupabaseCentralVerifactuLedgerRepository(
  admin: SupabaseClient | null = getSupabaseAdmin(),
): CentralVerifactuLedgerRepository {
  if (!admin) {
    throw new CentralVerifactuLedgerError("LEDGER_UNAVAILABLE");
  }

  return {
    async readSource(input) {
      const { data, error } = await admin.rpc(
        "read_central_invoice_verifactu_source_v1",
        {
          p_user_id: input.userId,
          p_local_document_id: input.localDocumentId,
        },
      );
      if (error) ledgerFailure(error, true);
      const row = firstRow(data);
      if (!row) {
        throw new CentralVerifactuLedgerError("SOURCE_NOT_FOUND");
      }
      const centralKind = requiredString(row, "central_kind");
      if (centralKind !== "invoice" && centralKind !== "rectification") {
        throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
      }
      const centralEnvironment = requiredString(
        row,
        "central_environment",
      );
      if (centralEnvironment !== "test") {
        throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
      }
      return {
        centralDocumentId: requiredString(row, "central_document_id"),
        centralIdentityId: requiredString(row, "central_identity_id"),
        centralKind,
        environment: centralEnvironment,
        localDocumentId: requiredString(row, "local_document_id"),
        issuerNif: requiredString(row, "issuer_nif"),
        fullNumber: requiredString(row, "full_number"),
        centralIssuedAt: requiredString(row, "central_issued_at"),
        emittedSnapshot: row.emitted_snapshot,
        emittedHash: requiredString(row, "emitted_hash"),
      };
    },

    async loadExistingRecord(input) {
      const { data, error } = await admin
        .from("central_verifactu_records")
        .select(
          "id,central_identity_id,issuer_nif,status,record_hash,xml_payload,xml_sha256,qr_url,csv,aeat_estado_envio,aeat_estado_registro,aeat_duplicate_state",
        )
        .eq("user_id", input.userId)
        .eq("central_identity_id", input.centralIdentityId)
        .eq("environment", "test")
        .maybeSingle();
      if (error) ledgerFailure(error);
      if (!data) return null;
      const row = data as unknown as Record<string, unknown>;
      return {
        id: requiredString(row, "id"),
        centralIdentityId: requiredString(row, "central_identity_id"),
        issuerNif: requiredString(row, "issuer_nif"),
        status: parseRecordStatus(row.status),
        recordHash: requiredString(row, "record_hash"),
        xml: requiredString(row, "xml_payload"),
        xmlSha256: requiredString(row, "xml_sha256"),
        qrUrl: requiredString(row, "qr_url"),
        csv: nullableString(row, "csv"),
        aeatEstadoEnvio: nullableString(row, "aeat_estado_envio"),
        aeatEstadoRegistro: nullableString(row, "aeat_estado_registro"),
        aeatDuplicateState: nullableString(row, "aeat_duplicate_state"),
      };
    },

    async loadChain(input) {
      const { data, error } = await admin
        .from("central_verifactu_chain_state")
        .select(
          "last_hash,last_numserie,last_fecha_expedicion,record_count,state_version",
        )
        .eq("user_id", input.userId)
        .eq("issuer_nif", input.issuerNif)
        .eq("environment", "test")
        .maybeSingle();
      if (error) ledgerFailure(error);
      if (!data) return null;
      const row = data as unknown as Record<string, unknown>;
      return {
        lastHash: stringValue(row, "last_hash"),
        lastNumserie: nullableString(row, "last_numserie"),
        lastFechaExpedicion: nullableString(row, "last_fecha_expedicion"),
        recordCount: requiredInteger(row, "record_count"),
        stateVersion: requiredInteger(row, "state_version"),
      };
    },

    async prepareRecord(input) {
      const c = input.candidate;
      const { data, error } = await admin.rpc(
        "prepare_central_verifactu_record_v1",
        {
          p_user_id: input.userId,
          p_central_document_id: input.source.centralDocumentId,
          p_central_identity_id: input.source.centralIdentityId,
          p_certificate_binding_id: input.certificateBindingId,
          p_certificate_binding_version: input.certificateBindingVersion,
          p_issuer_nif: c.issuerNif,
          p_environment: "test",
          p_record_type: c.recordType,
          p_record_hash: c.recordHash,
          p_previous_hash: c.previousHash,
          p_previous_numserie: c.previousNumserie,
          p_previous_fecha_expedicion: c.previousFechaExpedicion,
          p_record_timestamp_text: c.recordTimestamp,
          p_numserie: c.numserie,
          p_fecha_expedicion: c.fechaExpedicion,
          p_tipo_factura: c.tipoFactura,
          p_xml_payload: c.xml,
          p_xml_sha256: c.xmlSha256,
          p_qr_url: c.qrUrl,
          p_endpoint_url: input.endpointUrl,
        },
      );
      if (error) ledgerFailure(error);
      const row = firstRow(data);
      if (!row) {
        throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
      }
      const resultStatus = requiredString(row, "result_status");
      if (
        resultStatus !== "prepared" &&
        resultStatus !== "replayed_accepted" &&
        resultStatus !== "replayed_pending" &&
        resultStatus !== "replayed_requires_retry"
      ) {
        throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
      }
      return {
        resultStatus,
        recordId: requiredString(row, "record_id"),
        attemptId: nullableString(row, "attempt_id"),
        recordStatus: parseRecordStatus(row.record_status),
      };
    },

    async queueRetry(input) {
      const { data, error } = await admin.rpc(
        "queue_central_verifactu_retry_v1",
        {
          p_user_id: input.userId,
          p_record_id: input.recordId,
          p_certificate_binding_id: input.certificateBindingId,
          p_certificate_binding_version: input.certificateBindingVersion,
          p_endpoint_url: input.endpointUrl,
        },
      );
      if (error) ledgerFailure(error);
      const row = firstRow(data);
      if (!row) {
        throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
      }
      const resultStatus = requiredString(row, "result_status");
      if (
        resultStatus !== "already_accepted" &&
        resultStatus !== "already_queued" &&
        resultStatus !== "already_sending" &&
        resultStatus !== "retry_queued"
      ) {
        throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
      }
      return {
        resultStatus,
        attemptId: nullableString(row, "attempt_id"),
        attemptNumber: optionalInteger(row, "attempt_number"),
      };
    },

    async claimAttempt(input) {
      const { data, error } = await admin.rpc(
        "claim_central_verifactu_attempt_v1",
        {
          p_user_id: input.userId,
          p_attempt_id: input.attemptId,
          p_lease_seconds: 90,
        },
      );
      if (error) ledgerFailure(error);
      const row = firstRow(data);
      if (!row) {
        throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
      }
      return {
        recordId: requiredString(row, "record_id"),
        attemptId: requiredString(row, "attempt_id"),
        leaseToken: requiredString(row, "lease_token"),
        endpointUrl: requiredString(row, "endpoint_url"),
        xml: requiredString(row, "xml_payload"),
        xmlSha256: requiredString(row, "xml_sha256"),
        issuerNif: requiredString(row, "issuer_nif"),
        certificateBindingId: requiredString(
          row,
          "certificate_binding_id",
        ),
        certificateBindingVersion: requiredInteger(
          row,
          "certificate_binding_version",
        ),
      };
    },

    async completeAttempt(input) {
      const { data, error } = await admin.rpc(
        "complete_central_verifactu_attempt_v1",
        {
          p_user_id: input.userId,
          p_attempt_id: input.attemptId,
          p_lease_token: input.leaseToken,
          p_outcome: input.outcome,
          p_http_status: input.httpStatus,
          p_csv: input.csv,
          p_estado_envio: input.estadoEnvio,
          p_estado_registro: input.estadoRegistro,
          p_duplicate_state: input.duplicateState,
          p_error_code: input.errorCode,
          p_error_message: input.errorMessage,
          p_response_payload: input.rawResponse,
          p_response_sha256: input.responseSha256,
        },
      );
      if (error) ledgerFailure(error);
      const row = firstRow(data);
      if (!row) {
        throw new CentralVerifactuLedgerError("INVALID_LEDGER_RESULT");
      }
      return {
        recordId: requiredString(row, "record_id"),
        recordStatus: parseRecordStatus(row.record_status),
        completedAt: requiredString(row, "completed_at"),
      };
    },
  };
}
