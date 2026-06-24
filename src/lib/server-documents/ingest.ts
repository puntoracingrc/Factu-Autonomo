import { ServerDocumentError, serverDocumentErrorMessage } from "./errors";
import type { ServerDocumentRepository } from "./repository";
import type {
  JsonObject,
  JsonValue,
  ServerDocumentConflictReason,
  ServerDocumentCreateDraftInput,
  ServerDocumentKind,
  ServerDocumentMutationDecision,
  ServerDocumentMutationInput,
  ServerDocumentType,
} from "./types";

assertServerOnlyModule();

export type ServerDocumentIngestAction = "createDraft" | "updateDraft";

export type ServerDocumentIngestFailureReason =
  | "unauthorized"
  | "invalid_request"
  | "store_error"
  | ServerDocumentConflictReason;

export type SafeServerDocumentIngestResult =
  | {
      status: "accepted";
      serverDocumentId: string;
      localDocumentId: string;
      version: number;
      documentLifecycle: "draft" | "issued" | "canceled";
      integrityLock: "unlocked" | "locked";
      updatedAt: string;
      versionId: string;
    }
  | {
      status: "rejected";
      reason: ServerDocumentIngestFailureReason;
      message: string;
    }
  | {
      status: "conflict";
      reason: ServerDocumentConflictReason;
      message: string;
      conflictId: string;
      serverDocumentId?: string | null;
      localDocumentId: string;
    };

export interface ServerDocumentIngestContext {
  authenticatedUserId?: string | null;
}

export interface ServerDocumentIngestRepository {
  createDraft(
    userId: string,
    input: ServerDocumentCreateDraftInput,
  ): Promise<ServerDocumentMutationDecision>;
  updateDraft(
    userId: string,
    id: string,
    input: ServerDocumentMutationInput,
  ): Promise<ServerDocumentMutationDecision>;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El ingest documental canonico solo puede cargarse en servidor.",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return Number.isFinite(value as number) || typeof value !== "number";
  }

  if (Array.isArray(value)) return value.every(isJsonValue);

  if (!isRecord(value)) return false;
  return Object.values(value).every(isJsonValue);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDocumentType(value: unknown): ServerDocumentType | null {
  return value === "factura" || value === "presupuesto" || value === "recibo"
    ? value
    : null;
}

function parseDocumentKind(value: unknown): ServerDocumentKind | null {
  return value === "standard" ||
    value === "rectificativa" ||
    value === "quote" ||
    value === "receipt"
    ? value
    : null;
}

function rejected(
  reason: ServerDocumentIngestFailureReason,
  message: string,
): SafeServerDocumentIngestResult {
  return { status: "rejected", reason, message };
}

function invalidRequest(message: string): SafeServerDocumentIngestResult {
  return rejected("invalid_request", message);
}

function parseCreateDraftInput(
  body: Record<string, unknown>,
): ServerDocumentCreateDraftInput | SafeServerDocumentIngestResult {
  const localDocumentId = nonEmptyString(body.localDocumentId);
  const documentType = parseDocumentType(body.documentType);
  const documentKind = parseDocumentKind(body.documentKind);
  const statusLegacy = nonEmptyString(body.statusLegacy);

  if (!localDocumentId) {
    return invalidRequest("Falta localDocumentId válido.");
  }
  if (!documentType) {
    return invalidRequest("Falta documentType válido.");
  }
  if (!documentKind) {
    return invalidRequest("Falta documentKind válido.");
  }
  if (!statusLegacy) {
    return invalidRequest("Falta statusLegacy válido.");
  }
  if (!isJsonObject(body.payload)) {
    return invalidRequest("Falta payload JSON válido.");
  }

  return {
    localDocumentId,
    documentType,
    documentKind,
    statusLegacy,
    payload: body.payload,
  };
}

function parseUpdateDraftInput(
  body: Record<string, unknown>,
): { id: string; input: ServerDocumentMutationInput } | SafeServerDocumentIngestResult {
  const id = nonEmptyString(body.serverDocumentId);
  if (!id) {
    return invalidRequest("Falta serverDocumentId válido.");
  }

  if (!Number.isInteger(body.expectedVersion) || Number(body.expectedVersion) < 1) {
    return rejected(
      "missing_expected_version",
      serverDocumentErrorMessage("missing_expected_version"),
    );
  }

  const input: ServerDocumentMutationInput = {
    expectedVersion: Number(body.expectedVersion),
  };

  if ("payload" in body) {
    if (!isJsonObject(body.payload)) {
      return invalidRequest("payload debe ser un objeto JSON válido.");
    }
    input.payload = body.payload;
  }

  if ("statusLegacy" in body) {
    const statusLegacy = nonEmptyString(body.statusLegacy);
    if (!statusLegacy) return invalidRequest("statusLegacy inválido.");
    input.statusLegacy = statusLegacy;
  }

  if (
    "documentSnapshot" in body ||
    "pdfSnapshot" in body ||
    "snapshotHash" in body ||
    "pdfContentHash" in body ||
    "documentLifecycle" in body ||
    "integrityLock" in body
  ) {
    return invalidRequest(
      "El ingest 2B.3C solo admite cambios de borrador, payload y estado legacy.",
    );
  }

  if (!("payload" in input) && !("statusLegacy" in input)) {
    return invalidRequest("No hay cambios de borrador que procesar.");
  }

  return { id, input };
}

function safeDecision(
  decision: ServerDocumentMutationDecision,
): SafeServerDocumentIngestResult {
  if (decision.status === "accepted") {
    return {
      status: "accepted",
      serverDocumentId: decision.document.id,
      localDocumentId: decision.document.localDocumentId,
      version: decision.document.version,
      documentLifecycle: decision.document.documentLifecycle,
      integrityLock: decision.document.integrityLock,
      updatedAt: decision.document.updatedAt,
      versionId: decision.version.id,
    };
  }

  if (decision.status === "conflict") {
    return {
      status: "conflict",
      reason: decision.reason,
      message: decision.message,
      conflictId: decision.conflict.id,
      serverDocumentId: decision.conflict.serverDocumentId,
      localDocumentId: decision.conflict.localDocumentId,
    };
  }

  return {
    status: "rejected",
    reason: decision.reason,
    message: decision.message,
  };
}

function safeError(error: unknown): SafeServerDocumentIngestResult {
  if (error instanceof ServerDocumentError) {
    return rejected(error.reason, error.message);
  }

  return rejected(
    "store_error",
    "No se pudo procesar el ingest documental de forma segura.",
  );
}

export async function ingestServerDocument(
  repository: ServerDocumentIngestRepository | ServerDocumentRepository,
  context: ServerDocumentIngestContext,
  body: unknown,
): Promise<SafeServerDocumentIngestResult> {
  const authenticatedUserId = nonEmptyString(context.authenticatedUserId);
  if (!authenticatedUserId) {
    return rejected("unauthorized", "No autorizado.");
  }

  if (!isRecord(body)) {
    return invalidRequest("Body JSON inválido.");
  }

  const action = body.action;
  try {
    if (action === "createDraft") {
      const input = parseCreateDraftInput(body);
      if ("status" in input) return input;
      return safeDecision(
        await repository.createDraft(authenticatedUserId, input),
      );
    }

    if (action === "updateDraft") {
      const parsed = parseUpdateDraftInput(body);
      if ("status" in parsed) return parsed;
      return safeDecision(
        await repository.updateDraft(
          authenticatedUserId,
          parsed.id,
          parsed.input,
        ),
      );
    }
  } catch (error) {
    return safeError(error);
  }

  return invalidRequest("Acción de ingest no soportada.");
}
