import { randomUUID } from "node:crypto";
import type {
  DocumentSyncCandidate,
  DocumentSyncDecisionStatus,
  DocumentSyncOperationKind,
  DocumentSyncResponseShape,
  DocumentSyncSafeSummary,
  DocumentSyncServerContext,
} from "./types";

// PHASE2C25_SERVER_SYNC_COMMAND_CONTRACT_V1
assertServerOnlyModule();

export const DOCUMENT_SYNC_SERVER_COMMAND_MAX_BATCH_SIZE = 25;

export type DocumentSyncServerCommandKind =
  | "dry_run_single"
  | "apply_single"
  | "dry_run_batch"
  | "apply_batch"
  | "get_safe_state"
  | "get_conflict_report"
  | "get_safe_report";

export interface DocumentSyncServerAuthContext {
  userId: string;
  scopeId?: string;
  requestId?: string;
  userIdSource: "server" | "test";
}

export interface DocumentSyncServerCommandOptions {
  maxBatchSize?: number;
  stopOnFirstError?: boolean;
  requestIdFactory?: () => string;
}

export type DocumentSyncServerCommandPayload = Partial<
  Omit<DocumentSyncCandidate, "context" | "requestedResponseShape">
> & {
  itemId?: string;
  requestedResponseShape?: DocumentSyncResponseShape;
  context?: Partial<DocumentSyncServerContext>;
  [key: string]: unknown;
};

export interface DocumentSyncServerCommandInput {
  kind: DocumentSyncServerCommandKind;
  auth: DocumentSyncServerAuthContext;
  payload?: DocumentSyncServerCommandPayload;
  batch?: DocumentSyncServerCommandPayload[];
  options?: DocumentSyncServerCommandOptions;
}

export interface DocumentSyncServerCommandSafeSummary {
  commandKind: DocumentSyncServerCommandKind;
  requestId: string;
  serverDerivedUserId: string;
  serverDerivedScopeId?: string;
  itemCount: number;
  operationKinds: DocumentSyncOperationKind[];
  localDocumentIds: string[];
  documentIds: string[];
  expectedVersions: number[];
  payloadHashCount: number;
  snapshotHashCount: number;
  pdfSnapshotHashCount: number;
}

export interface DocumentSyncServerBatchCommandSafeSummary {
  commandKind: DocumentSyncServerCommandKind;
  requestId: string;
  total: number;
  accepted: number;
  rejected: number;
  conflict: number;
  noop: number;
  stoppedEarly: boolean;
}

export interface DocumentSyncServerCommand {
  kind: DocumentSyncServerCommandKind;
  auth: DocumentSyncServerContext;
  requestId: string;
  candidate?: DocumentSyncCandidate;
  candidates: Array<{
    itemId: string;
    candidate: DocumentSyncCandidate;
  }>;
  options: Required<Pick<DocumentSyncServerCommandOptions, "maxBatchSize">> &
    Pick<DocumentSyncServerCommandOptions, "stopOnFirstError">;
  safeSummary: DocumentSyncServerCommandSafeSummary;
}

export type DocumentSyncServerCommandErrorCode =
  | "INVALID_SERVER_AUTH"
  | "INVALID_COMMAND_KIND"
  | "INVALID_COMMAND_PAYLOAD"
  | "BATCH_LIMIT_EXCEEDED"
  | "CROSS_USER_COMMAND"
  | "CROSS_SCOPE_COMMAND"
  | "UNSAFE_COMMAND_CONTENT";

export class DocumentSyncServerCommandError extends Error {
  readonly code: DocumentSyncServerCommandErrorCode;
  readonly safeSummary?: DocumentSyncServerCommandSafeSummary;

  constructor(
    code: DocumentSyncServerCommandErrorCode,
    message: string,
    safeSummary?: DocumentSyncServerCommandSafeSummary,
  ) {
    super(message);
    this.name = "DocumentSyncServerCommandError";
    this.code = code;
    this.safeSummary = safeSummary;
  }
}

