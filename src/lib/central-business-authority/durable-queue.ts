"use client";

import type { CentralBusinessBrowserEvent } from "./events-client";
import type {
  CentralBusinessBrowserMutationInput,
  CentralBusinessBrowserMutationResult,
} from "./mutation-client";
import type {
  CentralBusinessEntityType,
  CentralBusinessJson,
} from "./mutation-command";

export const CENTRAL_BUSINESS_DURABLE_QUEUE =
  "CENTRAL_BUSINESS_DURABLE_QUEUE_V1";

const STORAGE_PREFIX = "factu:central-business-authority:durable-queue:v1:";
const MAX_OPERATIONS = 1_000;
const ENTITY_TYPES = new Set<CentralBusinessEntityType>([
  "customer",
  "supplier",
  "product",
  "expense",
  "recurring_expense",
  "user_reminder",
  "profile",
]);
const fallbackLocks = new Map<string, Promise<void>>();

export type CentralBusinessQueuedOperationStatus =
  | "pending"
  | "conflict"
  | "blocked";

export interface CentralBusinessQueuedOperation {
  operationId: string;
  input: CentralBusinessBrowserMutationInput;
  status: CentralBusinessQueuedOperationStatus;
  enqueuedAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: {
    code: string;
    message: string;
    status: number;
  };
}

export interface CentralBusinessEntityVersion {
  entityType: CentralBusinessEntityType;
  entityId: string;
  version: number;
  deleted: boolean;
  contentHash: string;
}

export interface CentralBusinessDurableQueueState {
  schema: typeof CENTRAL_BUSINESS_DURABLE_QUEUE;
  ownerScope: string;
  revision: number;
  lastAppliedEventSequence: number;
  operations: CentralBusinessQueuedOperation[];
  entityVersions: Record<string, CentralBusinessEntityVersion>;
}

export type CentralBusinessDurableQueueErrorCode =
  | "INVALID_OWNER_SCOPE"
  | "INVALID_OPERATION"
  | "QUEUE_LIMIT_REACHED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_CORRUPTED"
  | "STORAGE_WRITE_FAILED"
  | "EVENT_PAGE_INVALID"
  | "EVENT_VERSION_CONFLICT"
  | "LOCAL_OPERATION_CONFLICT"
  | "EVENT_APPLY_FAILED";

export class CentralBusinessDurableQueueError extends Error {
  readonly code: CentralBusinessDurableQueueErrorCode;

  constructor(code: CentralBusinessDurableQueueErrorCode, message: string) {
    super(message);
    this.name = "CentralBusinessDurableQueueError";
    this.code = code;
  }
}

export interface CentralBusinessQueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CentralBusinessDrainResult {
  processed: number;
  remaining: number;
  stoppedBy: "empty" | "retryable" | "conflict" | "blocked";
  state: CentralBusinessDurableQueueState;
}

export type CentralBusinessEventApplyResult =
  | {
      ok: true;
      applied: number;
      skipped: number;
      state: CentralBusinessDurableQueueState;
    }
  | {
      ok: false;
      code: CentralBusinessDurableQueueErrorCode;
      message: string;
      state: CentralBusinessDurableQueueState;
    };

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

function stableJson(value: CentralBusinessJson): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

function entityKey(entityType: CentralBusinessEntityType, entityId: string) {
  return `${entityType}:${entityId}`;
}

