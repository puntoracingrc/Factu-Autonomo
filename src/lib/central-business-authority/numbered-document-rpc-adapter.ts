import { createHash } from "node:crypto";

import type { CentralBusinessJson } from "./mutation-command";
import type {
  CentralBusinessDocumentSeriesReconciliationCommand,
  CentralBusinessNumberedDocumentCreateCommand,
} from "./numbered-document-command";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_NUMBERED_DOCUMENT_RPC_ADAPTER =
  "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_RPC_ADAPTER_V1";

export interface CentralBusinessDocumentSeriesReconciliationRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_idempotency_key_hash: string;
  p_request_hash: string;
  p_entity_type: string;
  p_number_template: string;
  p_fiscal_year: number;
  p_observed_max_sequence: number;
  p_source_document_count: number;
  p_source_digest: string;
}

export interface CentralBusinessNumberedDocumentCreateRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_idempotency_key_hash: string;
  p_request_hash: string;
  p_entity_type: string;
  p_entity_id: string;
  p_number_template: string;
  p_padding: number;
  p_fiscal_year: number;
  p_payload_without_number: CentralBusinessJson;
}

export interface CentralBusinessNumberedDocumentRpcClient {
  rpc(
    name:
      | "reconcile_central_business_document_series_v1"
      | "create_central_business_document_v1",
    args:
      | CentralBusinessDocumentSeriesReconciliationRpcArgs
      | CentralBusinessNumberedDocumentCreateRpcArgs,
  ): Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

export interface CentralBusinessDocumentSeriesReconciliationRpcResult {
  schema: typeof CENTRAL_BUSINESS_NUMBERED_DOCUMENT_RPC_ADAPTER;
  action: "reconcile_series";
  status: "committed" | "replayed";
  reconciliationId: string;
  scopeYear: number;
  previousSequence: number;
  resultingSequence: number;
}

export interface CentralBusinessNumberedDocumentCreateRpcResult {
  schema: typeof CENTRAL_BUSINESS_NUMBERED_DOCUMENT_RPC_ADAPTER;
  action: "create";
  status: "committed" | "replayed";
  eventId: string;
  eventSequence: number;
  entityVersion: number;
  fullNumber: string;
  sequence: number;
  scopeYear: number;
  contentHash: string;
  documentPayload: { [key: string]: CentralBusinessJson };
}

export class CentralBusinessNumberedDocumentRpcError extends Error {
  readonly code: "RPC_REJECTED" | "INVALID_RPC_RESULT";
  readonly causeCode?: string;

  constructor(
    code: CentralBusinessNumberedDocumentRpcError["code"],
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name = "CentralBusinessNumberedDocumentRpcError";
    this.code = code;
    this.causeCode = causeCode;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador RPC numerado solo puede cargarse en servidor.",
    );
  }
}

