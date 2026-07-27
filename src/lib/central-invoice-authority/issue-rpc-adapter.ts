import { createHash } from "node:crypto";

import type { CentralInvoiceAuthorityIssueCommand } from "./issue-command";

// CENTRAL_INVOICE_AUTHORITY_RPC_ADAPTER_V1
assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_RPC_ADAPTER =
  "CENTRAL_INVOICE_AUTHORITY_RPC_ADAPTER_V1";

export type CentralInvoiceAuthorityJson =
  | null
  | boolean
  | number
  | string
  | CentralInvoiceAuthorityJson[]
  | { [key: string]: CentralInvoiceAuthorityJson };

export interface CentralInvoiceAuthorityIssueRpcClient {
  rpc(
    name: "issue_central_invoice_v1",
    args: CentralInvoiceAuthorityIssueRpcArgs,
  ): Promise<{
    data: unknown;
    error: CentralInvoiceAuthorityIssueRpcError | null;
  }>;
}

export interface CentralInvoiceAuthorityIssueRpcError {
  code?: string;
  message: string;
}

export interface CentralInvoiceAuthorityIssueRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_idempotency_key_hash: string;
  p_request_hash: string;
  p_kind: CentralInvoiceAuthorityIssueCommand["kind"];
  p_local_document_id: string;
  p_expected_version: number;
  p_draft_hash: string;
  p_environment: CentralInvoiceAuthorityIssueCommand["series"]["environment"];
  p_issuer_nif: string;
  p_series_code: string;
  p_fiscal_year: number;
  p_issued_at: string;
  p_document_payload: CentralInvoiceAuthorityJson;
  p_emitted_snapshot: CentralInvoiceAuthorityJson;
  p_emitted_hash: string;
  p_rectifies_identity_id: string | null;
}

export interface CentralInvoiceAuthorityIssueRpcInput {
  command: CentralInvoiceAuthorityIssueCommand;
  documentPayload: CentralInvoiceAuthorityJson;
  emittedSnapshot: CentralInvoiceAuthorityJson;
  emittedHash: string;
}

export type CentralInvoiceAuthorityIssueRpcResultStatus = "committed" | "replayed";

export interface CentralInvoiceAuthorityIssueRpcResult {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_RPC_ADAPTER;
  status: CentralInvoiceAuthorityIssueRpcResultStatus;
  documentId: string;
  identityId: string;
  outboxEventId: string;
  fullNumber: string;
  sequence: number;
  documentVersion: number;
}

export type CentralInvoiceAuthorityIssueRpcAdapterErrorCode =
  | "INVALID_RPC_INPUT"
  | "RPC_REJECTED"
  | "INVALID_RPC_RESULT";

export class CentralInvoiceAuthorityIssueRpcAdapterError extends Error {
  readonly code: CentralInvoiceAuthorityIssueRpcAdapterErrorCode;
  readonly causeCode?: string;

  constructor(
    code: CentralInvoiceAuthorityIssueRpcAdapterErrorCode,
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name = "CentralInvoiceAuthorityIssueRpcAdapterError";
    this.code = code;
    this.causeCode = causeCode;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador RPC de autoridad central solo puede cargarse en servidor.",
    );
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertJsonObjectOrArray(value: CentralInvoiceAuthorityJson, label: string) {
  if (!isObject(value) && !Array.isArray(value)) {
    throw new CentralInvoiceAuthorityIssueRpcAdapterError(
      "INVALID_RPC_INPUT",
      `${label} debe ser un objeto o array JSON preparado por servidor.`,
    );
  }
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new CentralInvoiceAuthorityIssueRpcAdapterError(
      "INVALID_RPC_INPUT",
      `${label} no puede estar vacio.`,
    );
  }
}

export function buildCentralInvoiceAuthorityIssueRpcArgs(
  input: CentralInvoiceAuthorityIssueRpcInput,
): CentralInvoiceAuthorityIssueRpcArgs {
  const { command } = input;
  assertNonEmpty(input.emittedHash, "emittedHash");
  assertJsonObjectOrArray(input.documentPayload, "documentPayload");
  assertJsonObjectOrArray(input.emittedSnapshot, "emittedSnapshot");

  return {
    p_user_id: command.userId,
    p_device_id: command.deviceId,
    p_session_hash: sha256(command.sessionId),
    p_idempotency_key_hash: command.safeSummary.idempotencyKeyHash,
    p_request_hash: command.requestHash,
    p_kind: command.kind,
    p_local_document_id: command.draft.localDocumentId,
    p_expected_version: command.draft.expectedVersion,
    p_draft_hash: command.draft.draftHash,
    p_environment: command.series.environment,
    p_issuer_nif: command.series.issuerNif,
    p_series_code: command.series.seriesCode,
    p_fiscal_year: command.series.fiscalYear,
    p_issued_at: command.issuedAt,
    p_document_payload: input.documentPayload,
    p_emitted_snapshot: input.emittedSnapshot,
    p_emitted_hash: input.emittedHash,
    p_rectifies_identity_id: command.rectifiesIdentityId ?? null,
  };
}

function parseRpcRow(row: unknown): CentralInvoiceAuthorityIssueRpcResult {
  if (!isObject(row)) {
    throw new CentralInvoiceAuthorityIssueRpcAdapterError(
      "INVALID_RPC_RESULT",
      "La RPC de emision central no devolvio una fila de resultado.",
    );
  }

  const status = row.result_status;
  const documentId = row.document_id;
  const identityId = row.identity_id;
  const outboxEventId = row.outbox_event_id;
  const fullNumber = row.full_number;
  const sequence = row.sequence;
  const documentVersion = row.document_version;

  if (
    (status !== "committed" && status !== "replayed") ||
    typeof documentId !== "string" ||
    typeof identityId !== "string" ||
    typeof outboxEventId !== "string" ||
    typeof fullNumber !== "string" ||
    typeof sequence !== "number" ||
    typeof documentVersion !== "number"
  ) {
    throw new CentralInvoiceAuthorityIssueRpcAdapterError(
      "INVALID_RPC_RESULT",
      "La RPC de emision central devolvio un resultado incompleto.",
    );
  }

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_RPC_ADAPTER,
    status,
    documentId,
    identityId,
    outboxEventId,
    fullNumber,
    sequence,
    documentVersion,
  };
}

export async function issueCentralInvoiceThroughRpc(
  client: CentralInvoiceAuthorityIssueRpcClient,
  input: CentralInvoiceAuthorityIssueRpcInput,
): Promise<CentralInvoiceAuthorityIssueRpcResult> {
  const args = buildCentralInvoiceAuthorityIssueRpcArgs(input);
  const { data, error } = await client.rpc("issue_central_invoice_v1", args);

  if (error) {
    throw new CentralInvoiceAuthorityIssueRpcAdapterError(
      "RPC_REJECTED",
      "Supabase rechazo la emision central.",
      error.code,
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  return parseRpcRow(row);
}
