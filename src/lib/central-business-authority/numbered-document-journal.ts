"use client";

import type {
  CentralBusinessNumberedDocumentBrowserInput,
  CentralBusinessNumberedDocumentBrowserResult,
  CentralBusinessNumberedDocumentCreateBrowserResult,
} from "./numbered-document-client";

export const CENTRAL_BUSINESS_NUMBERED_DOCUMENT_JOURNAL =
  "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_JOURNAL_V1";

const STORAGE_PREFIX =
  "factu:central-business-authority:numbered-document-journal:v1:";
const MAX_OPERATIONS = 100;

export type CentralBusinessNumberedDocumentCreateInput = Extract<
  CentralBusinessNumberedDocumentBrowserInput,
  { action: "create" }
>;

export type CentralBusinessNumberedDocumentJournalStatus =
  | "pending"
  | "confirmed"
  | "conflict"
  | "blocked";

export interface CentralBusinessNumberedDocumentJournalOperation {
  operationId: string;
  input: CentralBusinessNumberedDocumentCreateInput;
  status: CentralBusinessNumberedDocumentJournalStatus;
  enqueuedAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: {
    code: string;
    message: string;
    status: number;
  };
  confirmation?: CentralBusinessNumberedDocumentCreateBrowserResult;
}

export interface CentralBusinessNumberedDocumentJournalState {
  schema: typeof CENTRAL_BUSINESS_NUMBERED_DOCUMENT_JOURNAL;
  ownerScope: string;
  revision: number;
  operations: CentralBusinessNumberedDocumentJournalOperation[];
}

export interface CentralBusinessNumberedDocumentJournalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type CentralBusinessNumberedDocumentJournalErrorCode =
  | "INVALID_OWNER_SCOPE"
  | "INVALID_OPERATION"
  | "JOURNAL_LIMIT_REACHED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_CORRUPTED"
  | "STORAGE_WRITE_FAILED"
  | "CONFIRMATION_MISMATCH";

export class CentralBusinessNumberedDocumentJournalError extends Error {
  readonly code: CentralBusinessNumberedDocumentJournalErrorCode;

  constructor(
    code: CentralBusinessNumberedDocumentJournalErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CentralBusinessNumberedDocumentJournalError";
    this.code = code;
  }
}

