import { createHash } from "node:crypto";

import type {
  CentralBusinessJson,
  CentralBusinessMutationCommand,
} from "./mutation-command";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_MUTATION_RPC_ADAPTER =
  "CENTRAL_BUSINESS_MUTATION_RPC_ADAPTER_V1";

export interface CentralBusinessMutationRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_idempotency_key_hash: string;
  p_request_hash: string;
  p_operation_kind: string;
  p_entity_type: string;
  p_entity_id: string;
  p_expected_version: number;
  p_payload: CentralBusinessJson | null;
  p_content_hash: string;
}

export interface CentralBusinessMutationRpcClient {
  rpc(
    name: "mutate_central_business_entity_v1",
    args: CentralBusinessMutationRpcArgs,
  ): Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

export interface CentralBusinessMutationRpcResult {
  schema: typeof CENTRAL_BUSINESS_MUTATION_RPC_ADAPTER;
  status: "committed" | "replayed";
  eventId: string;
  eventSequence: number;
  entityVersion: number;
  deleted: boolean;
  contentHash: string;
}

export class CentralBusinessMutationRpcError extends Error {
  readonly code: "RPC_REJECTED" | "INVALID_RPC_RESULT";
  readonly causeCode?: string;

  constructor(
    code: "RPC_REJECTED" | "INVALID_RPC_RESULT",
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name = "CentralBusinessMutationRpcError";
    this.code = code;
    this.causeCode = causeCode;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador RPC de datos de negocio solo puede cargarse en servidor.",
    );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function buildCentralBusinessMutationRpcArgs(
  command: CentralBusinessMutationCommand,
): CentralBusinessMutationRpcArgs {
  return {
    p_user_id: command.userId,
    p_device_id: command.deviceId,
    p_session_hash: createHash("sha256")
      .update(command.sessionId)
      .digest("hex"),
    p_idempotency_key_hash: command.idempotencyKeyHash,
    p_request_hash: command.requestHash,
    p_operation_kind: command.operationKind,
    p_entity_type: command.entityType,
    p_entity_id: command.entityId,
    p_expected_version: command.expectedVersion,
    p_payload: command.payload,
    p_content_hash: command.contentHash,
  };
}

function parseResult(value: unknown): CentralBusinessMutationRpcResult {
  const row = Array.isArray(value) ? value[0] : value;
  if (
    !isObject(row) ||
    (row.result_status !== "committed" && row.result_status !== "replayed") ||
    typeof row.event_id !== "string" ||
    typeof row.event_sequence !== "number" ||
    typeof row.entity_version !== "number" ||
    typeof row.deleted !== "boolean" ||
    typeof row.content_hash !== "string"
  ) {
    throw new CentralBusinessMutationRpcError(
      "INVALID_RPC_RESULT",
      "La RPC central devolvio un resultado incompleto.",
    );
  }
  return {
    schema: CENTRAL_BUSINESS_MUTATION_RPC_ADAPTER,
    status: row.result_status,
    eventId: row.event_id,
    eventSequence: row.event_sequence,
    entityVersion: row.entity_version,
    deleted: row.deleted,
    contentHash: row.content_hash,
  };
}

export async function mutateCentralBusinessThroughRpc(
  client: CentralBusinessMutationRpcClient,
  command: CentralBusinessMutationCommand,
): Promise<CentralBusinessMutationRpcResult> {
  const { data, error } = await client.rpc(
    "mutate_central_business_entity_v1",
    buildCentralBusinessMutationRpcArgs(command),
  );
  if (error) {
    throw new CentralBusinessMutationRpcError(
      "RPC_REJECTED",
      "Supabase rechazo la mutacion central.",
      error.code,
    );
  }
  return parseResult(data);
}