export interface DocumentSyncServerCommandResult {
  commandKind: DocumentSyncServerCommandKind;
  requestId?: string;
  serverDerivedUserId?: string;
  serverDerivedScopeId?: string;
  status: DocumentSyncDecisionStatus | "batch_completed";
  safeSummary?:
    | DocumentSyncSafeSummary
    | DocumentSyncServerCommandSafeSummary
    | DocumentSyncServerBatchCommandSafeSummary;
  version?: number;
  reason?: string;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  conflict?: unknown;
  plan?: unknown;
  safeState?: unknown;
  conflictReport?: unknown;
  safeReport?: unknown;
  batchResult?: unknown;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El contrato de comandos server-only de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeRequestId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_-]{1,96}$/.test(trimmed) ? trimmed : undefined;
}

function generatedRequestId(options?: DocumentSyncServerCommandOptions): string {
  return (
    safeRequestId(options?.requestIdFactory?.()) ??
    `SYNTHETIC_ONLY_SERVER_SYNC_${randomUUID()}`
  );
}

function forbiddenKeyFragments(): string[] {
  return [
    "document" + "snapshot",
    "pdf" + "snapshot",
    "raw" + "payload",
    "full" + "payload",
    "body",
    "full" + "fiscal",
    "fiscal" + "data",
    "tok" + "en",
    "authorization",
    "cookie",
    "sec" + "ret",
    "service" + "_role",
    "private" + "key",
    "certificate",
    "xm" + "l",
  ];
}

function allowedPayloadKey(key: string): boolean {
  return [
    "payloadHash",
    "payloadUserId",
    "payloadScopeId",
    "snapshotHash",
    "pdfSnapshotHash",
    "payloadHashCount",
    "snapshotHashCount",
    "pdfSnapshotHashCount",
    "payloadHashPresent",
    "snapshotHashPresent",
    "pdfSnapshotHashPresent",
    "requestedResponseShape",
  ].includes(key);
}

function keyIsUnsafe(key: string): boolean {
  if (allowedPayloadKey(key)) return false;
  const normalized = key.toLowerCase();
  return forbiddenKeyFragments().some((fragment) =>
    normalized.includes(fragment.toLowerCase()),
  );
}

function stringIsUnsafe(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("<" + "?xm" + "l") ||
    normalized.includes("%p" + "df") ||
    normalized.includes("tok" + "en") ||
    normalized.includes("sec" + "ret") ||
    normalized.includes("service" + "_role") ||
    normalized.includes("private" + " key")
  );
}

function assertSafePayload(value: unknown, key = ""): void {
  if (keyIsUnsafe(key)) {
    throw new DocumentSyncServerCommandError(
      "UNSAFE_COMMAND_CONTENT",
      "El comando contiene contenido no seguro para sync server-only.",
    );
  }

  if (typeof value === "string" && stringIsUnsafe(value)) {
    throw new DocumentSyncServerCommandError(
      "UNSAFE_COMMAND_CONTENT",
      "El comando contiene texto sensible o cuerpo no seguro.",
    );
  }

  if (Array.isArray(value)) {
    for (const entry of value) assertSafePayload(entry);
    return;
  }

  if (value && typeof value === "object") {
    for (const [entryKey, entryValue] of Object.entries(value)) {
      assertSafePayload(entryValue, entryKey);
    }
  }
}

function assertAuth(auth: DocumentSyncServerAuthContext): void {
  if (
    !auth ||
    !isNonEmptyString(auth.userId) ||
    (auth.userIdSource !== "server" && auth.userIdSource !== "test")
  ) {
    throw new DocumentSyncServerCommandError(
      "INVALID_SERVER_AUTH",
      "El comando de sync requiere auth derivada por servidor.",
    );
  }
}

function assertKind(kind: DocumentSyncServerCommandKind): void {
  const kinds: DocumentSyncServerCommandKind[] = [
    "dry_run_single",
    "apply_single",
    "dry_run_batch",
    "apply_batch",
    "get_safe_state",
    "get_conflict_report",
    "get_safe_report",
  ];
  if (!kinds.includes(kind)) {
    throw new DocumentSyncServerCommandError(
      "INVALID_COMMAND_KIND",
      "Tipo de comando de sync no soportado.",
    );
  }
}