export type CentralBusinessNumberedDocumentJournalDrainResult =
  | {
      status: "empty";
      state: CentralBusinessNumberedDocumentJournalState;
    }
  | {
      status: "confirmed";
      operation: CentralBusinessNumberedDocumentJournalOperation & {
        status: "confirmed";
        confirmation: CentralBusinessNumberedDocumentCreateBrowserResult;
      };
      state: CentralBusinessNumberedDocumentJournalState;
    }
  | {
      status: "retryable" | "conflict" | "blocked";
      operation: CentralBusinessNumberedDocumentJournalOperation;
      state: CentralBusinessNumberedDocumentJournalState;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJson(value: unknown): boolean {
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

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

function assertOwnerScope(ownerScope: string) {
  if (
    typeof ownerScope !== "string" ||
    ownerScope.trim() !== ownerScope ||
    ownerScope.length < 8 ||
    ownerScope.length > 200 ||
    /[\u0000-\u001f\u007f]/u.test(ownerScope)
  ) {
    throw new CentralBusinessNumberedDocumentJournalError(
      "INVALID_OWNER_SCOPE",
      "El diario numerado requiere un ambito de propietario valido.",
    );
  }
}

function validTemplate(template: string): boolean {
  return (
    template.length >= 1 &&
    template.length <= 120 &&
    template.includes("{num}") &&
    !replaceKnownTemplateTokens(template).match(/[{}]/u) &&
    !/[\u0000-\u001f\u007f]/u.test(template)
  );
}

function replaceKnownTemplateTokens(template: string): string {
  return template.replaceAll("{num}", "").replaceAll("{year}", "");
}

function assertCreateInput(
  input: CentralBusinessNumberedDocumentCreateInput,
) {
  const payload = input.payloadWithoutNumber;
  const expectedType =
    input.entityType === "quote" ? "presupuesto" : "recibo";
  if (
    input.action !== "create" ||
    !/^[a-zA-Z0-9:_-]{12,160}$/u.test(input.idempotencyKey) ||
    (input.entityType !== "quote" && input.entityType !== "receipt") ||
    typeof input.entityId !== "string" ||
    input.entityId.length < 1 ||
    input.entityId.length > 200 ||
    !validTemplate(input.numberTemplate) ||
    !Number.isInteger(input.padding) ||
    input.padding < 1 ||
    input.padding > 8 ||
    !Number.isInteger(input.fiscalYear) ||
    input.fiscalYear < 2000 ||
    input.fiscalYear > 2100 ||
    !isObject(payload) ||
    !isJson(payload) ||
    payload.id !== input.entityId ||
    payload.type !== expectedType ||
    typeof payload.date !== "string" ||
    !payload.date.match(/^\d{4}-\d{2}-\d{2}$/u) ||
    Number(payload.date.slice(0, 4)) !== input.fiscalYear ||
    "number" in payload ||
    "centralInvoiceAuthority" in payload ||
    "rectification" in payload ||
    "verifactu" in payload
  ) {
    throw new CentralBusinessNumberedDocumentJournalError(
      "INVALID_OPERATION",
      "La operacion numerada no cumple el contrato del diario durable.",
    );
  }
}

function validConfirmation(
  value: unknown,
  input: CentralBusinessNumberedDocumentCreateInput,
): value is CentralBusinessNumberedDocumentCreateBrowserResult {
  const sequence =
    isObject(value) && typeof value.sequence === "number"
      ? value.sequence
      : Number.NaN;
  const expectedFullNumber = input.numberTemplate
    .replaceAll("{year}", String(input.fiscalYear))
    .replaceAll("{num}", String(sequence).padStart(input.padding, "0"));
  const expectedScopeYear = input.numberTemplate.includes("{year}")
    ? input.fiscalYear
    : 0;
  if (
    !isObject(value) ||
    value.schema !== "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1" ||
    value.action !== "create" ||
    (value.status !== "committed" && value.status !== "replayed") ||
    typeof value.eventId !== "string" ||
    typeof value.eventSequence !== "number" ||
    !Number.isSafeInteger(value.eventSequence) ||
    value.eventSequence < 1 ||
    value.entityVersion !== 1 ||
    typeof value.fullNumber !== "string" ||
    !value.fullNumber ||
    typeof value.sequence !== "number" ||
    !Number.isInteger(value.sequence) ||
    value.sequence < 1 ||
    value.sequence > 999999 ||
    typeof value.scopeYear !== "number" ||
    !Number.isInteger(value.scopeYear) ||
    value.scopeYear !== expectedScopeYear ||
    typeof value.contentHash !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.contentHash) ||
    !isObject(value.documentPayload) ||
    !isJson(value.documentPayload) ||
    value.documentPayload.id !== input.entityId ||
    value.documentPayload.type !==
      (input.entityType === "quote" ? "presupuesto" : "recibo") ||
    value.documentPayload.number !== value.fullNumber ||
    value.fullNumber !== expectedFullNumber ||
    stableJson(value.documentPayload) !==
      stableJson({
        ...(input.payloadWithoutNumber as Record<string, unknown>),
        number: expectedFullNumber,
      })
  ) {
    return false;
  }
  return true;
}

function storageKey(ownerScope: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(ownerScope)}`;
}

function defaultStorage(): CentralBusinessNumberedDocumentJournalStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function resolveStorage(
  storage?: CentralBusinessNumberedDocumentJournalStorage,
): CentralBusinessNumberedDocumentJournalStorage {
  const resolved = storage ?? defaultStorage();
  if (!resolved) {
    throw new CentralBusinessNumberedDocumentJournalError(
      "STORAGE_UNAVAILABLE",
      "No hay almacenamiento durable para proteger el documento numerado.",
    );
  }
  return resolved;
}

function emptyState(
  ownerScope: string,
): CentralBusinessNumberedDocumentJournalState {
  return {
    schema: CENTRAL_BUSINESS_NUMBERED_DOCUMENT_JOURNAL,
    ownerScope,
    revision: 0,
    operations: [],
  };
}

function parseState(
  raw: string,
  ownerScope: string,
): CentralBusinessNumberedDocumentJournalState | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isObject(value) ||
    value.schema !== CENTRAL_BUSINESS_NUMBERED_DOCUMENT_JOURNAL ||
    value.ownerScope !== ownerScope ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0 ||
    !Array.isArray(value.operations) ||
    value.operations.length > MAX_OPERATIONS
  ) {
    return null;
  }
  try {
    const operationIds = new Set<string>();
    for (const operation of value.operations) {
      if (
        !isObject(operation) ||
        typeof operation.operationId !== "string" ||
        operationIds.has(operation.operationId) ||
        !isObject(operation.input) ||
        operation.operationId !== operation.input.idempotencyKey ||
        (operation.status !== "pending" &&
          operation.status !== "confirmed" &&
          operation.status !== "conflict" &&
          operation.status !== "blocked") ||
        typeof operation.enqueuedAt !== "string" ||
        !Number.isSafeInteger(operation.attemptCount) ||
        (operation.attemptCount as number) < 0 ||
        (operation.lastAttemptAt !== undefined &&
          typeof operation.lastAttemptAt !== "string") ||
        (operation.lastError !== undefined &&
          (!isObject(operation.lastError) ||
            typeof operation.lastError.code !== "string" ||
            typeof operation.lastError.message !== "string" ||
            typeof operation.lastError.status !== "number" ||
            !Number.isInteger(operation.lastError.status)))
      ) {
        return null;
      }
      const parsedInput =
        operation.input as unknown as CentralBusinessNumberedDocumentCreateInput;
      assertCreateInput(parsedInput);
      if (
        operation.status === "confirmed"
          ? !validConfirmation(operation.confirmation, parsedInput)
          : operation.confirmation !== undefined
      ) {
        return null;
      }
      operationIds.add(operation.operationId);
    }
  } catch {
    return null;
  }
  return value as unknown as CentralBusinessNumberedDocumentJournalState;
}

function persistState(
  state: CentralBusinessNumberedDocumentJournalState,
  storage: CentralBusinessNumberedDocumentJournalStorage,
): CentralBusinessNumberedDocumentJournalState {
  const next = { ...state, revision: state.revision + 1 };
  const serialized = JSON.stringify(next);
  try {
    storage.setItem(storageKey(next.ownerScope), serialized);
    if (storage.getItem(storageKey(next.ownerScope)) !== serialized) {
      throw new Error("readback mismatch");
    }
  } catch {
    throw new CentralBusinessNumberedDocumentJournalError(
      "STORAGE_WRITE_FAILED",
      "No se pudo guardar y releer el diario del documento numerado.",
    );
  }
  return next;
}

export function loadCentralBusinessNumberedDocumentJournal(
  ownerScope: string,
  storage?: CentralBusinessNumberedDocumentJournalStorage,
): CentralBusinessNumberedDocumentJournalState {
  assertOwnerScope(ownerScope);
  const resolved = resolveStorage(storage);
  let raw: string | null;
  try {
    raw = resolved.getItem(storageKey(ownerScope));
  } catch {
    throw new CentralBusinessNumberedDocumentJournalError(
      "STORAGE_UNAVAILABLE",
      "No se pudo leer el diario de documentos numerados.",
    );
  }
  if (raw === null) return emptyState(ownerScope);
  const state = parseState(raw, ownerScope);
  if (!state) {
    throw new CentralBusinessNumberedDocumentJournalError(
      "STORAGE_CORRUPTED",
      "El diario de documentos numerados no supera la comprobacion de integridad.",
    );
  }
  return state;
}

export function enqueueCentralBusinessNumberedDocumentCreate(input: {
  ownerScope: string;
  operationId: string;
  command: CentralBusinessNumberedDocumentCreateInput;
  storage?: CentralBusinessNumberedDocumentJournalStorage;
  now?: () => string;
}): {
  operation: CentralBusinessNumberedDocumentJournalOperation;
  replayed: boolean;
  state: CentralBusinessNumberedDocumentJournalState;
} {
  assertOwnerScope(input.ownerScope);
  assertCreateInput(input.command);
  if (
    input.operationId !== input.command.idempotencyKey ||
    !/^[a-zA-Z0-9:_-]{12,160}$/u.test(input.operationId)
  ) {
    throw new CentralBusinessNumberedDocumentJournalError(
      "INVALID_OPERATION",
      "La operacion numerada y su clave idempotente deben coincidir.",
    );
  }
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessNumberedDocumentJournal(
    input.ownerScope,
    storage,
  );
  const existing = state.operations.find(
    (operation) =>
      operation.operationId === input.operationId ||
      operation.input.idempotencyKey === input.command.idempotencyKey,
  );
  if (existing) {
    if (stableJson(existing.input) !== stableJson(input.command)) {
      throw new CentralBusinessNumberedDocumentJournalError(
        "IDEMPOTENCY_KEY_REUSED",
        "La identidad numerada ya pertenece a otro contenido.",
      );
    }
    return { operation: existing, replayed: true, state };
  }
  if (state.operations.length >= MAX_OPERATIONS) {
    throw new CentralBusinessNumberedDocumentJournalError(
      "JOURNAL_LIMIT_REACHED",
      "El diario numerado esta lleno y requiere sincronizacion.",
    );
  }
  const operation: CentralBusinessNumberedDocumentJournalOperation = {
    operationId: input.operationId,
    input: { ...input.command },
    status: "pending",
    enqueuedAt: (input.now ?? (() => new Date().toISOString()))(),
    attemptCount: 0,
  };
  const persisted = persistState(
    { ...state, operations: [...state.operations, operation] },
    storage,
  );
  return { operation, replayed: false, state: persisted };
}

export async function drainCentralBusinessNumberedDocumentJournal(input: {
  ownerScope: string;
  mutate: (
    command: CentralBusinessNumberedDocumentCreateInput,
  ) => Promise<CentralBusinessNumberedDocumentBrowserResult>;
  storage?: CentralBusinessNumberedDocumentJournalStorage;
  now?: () => string;
}): Promise<CentralBusinessNumberedDocumentJournalDrainResult> {
  const storage = resolveStorage(input.storage);
  let state = loadCentralBusinessNumberedDocumentJournal(
    input.ownerScope,
    storage,
  );
  const current = state.operations[0];
  if (!current) return { status: "empty", state };
  if (
    current.status === "confirmed" &&
    current.confirmation &&
    validConfirmation(current.confirmation, current.input)
  ) {
    return {
      status: "confirmed",
      operation: current as CentralBusinessNumberedDocumentJournalOperation & {
        status: "confirmed";
        confirmation: CentralBusinessNumberedDocumentCreateBrowserResult;
      },
      state,
    };
  }
  if (current.status === "conflict" || current.status === "blocked") {
    return { status: current.status, operation: current, state };
  }

  const lastAttemptAt = (input.now ?? (() => new Date().toISOString()))();
  const attempted: CentralBusinessNumberedDocumentJournalOperation = {
    ...current,
    attemptCount: current.attemptCount + 1,
    lastAttemptAt,
  };
  state = persistState(
    {
      ...state,
      operations: [attempted, ...state.operations.slice(1)],
    },
    storage,
  );
  const result = await input.mutate(attempted.input);
  if (result.ok && result.result.action === "create") {
    if (!validConfirmation(result.result, attempted.input)) {
      const blocked: CentralBusinessNumberedDocumentJournalOperation = {
        ...attempted,
        status: "blocked",
        lastError: {
          code: "CENTRAL_BUSINESS_NUMBERED_CONFIRMATION_INVALID",
          message:
            "La confirmacion numerada no coincide con el comando conservado.",
          status: 502,
        },
      };
      state = persistState(
        {
          ...state,
          operations: [blocked, ...state.operations.slice(1)],
        },
        storage,
      );
      return { status: "blocked", operation: blocked, state };
    }
    const confirmed: CentralBusinessNumberedDocumentJournalOperation = {
      ...attempted,
      status: "confirmed",
      confirmation: result.result,
      lastError: undefined,
    };
    state = persistState(
      {
        ...state,
        operations: [confirmed, ...state.operations.slice(1)],
      },
      storage,
    );
    return {
      status: "confirmed",
      operation: confirmed as CentralBusinessNumberedDocumentJournalOperation & {
        status: "confirmed";
        confirmation: CentralBusinessNumberedDocumentCreateBrowserResult;
      },
      state,
    };
  }

  const failure: Extract<
    CentralBusinessNumberedDocumentBrowserResult,
    { ok: false }
  > = result.ok
    ? {
        ok: false,
        status: 502,
        code: "CENTRAL_BUSINESS_NUMBERED_CONFIRMATION_INVALID",
        message: "El servidor devolvio otra accion para el comando numerado.",
        retryable: false,
        conflict: false,
      }
    : result;
  const stoppedBy = failure.retryable
    ? "retryable"
    : failure.conflict
      ? "conflict"
      : "blocked";
  const failed: CentralBusinessNumberedDocumentJournalOperation = {
    ...attempted,
    status: stoppedBy === "retryable" ? "pending" : stoppedBy,
    lastError: {
      code: failure.code,
      message: failure.message,
      status: failure.status,
    },
  };
  state = persistState(
    {
      ...state,
      operations: [failed, ...state.operations.slice(1)],
    },
    storage,
  );
  return { status: stoppedBy, operation: failed, state };
}

export function acknowledgeCentralBusinessNumberedDocument(input: {
  ownerScope: string;
  operationId: string;
  eventId: string;
  contentHash: string;
  storage?: CentralBusinessNumberedDocumentJournalStorage;
}): CentralBusinessNumberedDocumentJournalState {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessNumberedDocumentJournal(
    input.ownerScope,
    storage,
  );
  const current = state.operations[0];
  if (
    !current ||
    current.operationId !== input.operationId ||
    current.status !== "confirmed" ||
    current.confirmation?.eventId !== input.eventId ||
    current.confirmation.contentHash !== input.contentHash
  ) {
    throw new CentralBusinessNumberedDocumentJournalError(
      "CONFIRMATION_MISMATCH",
      "El acuse local no coincide con el documento confirmado por el servidor.",
    );
  }
  return persistState(
    { ...state, operations: state.operations.slice(1) },
    storage,
  );
}
