import type { CentralInvoiceAuthorityJson } from "./issue-rpc-adapter";

// CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1
assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1";

export type CentralInvoiceAuthorityEventType =
  | "invoice_issued"
  | "rectification_issued"
  | "document_repaired"
  | "invoice_collection_updated"
  | "invoice_relationship_updated";

export interface CentralInvoiceAuthorityEventsRpcClient {
  rpc(
    name: "list_central_invoice_events_v1",
    args: CentralInvoiceAuthorityEventsRpcArgs,
  ): Promise<{
    data: unknown;
    error: CentralInvoiceAuthorityEventsRpcError | null;
  }>;
}

export interface CentralInvoiceAuthorityEventsRpcError {
  code?: string;
  message: string;
}

export interface CentralInvoiceAuthorityEventsRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_after_created_at: string | null;
  p_after_event_id: string | null;
  p_limit: number;
}

export interface CentralInvoiceAuthorityEventsRpcInput {
  userId: string;
  deviceId: string;
  afterCreatedAt?: string | null;
  afterEventId?: string | null;
  limit?: number | null;
}

export interface CentralInvoiceAuthorityPulledEvent {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER;
  eventId: string;
  documentId: string;
  identityId: string;
  eventType: CentralInvoiceAuthorityEventType;
  createdAt: string;
  fullNumber: string;
  sequence: number;
  documentVersion: number;
  documentPayload: CentralInvoiceAuthorityJson;
  emittedHash: string;
  safeSummary: CentralInvoiceAuthorityJson;
}

export type CentralInvoiceAuthorityEventsRpcAdapterErrorCode =
  | "INVALID_EVENTS_RPC_INPUT"
  | "EVENTS_RPC_REJECTED"
  | "INVALID_EVENTS_RPC_RESULT";

export class CentralInvoiceAuthorityEventsRpcAdapterError extends Error {
  readonly code: CentralInvoiceAuthorityEventsRpcAdapterErrorCode;
  readonly causeCode?: string;

  constructor(
    code: CentralInvoiceAuthorityEventsRpcAdapterErrorCode,
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name = "CentralInvoiceAuthorityEventsRpcAdapterError";
    this.code = code;
    this.causeCode = causeCode;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador de eventos de autoridad central solo puede cargarse en servidor.",
    );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonObjectOrArray(value: unknown): value is CentralInvoiceAuthorityJson {
  return isObject(value) || Array.isArray(value);
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new CentralInvoiceAuthorityEventsRpcAdapterError(
      "INVALID_EVENTS_RPC_INPUT",
      `${label} no puede estar vacio.`,
    );
  }
}

function normalizeLimit(value: number | null | undefined): number {
  if (value === null || value === undefined) return 50;
  if (!Number.isInteger(value)) {
    throw new CentralInvoiceAuthorityEventsRpcAdapterError(
      "INVALID_EVENTS_RPC_INPUT",
      "limit debe ser un entero.",
    );
  }
  return Math.min(Math.max(value, 1), 100);
}

function eventType(value: unknown): CentralInvoiceAuthorityEventType | null {
  if (
    value === "invoice_issued" ||
    value === "rectification_issued" ||
    value === "document_repaired" ||
    value === "invoice_collection_updated" ||
    value === "invoice_relationship_updated"
  ) {
    return value;
  }
  return null;
}

export function buildCentralInvoiceAuthorityEventsRpcArgs(
  input: CentralInvoiceAuthorityEventsRpcInput,
): CentralInvoiceAuthorityEventsRpcArgs {
  assertNonEmpty(input.userId, "userId");
  assertNonEmpty(input.deviceId, "deviceId");

  return {
    p_user_id: input.userId,
    p_device_id: input.deviceId,
    p_after_created_at: input.afterCreatedAt?.trim() || null,
    p_after_event_id: input.afterEventId?.trim() || null,
    p_limit: normalizeLimit(input.limit),
  };
}

function parseEvent(row: unknown): CentralInvoiceAuthorityPulledEvent {
  if (!isObject(row)) {
    throw new CentralInvoiceAuthorityEventsRpcAdapterError(
      "INVALID_EVENTS_RPC_RESULT",
      "La RPC de eventos centrales no devolvio una fila valida.",
    );
  }

  const parsedEventType = eventType(row.event_type);
  const sequence = row.sequence;
  const documentVersion = row.document_version;
  if (
    typeof row.event_id !== "string" ||
    typeof row.document_id !== "string" ||
    typeof row.identity_id !== "string" ||
    !parsedEventType ||
    typeof row.created_at !== "string" ||
    typeof row.full_number !== "string" ||
    typeof sequence !== "number" ||
    !Number.isInteger(sequence) ||
    sequence <= 0 ||
    typeof documentVersion !== "number" ||
    !Number.isInteger(documentVersion) ||
    documentVersion <= 0 ||
    !isJsonObjectOrArray(row.document_payload) ||
    typeof row.emitted_hash !== "string" ||
    !isJsonObjectOrArray(row.safe_summary)
  ) {
    throw new CentralInvoiceAuthorityEventsRpcAdapterError(
      "INVALID_EVENTS_RPC_RESULT",
      "La RPC de eventos centrales devolvio un resultado incompleto.",
    );
  }

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER,
    eventId: row.event_id,
    documentId: row.document_id,
    identityId: row.identity_id,
    eventType: parsedEventType,
    createdAt: row.created_at,
    fullNumber: row.full_number,
    sequence,
    documentVersion,
    documentPayload: row.document_payload,
    emittedHash: row.emitted_hash,
    safeSummary: row.safe_summary,
  };
}

export async function listCentralInvoiceAuthorityEventsThroughRpc(
  client: CentralInvoiceAuthorityEventsRpcClient,
  input: CentralInvoiceAuthorityEventsRpcInput,
): Promise<CentralInvoiceAuthorityPulledEvent[]> {
  const args = buildCentralInvoiceAuthorityEventsRpcArgs(input);
  const { data, error } = await client.rpc("list_central_invoice_events_v1", args);

  if (error) {
    throw new CentralInvoiceAuthorityEventsRpcAdapterError(
      "EVENTS_RPC_REJECTED",
      "Supabase rechazo la lectura de eventos centrales.",
      error.code,
    );
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.map(parseEvent);
}