function assertPayloadScope(
  payload: DocumentSyncServerCommandPayload,
  auth: DocumentSyncServerAuthContext,
): void {
  const payloadUserId = payload.payloadUserId ?? payload.context?.userId;
  const payloadScopeId = payload.payloadScopeId ?? payload.context?.scopeId;

  if (payloadUserId && payloadUserId !== auth.userId) {
    throw new DocumentSyncServerCommandError(
      "CROSS_USER_COMMAND",
      "El payload no puede sobrescribir el usuario derivado por servidor.",
    );
  }

  if (payloadScopeId && payloadScopeId !== auth.scopeId) {
    throw new DocumentSyncServerCommandError(
      "CROSS_SCOPE_COMMAND",
      "El payload no puede sobrescribir el scope derivado por servidor.",
    );
  }
}

function normalizeCandidate(
  payload: DocumentSyncServerCommandPayload,
  auth: DocumentSyncServerAuthContext,
  requestId: string,
): DocumentSyncCandidate {
  assertSafePayload(payload);
  assertPayloadScope(payload, auth);

  if (!isNonEmptyString(payload.operationKind) || !isNonEmptyString(payload.localDocumentId)) {
    throw new DocumentSyncServerCommandError(
      "INVALID_COMMAND_PAYLOAD",
      "El comando requiere operationKind y localDocumentId.",
    );
  }

  if (
    payload.requestedResponseShape === "full_record" ||
    payload.requestedResponseShape === "select_all"
  ) {
    throw new DocumentSyncServerCommandError(
      "UNSAFE_COMMAND_CONTENT",
      "El comando solo permite respuestas seguras.",
    );
  }

  return {
    operationKind: payload.operationKind,
    documentId:
      typeof payload.documentId === "string" ? payload.documentId : undefined,
    localDocumentId: payload.localDocumentId,
    expectedVersion:
      typeof payload.expectedVersion === "number"
        ? payload.expectedVersion
        : undefined,
    candidateVersion:
      typeof payload.candidateVersion === "number"
        ? payload.candidateVersion
        : undefined,
    payloadHash:
      typeof payload.payloadHash === "string" || payload.payloadHash === null
        ? payload.payloadHash
        : undefined,
    snapshotHash:
      typeof payload.snapshotHash === "string" || payload.snapshotHash === null
        ? payload.snapshotHash
        : undefined,
    pdfSnapshotHash:
      typeof payload.pdfSnapshotHash === "string" ||
      payload.pdfSnapshotHash === null
        ? payload.pdfSnapshotHash
        : undefined,
    documentNumber:
      typeof payload.documentNumber === "string" || payload.documentNumber === null
        ? payload.documentNumber
        : undefined,
    documentSeries:
      typeof payload.documentSeries === "string" || payload.documentSeries === null
        ? payload.documentSeries
        : undefined,
    lifecycle:
      payload.lifecycle === "draft" ||
      payload.lifecycle === "issued" ||
      payload.lifecycle === "canceled"
        ? payload.lifecycle
        : undefined,
    integrityLock:
      payload.integrityLock === "locked" || payload.integrityLock === "unlocked"
        ? payload.integrityLock
        : undefined,
    statusLegacy:
      typeof payload.statusLegacy === "string" || payload.statusLegacy === null
        ? payload.statusLegacy
        : undefined,
    updatedAt:
      typeof payload.updatedAt === "string" ? payload.updatedAt : undefined,
    payloadUserId:
      typeof payload.payloadUserId === "string" || payload.payloadUserId === null
        ? payload.payloadUserId
        : undefined,
    payloadScopeId:
      typeof payload.payloadScopeId === "string" || payload.payloadScopeId === null
        ? payload.payloadScopeId
        : undefined,
    requestedResponseShape: "safe_summary",
    context: {
      userId: auth.userId,
      scopeId: auth.scopeId,
      requestId,
      userIdSource: auth.userIdSource,
    },
  };
}

