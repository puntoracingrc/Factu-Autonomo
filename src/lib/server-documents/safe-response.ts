import type {
  SafeServerDocumentIngestResult,
  ServerDocumentIngestFailureReason,
} from "./ingest";
import type { ServerDocumentConflictReason } from "./types";

assertServerOnlyModule();

type SafeJsonValue =
  | string
  | number
  | boolean
  | null
  | SafeJsonValue[]
  | { [key: string]: SafeJsonValue };

export type SafeServerDocumentResponse = SafeServerDocumentIngestResult;

const ALLOWED_ACCEPTED_KEYS = new Set([
  "status",
  "serverDocumentId",
  "localDocumentId",
  "version",
  "documentLifecycle",
  "integrityLock",
  "updatedAt",
  "versionId",
]);

const ALLOWED_REJECTED_KEYS = new Set(["status", "reason", "message"]);

const ALLOWED_CONFLICT_KEYS = new Set([
  "status",
  "reason",
  "message",
  "conflictId",
  "serverDocumentId",
  "localDocumentId",
]);

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El serializer seguro de documentos solo puede cargarse en servidor.",
    );
  }
}

function pickAllowed(
  source: Record<string, unknown>,
  allowed: Set<string>,
): Record<string, SafeJsonValue> {
  const result: Record<string, SafeJsonValue> = {};
  for (const key of allowed) {
    const value = source[key];
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[key] = value;
    }
  }
  return result;
}

export function safeStoreErrorResponse(): SafeServerDocumentResponse {
  return {
    status: "rejected",
    reason: "store_error",
    message: "No se pudo procesar el ingest documental de forma segura.",
  };
}

export function safeUnauthorizedResponse(): SafeServerDocumentResponse {
  return {
    status: "rejected",
    reason: "unauthorized",
    message: "No autorizado.",
  };
}

export function sanitizeServerDocumentIngestResult(
  result: SafeServerDocumentIngestResult,
): SafeServerDocumentResponse {
  if (result.status === "accepted") {
    return pickAllowed(
      result as unknown as Record<string, unknown>,
      ALLOWED_ACCEPTED_KEYS,
    ) as Extract<SafeServerDocumentResponse, { status: "accepted" }>;
  }

  if (result.status === "conflict") {
    return pickAllowed(
      result as unknown as Record<string, unknown>,
      ALLOWED_CONFLICT_KEYS,
    ) as Extract<SafeServerDocumentResponse, { status: "conflict" }>;
  }

  const safe = pickAllowed(
    result as unknown as Record<string, unknown>,
    ALLOWED_REJECTED_KEYS,
  ) as Extract<SafeServerDocumentResponse, { status: "rejected" }>;

  return {
    status: "rejected",
    reason: (safe.reason ?? "store_error") as ServerDocumentIngestFailureReason,
    message:
      typeof safe.message === "string"
        ? safe.message
        : "No se pudo procesar el ingest documental de forma segura.",
  };
}

export function safeRejectedResponse(
  reason: ServerDocumentIngestFailureReason | ServerDocumentConflictReason,
  message: string,
): SafeServerDocumentResponse {
  return sanitizeServerDocumentIngestResult({
    status: "rejected",
    reason,
    message,
  });
}