function sessionHash(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function firstRow(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export function buildCentralBusinessDocumentSeriesReconciliationRpcArgs(
  command: CentralBusinessDocumentSeriesReconciliationCommand,
): CentralBusinessDocumentSeriesReconciliationRpcArgs {
  return {
    p_user_id: command.userId,
    p_device_id: command.deviceId,
    p_session_hash: sessionHash(command.sessionId),
    p_idempotency_key_hash: command.idempotencyKeyHash,
    p_request_hash: command.requestHash,
    p_entity_type: command.entityType,
    p_number_template: command.numberTemplate,
    p_fiscal_year: command.fiscalYear,
    p_observed_max_sequence: command.observedMaxSequence,
    p_source_document_count: command.sourceDocumentCount,
    p_source_digest: command.sourceDigest,
  };
}

export function buildCentralBusinessNumberedDocumentCreateRpcArgs(
  command: CentralBusinessNumberedDocumentCreateCommand,
): CentralBusinessNumberedDocumentCreateRpcArgs {
  return {
    p_user_id: command.userId,
    p_device_id: command.deviceId,
    p_session_hash: sessionHash(command.sessionId),
    p_idempotency_key_hash: command.idempotencyKeyHash,
    p_request_hash: command.requestHash,
    p_entity_type: command.entityType,
    p_entity_id: command.entityId,
    p_number_template: command.numberTemplate,
    p_padding: command.padding,
    p_fiscal_year: command.fiscalYear,
    p_payload_without_number: command.payloadWithoutNumber,
  };
}

export async function reconcileCentralBusinessDocumentSeriesThroughRpc(
  client: CentralBusinessNumberedDocumentRpcClient,
  command: CentralBusinessDocumentSeriesReconciliationCommand,
): Promise<CentralBusinessDocumentSeriesReconciliationRpcResult> {
  const { data, error } = await client.rpc(
    "reconcile_central_business_document_series_v1",
    buildCentralBusinessDocumentSeriesReconciliationRpcArgs(command),
  );
  if (error) {
    throw new CentralBusinessNumberedDocumentRpcError(
      "RPC_REJECTED",
      "Supabase rechazo la conciliacion de numeracion.",
      error.code,
    );
  }
  const row = firstRow(data);
  if (
    !isObject(row) ||
    (row.result_status !== "committed" && row.result_status !== "replayed") ||
    typeof row.reconciliation_id !== "string" ||
    typeof row.scope_year !== "number" ||
    typeof row.previous_sequence !== "number" ||
    typeof row.resulting_sequence !== "number" ||
    !Number.isInteger(row.scope_year) ||
    !Number.isInteger(row.previous_sequence) ||
    !Number.isInteger(row.resulting_sequence) ||
    row.previous_sequence < 0 ||
    row.resulting_sequence < row.previous_sequence
  ) {
    throw new CentralBusinessNumberedDocumentRpcError(
      "INVALID_RPC_RESULT",
      "La RPC devolvio una conciliacion incompleta.",
    );
  }
  return {
    schema: CENTRAL_BUSINESS_NUMBERED_DOCUMENT_RPC_ADAPTER,
    action: "reconcile_series",
    status: row.result_status,
    reconciliationId: row.reconciliation_id,
    scopeYear: row.scope_year,
    previousSequence: row.previous_sequence,
    resultingSequence: row.resulting_sequence,
  };
}

export async function createCentralBusinessNumberedDocumentThroughRpc(
  client: CentralBusinessNumberedDocumentRpcClient,
  command: CentralBusinessNumberedDocumentCreateCommand,
): Promise<CentralBusinessNumberedDocumentCreateRpcResult> {
  const { data, error } = await client.rpc(
    "create_central_business_document_v1",
    buildCentralBusinessNumberedDocumentCreateRpcArgs(command),
  );
  if (error) {
    throw new CentralBusinessNumberedDocumentRpcError(
      "RPC_REJECTED",
      "Supabase rechazo la creacion numerada.",
      error.code,
    );
  }
  const row = firstRow(data);
  if (
    !isObject(row) ||
    (row.result_status !== "committed" && row.result_status !== "replayed") ||
    typeof row.event_id !== "string" ||
    typeof row.event_sequence !== "number" ||
    typeof row.entity_version !== "number" ||
    typeof row.full_number !== "string" ||
    typeof row.sequence !== "number" ||
    typeof row.scope_year !== "number" ||
    typeof row.content_hash !== "string" ||
    !isObject(row.document_payload) ||
    !Number.isSafeInteger(row.event_sequence) ||
    !Number.isInteger(row.entity_version) ||
    !Number.isInteger(row.sequence) ||
    !Number.isInteger(row.scope_year) ||
    row.entity_version < 1 ||
    row.sequence < 1
  ) {
    throw new CentralBusinessNumberedDocumentRpcError(
      "INVALID_RPC_RESULT",
      "La RPC devolvio un documento numerado incompleto.",
    );
  }
  return {
    schema: CENTRAL_BUSINESS_NUMBERED_DOCUMENT_RPC_ADAPTER,
    action: "create",
    status: row.result_status,
    eventId: row.event_id,
    eventSequence: row.event_sequence,
    entityVersion: row.entity_version,
    fullNumber: row.full_number,
    sequence: row.sequence,
    scopeYear: row.scope_year,
    contentHash: row.content_hash,
    documentPayload:
      row.document_payload as { [key: string]: CentralBusinessJson },
  };
}
