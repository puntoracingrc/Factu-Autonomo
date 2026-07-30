import { createHash } from "node:crypto";

import type {
  CentralBusinessBootstrapCommitCommand,
  CentralBusinessBootstrapCommitEntity,
} from "./bootstrap-commit";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_RPC_ADAPTER =
  "CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_RPC_ADAPTER_V1";

export interface CentralBusinessBootstrapCommitRpcArgs {
  p_user_id: string;
  p_device_id: string;
  p_session_hash: string;
  p_idempotency_key_hash: string;
  p_request_hash: string;
  p_snapshot_digest: string;
  p_central_state_digest: string;
  p_preview_digest: string;
  p_entities: CentralBusinessBootstrapCommitEntity[];
}

export interface CentralBusinessBootstrapCommitRpcClient {
  rpc(
    name: "bootstrap_central_business_entities_v1",
    args: CentralBusinessBootstrapCommitRpcArgs,
  ): Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

export interface CentralBusinessBootstrapCommitRpcResult {
  schema: typeof CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_RPC_ADAPTER;
  status: "committed" | "replayed";
  createdCount: number;
  identicalCount: number;
  firstEventSequence: number | null;
  lastEventSequence: number | null;
}

export class CentralBusinessBootstrapCommitRpcError extends Error {
  readonly code: "RPC_REJECTED" | "INVALID_RPC_RESULT";
  readonly causeCode?: string;

  constructor(
    code: CentralBusinessBootstrapCommitRpcError["code"],
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name = "CentralBusinessBootstrapCommitRpcError";
    this.code = code;
    this.causeCode = causeCode;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador RPC del bootstrap solo puede cargarse en servidor.",
    );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function buildCentralBusinessBootstrapCommitRpcArgs(
  command: CentralBusinessBootstrapCommitCommand,
): CentralBusinessBootstrapCommitRpcArgs {
  return {
    p_user_id: command.userId,
    p_device_id: command.deviceId,
    p_session_hash: createHash("sha256")
      .update(command.sessionId)
      .digest("hex"),
    p_idempotency_key_hash: command.idempotencyKeyHash,
    p_request_hash: command.requestHash,
    p_snapshot_digest: command.snapshotDigest,
    p_central_state_digest: command.centralStateDigest,
    p_preview_digest: command.previewDigest,
    p_entities: command.entities,
  };
}

function parseResult(
  value: unknown,
): CentralBusinessBootstrapCommitRpcResult {
  const row = Array.isArray(value) ? value[0] : value;
  if (
    !isObject(row) ||
    (row.result_status !== "committed" && row.result_status !== "replayed") ||
    typeof row.created_count !== "number" ||
    typeof row.identical_count !== "number" ||
    (row.first_event_sequence !== null &&
      typeof row.first_event_sequence !== "number") ||
    (row.last_event_sequence !== null &&
      typeof row.last_event_sequence !== "number")
  ) {
    throw new CentralBusinessBootstrapCommitRpcError(
      "INVALID_RPC_RESULT",
      "La RPC del bootstrap devolvio un resultado incompleto.",
    );
  }
  return {
    schema: CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_RPC_ADAPTER,
    status: row.result_status,
    createdCount: row.created_count,
    identicalCount: row.identical_count,
    firstEventSequence: row.first_event_sequence,
    lastEventSequence: row.last_event_sequence,
  };
}

export async function commitCentralBusinessBootstrapThroughRpc(
  client: CentralBusinessBootstrapCommitRpcClient,
  command: CentralBusinessBootstrapCommitCommand,
): Promise<CentralBusinessBootstrapCommitRpcResult> {
  const { data, error } = await client.rpc(
    "bootstrap_central_business_entities_v1",
    buildCentralBusinessBootstrapCommitRpcArgs(command),
  );
  if (error) {
    throw new CentralBusinessBootstrapCommitRpcError(
      "RPC_REJECTED",
      "Supabase rechazo el bootstrap central.",
      error.code,
    );
  }
  return parseResult(data);
}
