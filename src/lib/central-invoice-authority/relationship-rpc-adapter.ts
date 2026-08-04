import { createHash } from "node:crypto";

assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_RPC_ADAPTER =
  "CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_RPC_ADAPTER_V1";

export interface CentralInvoiceAuthorityRelationshipRpcClient {
  rpc(
    name: "unlink_central_invoice_quote_v1",
    args: CentralInvoiceAuthorityRelationshipRpcArgs,
  ): Promise<{
    data: unknown;
    error: CentralInvoiceAuthorityRelationshipRpcError | null;
  }>;
}

export interface CentralInvoiceAuthorityRelationshipRpcError {
  code?: string;
  message: string;
}

export interface CentralInvoiceAuthorityRelationshipRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_idempotency_key_hash: string;
  p_request_hash: string;
  p_document_id: string;
  p_identity_id: string;
  p_expected_version: number;
}

export interface CentralInvoiceAuthorityRelationshipRpcInput {
  auth: {
    userId: string;
    deviceId: string;
    sessionId: string;
  };
  idempotencyKey: string;
  documentRef: {
    serverDocumentId: string;
    identityId: string;
    expectedVersion: number;
  };
}

export interface CentralInvoiceAuthorityRelationshipRpcResult {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_RPC_ADAPTER;
  status: "committed" | "replayed";
  documentId: string;
  identityId: string;
  outboxEventId: string;
  fullNumber: string;
  sequence: number;
  documentVersion: number;
}

export type CentralInvoiceAuthorityRelationshipRpcAdapterErrorCode =
  | "INVALID_RELATIONSHIP_RPC_INPUT"
  | "RELATIONSHIP_RPC_REJECTED"
  | "INVALID_RELATIONSHIP_RPC_RESULT";

export class CentralInvoiceAuthorityRelationshipRpcAdapterError extends Error {
  readonly code: CentralInvoiceAuthorityRelationshipRpcAdapterErrorCode;
  readonly causeCode?: string;
  readonly causeMessage?: string;

  constructor(
    code: CentralInvoiceAuthorityRelationshipRpcAdapterErrorCode,
    message: string,
    causeCode?: string,
    causeMessage?: string,
  ) {
    super(message);
    this.name = "CentralInvoiceAuthorityRelationshipRpcAdapterError";
    this.code = code;
    this.causeCode = causeCode;
    this.causeMessage = causeMessage;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador RPC de relaciones centrales solo puede cargarse en servidor.",
    );
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new CentralInvoiceAuthorityRelationshipRpcAdapterError(
      "INVALID_RELATIONSHIP_RPC_INPUT",
      `${label} no puede estar vacio.`,
    );
  }
}

function assertIdempotencyKey(value: string) {
  if (!/^[a-zA-Z0-9:_-]{12,120}$/.test(value)) {
    throw new CentralInvoiceAuthorityRelationshipRpcAdapterError(
      "INVALID_RELATIONSHIP_RPC_INPUT",
      "La desvinculacion central requiere una clave de idempotencia estable.",
    );
  }
}

export function buildCentralInvoiceAuthorityRelationshipRpcArgs(
  input: CentralInvoiceAuthorityRelationshipRpcInput,
): CentralInvoiceAuthorityRelationshipRpcArgs {
  assertNonEmpty(input.auth.userId, "userId");
  assertNonEmpty(input.auth.deviceId, "deviceId");
  assertNonEmpty(input.auth.sessionId, "sessionId");
  assertIdempotencyKey(input.idempotencyKey);
  assertNonEmpty(input.documentRef.serverDocumentId, "serverDocumentId");
  assertNonEmpty(input.documentRef.identityId, "identityId");
  if (
    !Number.isInteger(input.documentRef.expectedVersion) ||
    input.documentRef.expectedVersion <= 0
  ) {
    throw new CentralInvoiceAuthorityRelationshipRpcAdapterError(
      "INVALID_RELATIONSHIP_RPC_INPUT",
      "La desvinculacion central requiere una version central positiva.",
    );
  }

  return {
    p_user_id: input.auth.userId,
    p_device_id: input.auth.deviceId,
    p_session_hash: sha256(input.auth.sessionId),
    p_idempotency_key_hash: sha256(input.idempotencyKey),
    p_request_hash: sha256(stableJson(input)),
    p_document_id: input.documentRef.serverDocumentId,
    p_identity_id: input.documentRef.identityId,
    p_expected_version: input.documentRef.expectedVersion,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseRpcRow(
  row: unknown,
): CentralInvoiceAuthorityRelationshipRpcResult {
  if (!isObject(row)) {
    throw new CentralInvoiceAuthorityRelationshipRpcAdapterError(
      "INVALID_RELATIONSHIP_RPC_RESULT",
      "La RPC de relaciones centrales no devolvio una fila de resultado.",
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
    !Number.isInteger(sequence) ||
    sequence <= 0 ||
    typeof documentVersion !== "number" ||
    !Number.isInteger(documentVersion) ||
    documentVersion <= 0
  ) {
    throw new CentralInvoiceAuthorityRelationshipRpcAdapterError(
      "INVALID_RELATIONSHIP_RPC_RESULT",
      "La RPC de relaciones centrales devolvio un resultado incompleto.",
    );
  }

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_RPC_ADAPTER,
    status,
    documentId,
    identityId,
    outboxEventId,
    fullNumber,
    sequence,
    documentVersion,
  };
}

export async function unlinkCentralInvoiceQuoteThroughRpc(
  client: CentralInvoiceAuthorityRelationshipRpcClient,
  input: CentralInvoiceAuthorityRelationshipRpcInput,
): Promise<CentralInvoiceAuthorityRelationshipRpcResult> {
  const args = buildCentralInvoiceAuthorityRelationshipRpcArgs(input);
  const { data, error } = await client.rpc(
    "unlink_central_invoice_quote_v1",
    args,
  );

  if (error) {
    throw new CentralInvoiceAuthorityRelationshipRpcAdapterError(
      "RELATIONSHIP_RPC_REJECTED",
      "Supabase rechazo la desvinculacion central.",
      error.code,
      error.message,
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  return parseRpcRow(row);
}
