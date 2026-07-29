import type {
  CentralBusinessEntityType,
  CentralBusinessJson,
  CentralBusinessOperationKind,
} from "./mutation-command";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER =
  "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1";

export interface CentralBusinessEventsRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_after_sequence: number;
  p_limit: number;
}

export interface CentralBusinessEventsRpcClient {
  rpc(
    name: "list_central_business_events_v1",
    args: CentralBusinessEventsRpcArgs,
  ): Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

export interface CentralBusinessEvent {
  schema: typeof CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER;
  eventId: string;
  eventSequence: number;
  entityType: CentralBusinessEntityType;
  entityId: string;
  entityVersion: number;
  operationKind: CentralBusinessOperationKind;
  payload: CentralBusinessJson | null;
  contentHash: string;
  actorDeviceId: string;
  createdAt: string;
}

export class CentralBusinessEventsRpcError extends Error {
  readonly code:
    | "INVALID_EVENTS_INPUT"
    | "EVENTS_RPC_REJECTED"
    | "INVALID_EVENTS_RESULT";
  readonly causeCode?: string;

  constructor(
    code: CentralBusinessEventsRpcError["code"],
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name = "CentralBusinessEventsRpcError";
    this.code = code;
    this.causeCode = causeCode;
  }
}

const ENTITY_TYPES = new Set<CentralBusinessEntityType>([
  "customer",
  "supplier",
  "product",
  "expense",
  "recurring_expense",
  "user_reminder",
  "profile",
]);

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador de eventos de negocio solo puede cargarse en servidor.",
    );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJson(value: unknown): value is CentralBusinessJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJson);
  return isObject(value) && Object.values(value).every(isJson);
}

function args(input: {
  userId: string;
  deviceId: string;
  afterSequence?: number;
  limit?: number;
}): CentralBusinessEventsRpcArgs {
  const afterSequence = input.afterSequence ?? 0;
  const limit = input.limit ?? 100;
  if (
    !input.userId.trim() ||
    !input.deviceId.trim() ||
    !Number.isSafeInteger(afterSequence) ||
    afterSequence < 0 ||
    !Number.isInteger(limit)
  ) {
    throw new CentralBusinessEventsRpcError(
      "INVALID_EVENTS_INPUT",
      "Cursor o identidad no validos para leer eventos centrales.",
    );
  }
  return {
    p_user_id: input.userId,
    p_device_id: input.deviceId,
    p_after_sequence: afterSequence,
    p_limit: Math.min(Math.max(limit, 1), 500),
  };
}

function parse(row: unknown): CentralBusinessEvent {
  if (
    !isObject(row) ||
    typeof row.event_id !== "string" ||
    typeof row.event_sequence !== "number" ||
    !Number.isSafeInteger(row.event_sequence) ||
    !ENTITY_TYPES.has(row.entity_type as CentralBusinessEntityType) ||
    typeof row.entity_id !== "string" ||
    typeof row.entity_version !== "number" ||
    !Number.isInteger(row.entity_version) ||
    (row.operation_kind !== "upsert" && row.operation_kind !== "delete") ||
    !isJson(row.payload) ||
    typeof row.content_hash !== "string" ||
    typeof row.actor_device_id !== "string" ||
    typeof row.created_at !== "string"
  ) {
    throw new CentralBusinessEventsRpcError(
      "INVALID_EVENTS_RESULT",
      "La RPC de eventos centrales devolvio una fila incompleta.",
    );
  }
  if (
    (row.operation_kind === "upsert" &&
      (row.payload === null || typeof row.payload !== "object")) ||
    (row.operation_kind === "delete" && row.payload !== null)
  ) {
    throw new CentralBusinessEventsRpcError(
      "INVALID_EVENTS_RESULT",
      "El evento central no coincide con su operacion.",
    );
  }
  return {
    schema: CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER,
    eventId: row.event_id,
    eventSequence: row.event_sequence,
    entityType: row.entity_type as CentralBusinessEntityType,
    entityId: row.entity_id,
    entityVersion: row.entity_version,
    operationKind: row.operation_kind,
    payload: row.payload,
    contentHash: row.content_hash,
    actorDeviceId: row.actor_device_id,
    createdAt: row.created_at,
  };
}

export async function listCentralBusinessEventsThroughRpc(
  client: CentralBusinessEventsRpcClient,
  input: {
    userId: string;
    deviceId: string;
    afterSequence?: number;
    limit?: number;
  },
): Promise<CentralBusinessEvent[]> {
  const { data, error } = await client.rpc(
    "list_central_business_events_v1",
    args(input),
  );
  if (error) {
    throw new CentralBusinessEventsRpcError(
      "EVENTS_RPC_REJECTED",
      "Supabase rechazo la lectura de eventos de negocio.",
      error.code,
    );
  }
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.map(parse);
}
