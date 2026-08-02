import { createHash } from "node:crypto";

import type { DocumentPaymentStatus, DocumentStatus } from "@/lib/types";

import type { CentralInvoiceAuthorityJson } from "./issue-rpc-adapter";

assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_COLLECTION_RPC_ADAPTER =
  "CENTRAL_INVOICE_AUTHORITY_COLLECTION_RPC_ADAPTER_V1";

export type CentralInvoiceAuthorityCollectionDocumentStatus = Extract<
  DocumentStatus,
  "enviado" | "pagado" | "vencido"
>;

export type CentralInvoiceAuthorityCollectionPaymentStatus = Extract<
  DocumentPaymentStatus,
  "pending" | "paid" | "overdue"
>;

export interface CentralInvoiceAuthorityCollectionRpcClient {
  rpc(
    name: "update_central_invoice_collection_v1",
    args: CentralInvoiceAuthorityCollectionRpcArgs,
  ): Promise<{
    data: unknown;
    error: CentralInvoiceAuthorityCollectionRpcError | null;
  }>;
}

export interface CentralInvoiceAuthorityCollectionRpcError {
  code?: string;
  message: string;
}

export interface CentralInvoiceAuthorityCollectionRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_idempotency_key_hash: string;
  p_request_hash: string;
  p_document_id: string;
  p_identity_id: string;
  p_expected_version: number;
  p_status: CentralInvoiceAuthorityCollectionDocumentStatus;
  p_payment_status: CentralInvoiceAuthorityCollectionPaymentStatus;
  p_paid_at: string | null;
  p_document_payload: CentralInvoiceAuthorityJson;
}

export interface CentralInvoiceAuthorityCollectionRpcInput {
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
  status: CentralInvoiceAuthorityCollectionDocumentStatus;
  paymentStatus: CentralInvoiceAuthorityCollectionPaymentStatus;
  paidAt: string | null;
  documentPayload: CentralInvoiceAuthorityJson;
}

export type CentralInvoiceAuthorityCollectionRpcResultStatus =
  | "committed"
  | "replayed";

export interface CentralInvoiceAuthorityCollectionRpcResult {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_COLLECTION_RPC_ADAPTER;
  status: CentralInvoiceAuthorityCollectionRpcResultStatus;
  documentId: string;
  identityId: string;
  outboxEventId: string;
  fullNumber: string;
  sequence: number;
  documentVersion: number;
}

export type CentralInvoiceAuthorityCollectionRpcAdapterErrorCode =
  | "INVALID_COLLECTION_RPC_INPUT"
  | "COLLECTION_RPC_REJECTED"
  | "INVALID_COLLECTION_RPC_RESULT";

export class CentralInvoiceAuthorityCollectionRpcAdapterError extends Error {
  readonly code: CentralInvoiceAuthorityCollectionRpcAdapterErrorCode;
  readonly causeCode?: string;
  readonly causeMessage?: string;

