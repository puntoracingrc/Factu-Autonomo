import { createHash } from "node:crypto";

import type {
  CentralBusinessJson,
  CentralBusinessMutationCommand,
} from "./mutation-command";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_BATCH_MUTATION_RPC_ADAPTER =
  "CENTRAL_BUSINESS_BATCH_MUTATION_RPC_ADAPTER_V1";

export interface CentralBusinessBatchMutationRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_operations: CentralBusinessJson;
}

export interface CentralBusinessBatchMutationRpcClient {
  rpc(
    name: "mutate_central_business_batch_v1",
    args: CentralBusinessBatchMutationRpcArgs,
  ): Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

export interface CentralBusinessBatchMutationRpcItem {
  operationIndex: number;
  status: "committed" | "replayed";
  eventId: string;
  eventSequence: number;
  entityVersion: number;
  deleted: boolean;
  contentHash: string;
}

export interface CentralBusinessBatchMutationRpcResult {
  schema: typeof CENTRAL_BUSINESS_BATCH_MUTATION_RPC_ADAPTER;
  operations: CentralBusinessBatchMutationRpcItem[];
}

export class CentralBusinessBatchMutationRpcError extends Error {
  readonly code: "RPC_REJECTED" | "INVALID_RPC_RESULT";
  readonly causeCode?: string;

  constructor(
    code: "RPC_REJECTED" | "INVALID_RPC_RESULT",
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name = "CentralBusinessBatchMutationRpcError";
    this.code = code;
    this.causeCode = causeCode;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador RPC atomico de negocio solo puede cargarse en servidor.",
    );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseResult(
  value: unknown,
  expectedCount: number,
): CentralBusinessBatchMutationRpcResult {
  if (!Array.isArray(value) || value.length !== expectedCount) {
    throw new CentralBusinessBatchMutationRpcError(
      "INVALID_RPC_RESULT",
      "La RPC atomica devolvio una cantidad de resultados inesperada.",
    );
  }
  const operations = value.map((row) => {
    if (
      !isObject(row) ||
      typeof row.operation_index !== "number" ||
      !Number.isInteger(row.operation_index) ||
      row.operation_index < 0 ||
      row.operation_index >= expectedCount ||
      (row.result_status !== "committed" &&
        row.result_status !== "replayed") ||
      typeof row.event_id !== "string" ||
      typeof row.event_sequence !== "number" ||
      !Number.isSafeInteger(row.event_sequence) ||
      typeof row.entity_version !== "number" ||
      !Number.isInteger(row.entity_version) ||
      typeof row.deleted !== "boolean" ||
      typeof row.content_hash !== "string"
    ) {
      throw new CentralBusinessBatchMutationRpcError(
        "INVALID_RPC_RESULT",
        "La RPC atomica devolvio un resultado incompleto.",
      );
    }
    return {
      operationIndex: row.operation_index,
      status: row.result_status,
      eventId: row.event_id,
      eventSequence: row.event_sequence,
      entityVersion: row.entity_version,
      deleted: row.deleted,
      contentHash: row.content_hash,
    } satisfies CentralBusinessBatchMutationRpcItem;
  });
  operations.sort((left, right) => left.operationIndex - right.operationIndex);
  if (
    operations.some(
      (operation, index) => operation.operationIndex !== index,
    )
  ) {
    throw new CentralBusinessBatchMutationRpcError(
      "INVALID_RPC_RESULT",
      "La RPC atomica devolvio indices duplicados o incompletos.",
    );
  }
  return {
    schema: CENTRAL_BUSINESS_BATCH_MUTATION_RPC_ADAPTER,
    operations,
  };
}

export function buildCentralBusinessBatchMutationRpcArgs(
  commands: CentralBusinessMutationCommand[],
): CentralBusinessBatchMutationRpcArgs {
  const first = commands[0];
  if (!first) {
    throw new CentralBusinessBatchMutationRpcError(
      "INVALID_RPC_RESULT",
      "La mutacion atomica requiere al menos una operacion.",
    );
  }
  return {
    p_user_id: first.userId,
    p_device_id: first.deviceId,
    p_session_hash: createHash("sha256")
      .update(first.sessionId)
      .digest("hex"),
    p_operations: commands.map((command, operationIndex) => ({
      operationIndex,
      idempotencyKeyHash: command.idempotencyKeyHash,
      requestHash: command.requestHash,
      operationKind: command.operationKind,
      entityType: command.entityType,
      entityId: command.entityId,
      expectedVersion: command.expectedVersion,
      payload: command.payload,
      contentHash: command.contentHash,
    })),
  };
}

export async function mutateCentralBusinessBatchThroughRpc(
  client: CentralBusinessBatchMutationRpcClient,
  commands: CentralBusinessMutationCommand[],
): Promise<CentralBusinessBatchMutationRpcResult> {
  const { data, error } = await client.rpc(
    "mutate_central_business_batch_v1",
    buildCentralBusinessBatchMutationRpcArgs(commands),
  );
  if (error) {
    throw new CentralBusinessBatchMutationRpcError(
      "RPC_REJECTED",
      "Supabase rechazo la mutacion atomica central.",
      error.code,
    );
  }
  return parseResult(data, commands.length);
}