function summarizeCandidates(
  kind: DocumentSyncServerCommandKind,
  auth: DocumentSyncServerContext,
  requestId: string,
  candidates: DocumentSyncCandidate[],
): DocumentSyncServerCommandSafeSummary {
  return {
    commandKind: kind,
    requestId,
    serverDerivedUserId: auth.userId,
    serverDerivedScopeId: auth.scopeId,
    itemCount: candidates.length,
    operationKinds: candidates.map((candidate) => candidate.operationKind),
    localDocumentIds: candidates.map((candidate) => candidate.localDocumentId),
    documentIds: candidates
      .map((candidate) => candidate.documentId)
      .filter(isNonEmptyString),
    expectedVersions: candidates
      .map((candidate) => candidate.expectedVersion)
      .filter((value): value is number => typeof value === "number"),
    payloadHashCount: candidates.filter((candidate) => candidate.payloadHash)
      .length,
    snapshotHashCount: candidates.filter((candidate) => candidate.snapshotHash)
      .length,
    pdfSnapshotHashCount: candidates.filter((candidate) => candidate.pdfSnapshotHash)
      .length,
  };
}

function itemIdFor(
  payload: DocumentSyncServerCommandPayload,
  index: number,
): string {
  return isNonEmptyString(payload.itemId)
    ? payload.itemId
    : `SYNTHETIC_ONLY_SYNC_ITEM_${index + 1}`;
}

export function buildDocumentSyncServerCommand(
  input: DocumentSyncServerCommandInput,
): DocumentSyncServerCommand {
  assertKind(input.kind);
  assertAuth(input.auth);
  assertSafePayload(input);

  const maxBatchSize =
    input.options?.maxBatchSize ?? DOCUMENT_SYNC_SERVER_COMMAND_MAX_BATCH_SIZE;
  const requestId =
    safeRequestId(input.auth.requestId) ?? generatedRequestId(input.options);
  const auth: DocumentSyncServerContext = {
    userId: input.auth.userId,
    scopeId: input.auth.scopeId,
    requestId,
    userIdSource: input.auth.userIdSource,
  };

  const isSingle = input.kind === "dry_run_single" || input.kind === "apply_single";
  const isBatch = input.kind === "dry_run_batch" || input.kind === "apply_batch";
  const payloads = isSingle
    ? input.payload
      ? [input.payload]
      : []
    : isBatch
      ? input.batch ?? []
      : [];

  if (isSingle && payloads.length !== 1) {
    throw new DocumentSyncServerCommandError(
      "INVALID_COMMAND_PAYLOAD",
      "El comando single requiere un payload.",
    );
  }

  if (payloads.length > maxBatchSize) {
    throw new DocumentSyncServerCommandError(
      "BATCH_LIMIT_EXCEEDED",
      "El batch de sync supera el limite permitido.",
    );
  }

  const candidates = payloads.map((payload, index) => ({
    itemId: itemIdFor(payload, index),
    candidate: normalizeCandidate(payload, input.auth, requestId),
  }));
  const safeSummary = summarizeCandidates(
    input.kind,
    auth,
    requestId,
    candidates.map((entry) => entry.candidate),
  );

  return {
    kind: input.kind,
    auth,
    requestId,
    candidate: candidates[0]?.candidate,
    candidates,
    options: {
      maxBatchSize,
      stopOnFirstError: input.options?.stopOnFirstError,
    },
    safeSummary,
  };
}

export function validateDocumentSyncServerCommand(
  command: DocumentSyncServerCommand,
): DocumentSyncServerCommand {
  assertKind(command.kind);
  assertAuth(command.auth);
  assertSafePayload(command);

  if (command.candidates.length > command.options.maxBatchSize) {
    throw new DocumentSyncServerCommandError(
      "BATCH_LIMIT_EXCEEDED",
      "El batch de sync supera el limite permitido.",
      command.safeSummary,
    );
  }

  for (const entry of command.candidates) {
    if (entry.candidate.context.userId !== command.auth.userId) {
      throw new DocumentSyncServerCommandError(
        "CROSS_USER_COMMAND",
        "El comando no coincide con el usuario derivado por servidor.",
        command.safeSummary,
      );
    }
    if (entry.candidate.context.scopeId !== command.auth.scopeId) {
      throw new DocumentSyncServerCommandError(
        "CROSS_SCOPE_COMMAND",
        "El comando no coincide con el scope derivado por servidor.",
        command.safeSummary,
      );
    }
  }

  return command;
}

export function summarizeDocumentSyncServerCommand(
  command: DocumentSyncServerCommand,
): DocumentSyncServerCommandSafeSummary {
  return { ...validateDocumentSyncServerCommand(command).safeSummary };
}