  constructor(
    code: CentralInvoiceAuthorityCollectionRpcAdapterErrorCode,
    message: string,
    causeCode?: string,
    causeMessage?: string,
  ) {
    super(message);
    this.name = "CentralInvoiceAuthorityCollectionRpcAdapterError";
    this.code = code;
    this.causeCode = causeCode;
    this.causeMessage = causeMessage;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador RPC de cobro central solo puede cargarse en servidor.",
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

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertJsonObjectOrArray(value: CentralInvoiceAuthorityJson, label: string) {
  if (!isObject(value) && !Array.isArray(value)) {
    throw new CentralInvoiceAuthorityCollectionRpcAdapterError(
      "INVALID_COLLECTION_RPC_INPUT",
      `${label} debe ser un objeto o array JSON preparado por servidor.`,
    );
  }
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new CentralInvoiceAuthorityCollectionRpcAdapterError(
      "INVALID_COLLECTION_RPC_INPUT",
      `${label} no puede estar vacio.`,
    );
  }
}

function assertIdempotencyKey(value: string) {
  if (!/^[a-zA-Z0-9:_-]{12,120}$/.test(value)) {
    throw new CentralInvoiceAuthorityCollectionRpcAdapterError(
      "INVALID_COLLECTION_RPC_INPUT",
      "La actualizacion central de cobro requiere una clave de idempotencia estable.",
    );
  }
}

function assertCollectionStatus(input: CentralInvoiceAuthorityCollectionRpcInput) {
  const valid =
    (input.status === "pagado" &&
      input.paymentStatus === "paid" &&
      typeof input.paidAt === "string" &&
      !Number.isNaN(Date.parse(input.paidAt))) ||
    (input.status === "enviado" &&
      input.paymentStatus === "pending" &&
      input.paidAt === null) ||
    (input.status === "vencido" &&
      input.paymentStatus === "overdue" &&
      input.paidAt === null);

  if (!valid) {
    throw new CentralInvoiceAuthorityCollectionRpcAdapterError(
      "INVALID_COLLECTION_RPC_INPUT",
      "Estado de cobro central incoherente.",
    );
  }
}

function requestHashPayload(input: CentralInvoiceAuthorityCollectionRpcInput) {
  return {
    userId: input.auth.userId,
    deviceId: input.auth.deviceId,
    sessionId: input.auth.sessionId,
    idempotencyKey: input.idempotencyKey,
    documentRef: input.documentRef,
    status: input.status,
    paymentStatus: input.paymentStatus,
    paidAt: input.paidAt,
    documentPayload: input.documentPayload,
  };
}

export function buildCentralInvoiceAuthorityCollectionRpcArgs(
  input: CentralInvoiceAuthorityCollectionRpcInput,
): CentralInvoiceAuthorityCollectionRpcArgs {
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
    throw new CentralInvoiceAuthorityCollectionRpcAdapterError(
      "INVALID_COLLECTION_RPC_INPUT",
      "La actualizacion central de cobro requiere una version central positiva.",
    );
  }
  assertCollectionStatus(input);
  assertJsonObjectOrArray(input.documentPayload, "documentPayload");

  return {
    p_user_id: input.auth.userId,
    p_device_id: input.auth.deviceId,
    p_session_hash: sha256(input.auth.sessionId),
    p_idempotency_key_hash: sha256(input.idempotencyKey),
    p_request_hash: sha256(stableJson(requestHashPayload(input))),
    p_document_id: input.documentRef.serverDocumentId,
    p_identity_id: input.documentRef.identityId,
    p_expected_version: input.documentRef.expectedVersion,
    p_status: input.status,
    p_payment_status: input.paymentStatus,
    p_paid_at: input.paidAt,
    p_document_payload: input.documentPayload,
  };
}

function parseRpcRow(row: unknown): CentralInvoiceAuthorityCollectionRpcResult {
  if (!isObject(row)) {
    throw new CentralInvoiceAuthorityCollectionRpcAdapterError(
      "INVALID_COLLECTION_RPC_RESULT",
      "La RPC de cobro central no devolvio una fila de resultado.",
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
    throw new CentralInvoiceAuthorityCollectionRpcAdapterError(
      "INVALID_COLLECTION_RPC_RESULT",
      "La RPC de cobro central devolvio un resultado incompleto.",
    );
  }

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_COLLECTION_RPC_ADAPTER,
    status,
    documentId,
    identityId,
    outboxEventId,
    fullNumber,
    sequence,
    documentVersion,
  };
}

export async function updateCentralInvoiceCollectionThroughRpc(
  client: CentralInvoiceAuthorityCollectionRpcClient,
  input: CentralInvoiceAuthorityCollectionRpcInput,
): Promise<CentralInvoiceAuthorityCollectionRpcResult> {
  const args = buildCentralInvoiceAuthorityCollectionRpcArgs(input);
  const { data, error } = await client.rpc(
    "update_central_invoice_collection_v1",
    args,
  );

  if (error) {
    throw new CentralInvoiceAuthorityCollectionRpcAdapterError(
      "COLLECTION_RPC_REJECTED",
      "Supabase rechazo la actualizacion central de cobro.",
      error.code,
      error.message,
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  return parseRpcRow(row);
}