function storageKey(ownerScope: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(ownerScope)}`;
}

function defaultStorage(): CentralBusinessQueueStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function assertOwnerScope(ownerScope: string) {
  if (
    typeof ownerScope !== "string" ||
    ownerScope.trim() !== ownerScope ||
    ownerScope.length < 8 ||
    ownerScope.length > 200 ||
    /[\u0000-\u001f\u007f]/u.test(ownerScope)
  ) {
    throw new CentralBusinessDurableQueueError(
      "INVALID_OWNER_SCOPE",
      "La cola central requiere un ambito de propietario valido.",
    );
  }
}

function assertMutationInput(input: CentralBusinessBrowserMutationInput) {
  if (
    !input ||
    !/^[a-zA-Z0-9:_-]{12,160}$/u.test(input.idempotencyKey) ||
    (input.operationKind !== "upsert" && input.operationKind !== "delete") ||
    !ENTITY_TYPES.has(input.entityType) ||
    typeof input.entityId !== "string" ||
    input.entityId.length < 1 ||
    input.entityId.length > 200 ||
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion < 0 ||
    !isJson(input.payload) ||
    (input.operationKind === "upsert" &&
      (input.payload === null || typeof input.payload !== "object")) ||
    (input.operationKind === "delete" && input.payload !== null) ||
    (input.entityType === "profile" && input.entityId !== "profile")
  ) {
    throw new CentralBusinessDurableQueueError(
      "INVALID_OPERATION",
      "La operacion no cumple el contrato de la cola central.",
    );
  }
}

function emptyState(ownerScope: string): CentralBusinessDurableQueueState {
  return {
    schema: CENTRAL_BUSINESS_DURABLE_QUEUE,
    ownerScope,
    revision: 0,
    lastAppliedEventSequence: 0,
    operations: [],
    entityVersions: {},
  };
}

function cloneState(
  state: CentralBusinessDurableQueueState,
): CentralBusinessDurableQueueState {
  return {
    ...state,
    operations: state.operations.map((operation) => ({
      ...operation,
      input: { ...operation.input },
      lastError: operation.lastError
        ? { ...operation.lastError }
        : undefined,
    })),
    entityVersions: Object.fromEntries(
      Object.entries(state.entityVersions).map(([key, value]) => [
        key,
        { ...value },
      ]),
    ),
  };
}

function parseState(
  raw: string,
  ownerScope: string,
): CentralBusinessDurableQueueState | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isObject(value) ||
    value.schema !== CENTRAL_BUSINESS_DURABLE_QUEUE ||
    value.ownerScope !== ownerScope ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0 ||
    !Number.isSafeInteger(value.lastAppliedEventSequence) ||
    (value.lastAppliedEventSequence as number) < 0 ||
    !Array.isArray(value.operations) ||
    value.operations.length > MAX_OPERATIONS ||
    !isObject(value.entityVersions)
  ) {
    return null;
  }

  try {
    for (const operation of value.operations) {
      if (
        !isObject(operation) ||
        typeof operation.operationId !== "string" ||
        !isObject(operation.input) ||
        (operation.status !== "pending" &&
          operation.status !== "conflict" &&
          operation.status !== "blocked") ||
        typeof operation.enqueuedAt !== "string" ||
        !Number.isSafeInteger(operation.attemptCount) ||
        (operation.attemptCount as number) < 0
      ) {
        return null;
      }
      assertMutationInput(
        operation.input as unknown as CentralBusinessBrowserMutationInput,
      );
    }
    for (const [key, version] of Object.entries(value.entityVersions)) {
      if (
        !isObject(version) ||
        !ENTITY_TYPES.has(version.entityType as CentralBusinessEntityType) ||
        key !==
          entityKey(
            version.entityType as CentralBusinessEntityType,
            String(version.entityId),
          ) ||
        typeof version.entityId !== "string" ||
        typeof version.version !== "number" ||
        !Number.isInteger(version.version) ||
        version.version <= 0 ||
        typeof version.deleted !== "boolean" ||
        typeof version.contentHash !== "string"
      ) {
        return null;
      }
    }
  } catch {
    return null;
  }
  return value as unknown as CentralBusinessDurableQueueState;
}

async function withFallbackLock<T>(
  key: string,
  task: () => Promise<T> | T,
): Promise<T> {
  const previous = fallbackLocks.get(key) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current);
  fallbackLocks.set(key, chained);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (fallbackLocks.get(key) === chained) fallbackLocks.delete(key);
  }
}

export async function withCentralBusinessQueueLock<T>(
  ownerScope: string,
  task: () => Promise<T> | T,
): Promise<T> {
  assertOwnerScope(ownerScope);
  const key = `central-business-authority:${ownerScope}`;
  if (
    typeof navigator !== "undefined" &&
    navigator.locks &&
    typeof navigator.locks.request === "function"
  ) {
    return navigator.locks.request(key, { mode: "exclusive" }, task);
  }
  return withFallbackLock(key, task);
}

function resolveStorage(
  storage?: CentralBusinessQueueStorage,
): CentralBusinessQueueStorage {
  const resolved = storage ?? defaultStorage();
  if (!resolved) {
    throw new CentralBusinessDurableQueueError(
      "STORAGE_UNAVAILABLE",
      "No hay almacenamiento duradero disponible para proteger el cambio.",
    );
  }
  return resolved;
}

function persistState(
  state: CentralBusinessDurableQueueState,
  storage: CentralBusinessQueueStorage,
): CentralBusinessDurableQueueState {
  const next = { ...state, revision: state.revision + 1 };
  const serialized = JSON.stringify(next);
  const key = storageKey(next.ownerScope);
  try {
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) {
      throw new Error("readback mismatch");
    }
  } catch {
    throw new CentralBusinessDurableQueueError(
      "STORAGE_WRITE_FAILED",
      "No se pudo guardar y verificar la cola central. El cambio local debe cancelarse.",
    );
  }
  return next;
}

export function loadCentralBusinessDurableQueue(
  ownerScope: string,
  storage?: CentralBusinessQueueStorage,
): CentralBusinessDurableQueueState {
  assertOwnerScope(ownerScope);
  const resolved = resolveStorage(storage);
  let raw: string | null;
  try {
    raw = resolved.getItem(storageKey(ownerScope));
  } catch {
    throw new CentralBusinessDurableQueueError(
      "STORAGE_UNAVAILABLE",
      "No se pudo leer la cola central.",
    );
  }
  if (raw === null) return emptyState(ownerScope);
  const state = parseState(raw, ownerScope);
  if (!state) {
    throw new CentralBusinessDurableQueueError(
      "STORAGE_CORRUPTED",
      "La cola central guardada no supera la comprobacion de integridad.",
    );
  }
  return state;
}

export function enqueueCentralBusinessOperation(input: {
  ownerScope: string;
  operationId: string;
  mutation: CentralBusinessBrowserMutationInput;
  storage?: CentralBusinessQueueStorage;
  now?: () => string;
}): {
  queued: CentralBusinessQueuedOperation;
  replayed: boolean;
  state: CentralBusinessDurableQueueState;
} {
  assertOwnerScope(input.ownerScope);
  assertMutationInput(input.mutation);
  if (
    !/^[a-zA-Z0-9:_-]{12,200}$/u.test(input.operationId) ||
    input.operationId !== input.mutation.idempotencyKey
  ) {
    throw new CentralBusinessDurableQueueError(
      "INVALID_OPERATION",
      "La operacion y su clave idempotente deben compartir una identidad estable.",
    );
  }
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  const existing = state.operations.find(
    (operation) =>
      operation.operationId === input.operationId ||
      operation.input.idempotencyKey === input.mutation.idempotencyKey,
  );
  if (existing) {
    if (
      stableJson(existing.input as unknown as CentralBusinessJson) !==
      stableJson(input.mutation as unknown as CentralBusinessJson)
    ) {
      throw new CentralBusinessDurableQueueError(
        "IDEMPOTENCY_KEY_REUSED",
        "La identidad de una operacion pendiente no puede reutilizarse con otro contenido.",
      );
    }
    return { queued: existing, replayed: true, state };
  }
  if (state.operations.length >= MAX_OPERATIONS) {
    throw new CentralBusinessDurableQueueError(
      "QUEUE_LIMIT_REACHED",
      "La cola central esta llena y debe sincronizarse antes de guardar mas cambios.",
    );
  }
  const queued: CentralBusinessQueuedOperation = {
    operationId: input.operationId,
    input: { ...input.mutation },
    status: "pending",
    enqueuedAt: (input.now ?? (() => new Date().toISOString()))(),
    attemptCount: 0,
  };
  const persisted = persistState(
    { ...state, operations: [...state.operations, queued] },
    storage,
  );
  return { queued, replayed: false, state: persisted };
}

export async function drainCentralBusinessDurableQueue(input: {
  ownerScope: string;
  storage?: CentralBusinessQueueStorage;
  mutate: (
    mutation: CentralBusinessBrowserMutationInput,
  ) => Promise<CentralBusinessBrowserMutationResult>;
  now?: () => string;
}): Promise<CentralBusinessDrainResult> {
  const storage = resolveStorage(input.storage);
  let state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  let processed = 0;

  while (state.operations.length > 0) {
    const current = state.operations[0];
    if (current.status === "conflict" || current.status === "blocked") {
      return {
        processed,
        remaining: state.operations.length,
        stoppedBy: current.status,
        state,
      };
    }
    const attempted: CentralBusinessQueuedOperation = {
      ...current,
      attemptCount: current.attemptCount + 1,
      lastAttemptAt: (input.now ?? (() => new Date().toISOString()))(),
    };
    state = persistState(
      { ...state, operations: [attempted, ...state.operations.slice(1)] },
      storage,
    );

    const result = await input.mutate(attempted.input);
    if (result.ok) {
      const key = entityKey(
        attempted.input.entityType,
        attempted.input.entityId,
      );
      state = persistState(
        {
          ...state,
          operations: state.operations.slice(1),
          entityVersions: {
            ...state.entityVersions,
            [key]: {
              entityType: attempted.input.entityType,
              entityId: attempted.input.entityId,
              version: result.entityVersion,
              deleted: result.deleted,
              contentHash: result.contentHash,
            },
          },
        },
        storage,
      );
      processed += 1;
      continue;
    }

    const stoppedBy: "retryable" | "conflict" | "blocked" = result.retryable
      ? "retryable"
      : result.conflict
        ? "conflict"
        : "blocked";
    const failed: CentralBusinessQueuedOperation = {
      ...state.operations[0],
      status: stoppedBy === "retryable" ? "pending" : stoppedBy,
      lastError: {
        code: result.code,
        message: result.message,
        status: result.status,
      },
    };
    state = persistState(
      { ...state, operations: [failed, ...state.operations.slice(1)] },
      storage,
    );
    return {
      processed,
      remaining: state.operations.length,
      stoppedBy,
      state,
    };
  }

  return { processed, remaining: 0, stoppedBy: "empty", state };
}

export function retryCentralBusinessOperation(input: {
  ownerScope: string;
  operationId: string;
  storage?: CentralBusinessQueueStorage;
}): CentralBusinessDurableQueueState {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  const operations = state.operations.map((operation) =>
    operation.operationId === input.operationId
      ? {
          ...operation,
          status: "pending" as const,
          lastError: undefined,
        }
      : operation,
  );
  return persistState({ ...state, operations }, storage);
}

export function discardCentralBusinessOperation(input: {
  ownerScope: string;
  operationId: string;
  storage?: CentralBusinessQueueStorage;
}): CentralBusinessDurableQueueState {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  return persistState(
    {
      ...state,
      operations: state.operations.filter(
        (operation) => operation.operationId !== input.operationId,
      ),
    },
    storage,
  );
}

export async function applyCentralBusinessEventPage(input: {
  ownerScope: string;
  events: CentralBusinessBrowserEvent[];
  nextSequence: number;
  storage?: CentralBusinessQueueStorage;
  applyEvent: (event: CentralBusinessBrowserEvent) => Promise<void>;
}): Promise<CentralBusinessEventApplyResult> {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  const events = input.events;
  let previousSequence = state.lastAppliedEventSequence;
  if (
    !Number.isSafeInteger(input.nextSequence) ||
    input.nextSequence < state.lastAppliedEventSequence ||
    (events.length === 0 &&
      input.nextSequence !== state.lastAppliedEventSequence)
  ) {
    return {
      ok: false,
      code: "EVENT_PAGE_INVALID",
      message: "La pagina de eventos no prolonga el cursor local.",
      state,
    };
  }
  for (const event of events) {
    if (
      event.eventSequence <= previousSequence ||
      event.eventSequence > input.nextSequence
    ) {
      return {
        ok: false,
        code: "EVENT_PAGE_INVALID",
        message: "Los eventos no estan ordenados despues del cursor local.",
        state,
      };
    }
    previousSequence = event.eventSequence;
  }
  if (
    events.length > 0 &&
    events[events.length - 1].eventSequence !== input.nextSequence
  ) {
    return {
      ok: false,
      code: "EVENT_PAGE_INVALID",
      message: "El cursor de la pagina no coincide con su ultimo evento.",
      state,
    };
  }

  const conflictingKeys = new Set(
    events.map((event) => entityKey(event.entityType, event.entityId)),
  );
  const localConflicts = state.operations.filter((operation) =>
    conflictingKeys.has(
      entityKey(operation.input.entityType, operation.input.entityId),
    ),
  );
  if (localConflicts.length > 0) {
    const operationIds = new Set(
      localConflicts.map((operation) => operation.operationId),
    );
    const conflictState = persistState(
      {
        ...state,
        operations: state.operations.map((operation) =>
          operationIds.has(operation.operationId)
            ? {
                ...operation,
                status: "conflict" as const,
                lastError: {
                  code: "CENTRAL_BUSINESS_REMOTE_EVENT_CONFLICT",
                  message:
                    "La nube cambio esta entidad mientras habia una operacion local pendiente.",
                  status: 409,
                },
              }
            : operation,
        ),
      },
      storage,
    );
    return {
      ok: false,
      code: "LOCAL_OPERATION_CONFLICT",
      message:
        "Hay cambios locales pendientes sobre una entidad modificada en la nube.",
      state: conflictState,
    };
  }

  const nextState = cloneState(state);
  let applied = 0;
  let skipped = 0;
  for (const event of events) {
    const key = entityKey(event.entityType, event.entityId);
    const known = nextState.entityVersions[key];
    if (known && event.entityVersion <= known.version) {
      if (
        event.entityVersion === known.version &&
        event.contentHash === known.contentHash
      ) {
        skipped += 1;
        continue;
      }
      return {
        ok: false,
        code: "EVENT_VERSION_CONFLICT",
        message: "Un evento antiguo no coincide con la version local confirmada.",
        state,
      };
    }
    if (known && event.entityVersion !== known.version + 1) {
      return {
        ok: false,
        code: "EVENT_VERSION_CONFLICT",
        message: "Falta una version intermedia antes de aplicar este evento.",
        state,
      };
    }
    if (!known && event.entityVersion !== 1) {
      return {
        ok: false,
        code: "EVENT_VERSION_CONFLICT",
        message: "La primera version recibida de la entidad no es la inicial.",
        state,
      };
    }
    try {
      await input.applyEvent(event);
    } catch {
      return {
        ok: false,
        code: "EVENT_APPLY_FAILED",
        message:
          "No se aplico toda la pagina. El cursor se conserva para reintentar.",
        state,
      };
    }
    nextState.entityVersions[key] = {
      entityType: event.entityType,
      entityId: event.entityId,
      version: event.entityVersion,
      deleted: event.operationKind === "delete",
      contentHash: event.contentHash,
    };
    applied += 1;
  }
  nextState.lastAppliedEventSequence = input.nextSequence;
  return {
    ok: true,
    applied,
    skipped,
    state: persistState(nextState, storage),
  };
}
