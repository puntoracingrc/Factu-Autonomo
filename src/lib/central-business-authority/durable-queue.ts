"use client";

import type { CentralBusinessBrowserEvent } from "./events-client";
import type {
  CentralBusinessBrowserMutationInput,
  CentralBusinessBrowserMutationResult,
} from "./mutation-client";
import type {
  CentralBusinessBrowserBatchMutationInput,
  CentralBusinessBrowserBatchMutationResult,
} from "./batch-mutation-client";
import { CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS } from "./batch-contract";
import type {
  CentralBusinessEntityType,
  CentralBusinessJson,
} from "./mutation-command";

export const CENTRAL_BUSINESS_DURABLE_QUEUE =
  "CENTRAL_BUSINESS_DURABLE_QUEUE_V1";
export const CENTRAL_BUSINESS_DURABLE_QUEUE_CHANGED_EVENT =
  "factu:central-business-authority:durable-queue-changed";

const STORAGE_PREFIX = "factu:central-business-authority:durable-queue:v1:";
const MAX_OPERATIONS = 1_000;
const ENTITY_TYPES = new Set<CentralBusinessEntityType>([
  "customer",
  "supplier",
  "product",
  "expense",
  "recurring_expense",
  "user_reminder",
  "quote",
  "receipt",
  "profile",
]);
const fallbackLocks = new Map<string, Promise<void>>();

export type CentralBusinessQueuedOperationStatus =
  "pending" | "conflict" | "blocked";

export interface CentralBusinessQueuedOperation {
  operationId: string;
  input: CentralBusinessBrowserMutationInput;
  batchId?: string;
  batchIndex?: number;
  batchSize?: number;
  status: CentralBusinessQueuedOperationStatus;
  enqueuedAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: {
    code: string;
    message: string;
    status: number;
  };
  resolution?: "accept_server";
}

export interface CentralBusinessEntityVersion {
  entityType: CentralBusinessEntityType;
  entityId: string;
  version: number;
  deleted: boolean;
  contentHash: string;
}

export interface CentralBusinessEntityVersionCheckpoint {
  entityType: CentralBusinessEntityType;
  entityId: string;
  version: number;
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

function validBatchId(value: string): boolean {
  return /^[a-zA-Z0-9:_-]{12,200}$/u.test(value);
}

function validateBatchGroups(
  operations: CentralBusinessQueuedOperation[],
): boolean {
  const batches = new Map<
    string,
    Array<{ operation: CentralBusinessQueuedOperation; position: number }>
  >();
  for (const [position, operation] of operations.entries()) {
    const metadata = [
      operation.batchId,
      operation.batchIndex,
      operation.batchSize,
    ];
    const metadataCount = metadata.filter(
      (value) => value !== undefined,
    ).length;
    if (metadataCount === 0) continue;
    if (
      metadataCount !== 3 ||
      typeof operation.batchId !== "string" ||
      !validBatchId(operation.batchId) ||
      !Number.isInteger(operation.batchIndex) ||
      !Number.isInteger(operation.batchSize) ||
      operation.batchIndex! < 0 ||
      operation.batchSize! < 1 ||
      operation.batchSize! > CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS ||
      operation.batchIndex! >= operation.batchSize!
    ) {
      return false;
    }
    const entries = batches.get(operation.batchId) ?? [];
    entries.push({ operation, position });
    batches.set(operation.batchId, entries);
  }

  for (const entries of batches.values()) {
    const size = entries[0].operation.batchSize!;
    if (entries.length !== size) return false;
    const firstPosition = entries[0].position;
    for (const [index, entry] of entries.entries()) {
      if (
        entry.position !== firstPosition + index ||
        entry.operation.batchSize !== size ||
        entry.operation.batchIndex !== index
      ) {
        return false;
      }
    }
  }
  return true;
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
      lastError: operation.lastError ? { ...operation.lastError } : undefined,
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
        (operation.attemptCount as number) < 0 ||
        (operation.resolution !== undefined &&
          operation.resolution !== "accept_server")
      ) {
        return null;
      }
      assertMutationInput(
        operation.input as unknown as CentralBusinessBrowserMutationInput,
      );
    }
    if (
      !validateBatchGroups(
        value.operations as unknown as CentralBusinessQueuedOperation[],
      )
    ) {
      return null;
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CENTRAL_BUSINESS_DURABLE_QUEUE_CHANGED_EVENT, {
        detail: { ownerScope: next.ownerScope, revision: next.revision },
      }),
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

export function recordCentralBusinessEntityVersionCheckpoint(input: {
  ownerScope: string;
  entities: CentralBusinessEntityVersionCheckpoint[];
  storage?: CentralBusinessQueueStorage;
}): CentralBusinessDurableQueueState {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  if (state.operations.length > 0) {
    throw new CentralBusinessDurableQueueError(
      "LOCAL_OPERATION_CONFLICT",
      "No se puede enlazar la copia central mientras haya cambios pendientes.",
    );
  }

  const entityVersions = { ...state.entityVersions };
  const seen = new Set<string>();
  for (const entity of input.entities) {
    const key = entityKey(entity.entityType, entity.entityId);
    if (
      seen.has(key) ||
      !ENTITY_TYPES.has(entity.entityType) ||
      !entity.entityId ||
      entity.entityId.length > 200 ||
      !Number.isInteger(entity.version) ||
      entity.version < 1 ||
      !/^[0-9a-f]{64}$/u.test(entity.contentHash)
    ) {
      throw new CentralBusinessDurableQueueError(
        "INVALID_OPERATION",
        "El punto de enlace central contiene una versión inválida.",
      );
    }
    seen.add(key);
    entityVersions[key] = {
      ...entity,
      deleted: false,
    };
  }

  return persistState({ ...state, entityVersions }, storage);
}

export function rewindCentralBusinessEventCursorForReconciliation(input: {
  ownerScope: string;
  storage?: CentralBusinessQueueStorage;
}): CentralBusinessDurableQueueState {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  if (state.operations.length > 0) {
    throw new CentralBusinessDurableQueueError(
      "LOCAL_OPERATION_CONFLICT",
      "No se puede releer el historial central mientras haya cambios pendientes.",
    );
  }
  if (state.lastAppliedEventSequence === 0) return state;
  return persistState(
    {
      ...state,
      lastAppliedEventSequence: 0,
    },
    storage,
  );
}

export function resetCentralBusinessEventStateForServerAdoption(input: {
  ownerScope: string;
  storage?: CentralBusinessQueueStorage;
}): CentralBusinessDurableQueueState {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  if (state.operations.length > 0) {
    throw new CentralBusinessDurableQueueError(
      "LOCAL_OPERATION_CONFLICT",
      "No se puede adoptar la copia central mientras haya cambios pendientes.",
    );
  }
  if (
    state.lastAppliedEventSequence === 0 &&
    Object.keys(state.entityVersions).length === 0
  ) {
    return state;
  }
  return persistState(
    {
      ...state,
      lastAppliedEventSequence: 0,
      entityVersions: {},
    },
    storage,
  );
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

export function enqueueCentralBusinessBatch(input: {
  ownerScope: string;
  batchId: string;
  mutations: CentralBusinessBrowserBatchMutationInput[];
  storage?: CentralBusinessQueueStorage;
  now?: () => string;
}): {
  queued: CentralBusinessQueuedOperation[];
  replayed: boolean;
  state: CentralBusinessDurableQueueState;
} {
  assertOwnerScope(input.ownerScope);
  if (
    !validBatchId(input.batchId) ||
    input.mutations.length < 1 ||
    input.mutations.length > CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS
  ) {
    throw new CentralBusinessDurableQueueError(
      "INVALID_OPERATION",
      "El lote central no tiene una identidad o tamaño válidos.",
    );
  }
  for (const mutation of input.mutations) assertMutationInput(mutation);
  const entityKeys = input.mutations.map((mutation) =>
    entityKey(mutation.entityType, mutation.entityId),
  );
  const operationIds = input.mutations.map(
    (mutation) => mutation.idempotencyKey,
  );
  if (
    new Set(entityKeys).size !== entityKeys.length ||
    new Set(operationIds).size !== operationIds.length
  ) {
    throw new CentralBusinessDurableQueueError(
      "INVALID_OPERATION",
      "Un lote central no puede repetir ficha ni identidad de operación.",
    );
  }

  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  const existingBatch = state.operations.filter(
    (operation) => operation.batchId === input.batchId,
  );
  if (existingBatch.length > 0) {
    const replayed =
      existingBatch.length === input.mutations.length &&
      existingBatch.every(
        (operation, index) =>
          operation.batchIndex === index &&
          stableJson(operation.input as unknown as CentralBusinessJson) ===
            stableJson(
              input.mutations[index] as unknown as CentralBusinessJson,
            ),
      );
    if (!replayed) {
      throw new CentralBusinessDurableQueueError(
        "IDEMPOTENCY_KEY_REUSED",
        "La identidad del lote pendiente no puede reutilizarse con otro contenido.",
      );
    }
    return { queued: existingBatch, replayed: true, state };
  }
  if (
    state.operations.some(
      (operation) =>
        operationIds.includes(operation.operationId) ||
        operationIds.includes(operation.input.idempotencyKey),
    )
  ) {
    throw new CentralBusinessDurableQueueError(
      "IDEMPOTENCY_KEY_REUSED",
      "Una identidad del lote ya pertenece a otra operación pendiente.",
    );
  }
  if (state.operations.length + input.mutations.length > MAX_OPERATIONS) {
    throw new CentralBusinessDurableQueueError(
      "QUEUE_LIMIT_REACHED",
      "La cola central no tiene espacio para conservar el lote completo.",
    );
  }

  const enqueuedAt = (input.now ?? (() => new Date().toISOString()))();
  const queued = input.mutations.map(
    (mutation, batchIndex): CentralBusinessQueuedOperation => ({
      operationId: mutation.idempotencyKey,
      input: { ...mutation },
      batchId: input.batchId,
      batchIndex,
      batchSize: input.mutations.length,
      status: "pending",
      enqueuedAt,
      attemptCount: 0,
    }),
  );
  const persisted = persistState(
    { ...state, operations: [...state.operations, ...queued] },
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
  mutateBatch?: (
    mutations: CentralBusinessBrowserBatchMutationInput[],
  ) => Promise<CentralBusinessBrowserBatchMutationResult>;
  now?: () => string;
}): Promise<CentralBusinessDrainResult> {
  const storage = resolveStorage(input.storage);
  let state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  let processed = 0;

  while (state.operations.length > 0) {
    const current = state.operations[0];
    const group = current.batchId
      ? state.operations.slice(0, current.batchSize)
      : [current];
    const canRecoverMissingBatchTransport =
      Boolean(current.batchId && input.mutateBatch) &&
      group.length === current.batchSize &&
      group.every(
        (operation) =>
          operation.status === "blocked" &&
          operation.lastError?.code ===
            "CENTRAL_BUSINESS_BATCH_MUTATOR_REQUIRED",
      );
    if (canRecoverMissingBatchTransport) {
      const recovered = group.map(
        (operation): CentralBusinessQueuedOperation => ({
          ...operation,
          status: "pending",
          lastError: undefined,
          resolution: undefined,
        }),
      );
      state = persistState(
        {
          ...state,
          operations: [
            ...recovered,
            ...state.operations.slice(recovered.length),
          ],
        },
        storage,
      );
      continue;
    }
    const stopped = group.find(
      (operation) =>
        operation.status === "conflict" || operation.status === "blocked",
    )?.status;
    if (stopped === "conflict" || stopped === "blocked") {
      return {
        processed,
        remaining: state.operations.length,
        stoppedBy: stopped,
        state,
      };
    }
    const lastAttemptAt = (input.now ?? (() => new Date().toISOString()))();
    const attempted = group.map(
      (operation): CentralBusinessQueuedOperation => ({
        ...operation,
        attemptCount: operation.attemptCount + 1,
        lastAttemptAt,
      }),
    );
    state = persistState(
      {
        ...state,
        operations: [...attempted, ...state.operations.slice(attempted.length)],
      },
      storage,
    );

    const result =
      attempted.length > 1 || attempted[0].batchId
        ? input.mutateBatch
          ? await input.mutateBatch(
              attempted.map((operation) => operation.input),
            )
          : {
              ok: false as const,
              status: 503,
              code: "CENTRAL_BUSINESS_BATCH_MUTATOR_REQUIRED",
              message:
                "La cola contiene un lote atómico y necesita el transporte por lotes.",
              retryable: false,
              conflict: false,
            }
        : await input.mutate(attempted[0].input);
    if (result.ok) {
      const confirmations =
        "operations" in result
          ? result.operations
          : [
              {
                operationIndex: 0,
                entityVersion: result.entityVersion,
                deleted: result.deleted,
                contentHash: result.contentHash,
              },
            ];
      const entityVersions = { ...state.entityVersions };
      for (const [index, operation] of attempted.entries()) {
        const confirmation = confirmations[index];
        if (!confirmation || confirmation.operationIndex !== index) {
          throw new CentralBusinessDurableQueueError(
            "INVALID_OPERATION",
            "La confirmación del lote no coincide con la cola persistida.",
          );
        }
        const key = entityKey(
          operation.input.entityType,
          operation.input.entityId,
        );
        entityVersions[key] = {
          entityType: operation.input.entityType,
          entityId: operation.input.entityId,
          version: confirmation.entityVersion,
          deleted: confirmation.deleted,
          contentHash: confirmation.contentHash,
        };
      }
      state = persistState(
        {
          ...state,
          operations: state.operations.slice(attempted.length),
          entityVersions,
        },
        storage,
      );
      processed += attempted.length;
      continue;
    }

    const stoppedBy: "retryable" | "conflict" | "blocked" = result.retryable
      ? "retryable"
      : result.conflict
        ? "conflict"
        : "blocked";
    const failed = state.operations
      .slice(0, attempted.length)
      .map((operation): CentralBusinessQueuedOperation => ({
        ...operation,
        status: stoppedBy === "retryable" ? "pending" : stoppedBy,
        lastError: {
          code: result.code,
          message: result.message,
          status: result.status,
        },
      }));
    state = persistState(
      {
        ...state,
        operations: [...failed, ...state.operations.slice(attempted.length)],
      },
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
  const selected = state.operations.find(
    (operation) => operation.operationId === input.operationId,
  );
  const operations = state.operations.map((operation) =>
    operation.operationId === input.operationId ||
    (selected?.batchId && operation.batchId === selected.batchId)
      ? {
          ...operation,
          status: "pending" as const,
          lastError: undefined,
          resolution: undefined,
        }
      : operation,
  );
  return persistState({ ...state, operations }, storage);
}

export function prepareCentralBusinessEntityServerResolution(input: {
  ownerScope: string;
  entityType: CentralBusinessEntityType;
  entityId: string;
  storage?: CentralBusinessQueueStorage;
}): {
  prepared: number;
  state: CentralBusinessDurableQueueState;
} {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  const matching = state.operations.filter(
    (operation) =>
      operation.input.entityType === input.entityType &&
      operation.input.entityId === input.entityId,
  );
  if (matching.some((operation) => operation.batchId)) {
    throw new CentralBusinessDurableQueueError(
      "INVALID_OPERATION",
      "Un conflicto de lote atómico requiere revisar juntas todas sus fichas.",
    );
  }
  if (
    matching.length === 0 ||
    !matching.some((operation) => operation.status === "conflict") ||
    matching.some(
      (operation) =>
        (operation.status !== "pending" && operation.status !== "conflict") ||
        operation.lastError?.code === "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
    )
  ) {
    throw new CentralBusinessDurableQueueError(
      "INVALID_OPERATION",
      "Este conflicto no admite conservar automaticamente la version central.",
    );
  }
  const operationIds = new Set(
    matching.map((operation) => operation.operationId),
  );
  return {
    prepared: matching.length,
    state: persistState(
      {
        ...state,
        operations: state.operations.map((operation) =>
          operationIds.has(operation.operationId)
            ? { ...operation, resolution: "accept_server" as const }
            : operation,
        ),
      },
      storage,
    ),
  };
}

export function finalizeCentralBusinessEntityServerResolution(input: {
  ownerScope: string;
  entityType: CentralBusinessEntityType;
  entityId: string;
  storage?: CentralBusinessQueueStorage;
}): {
  discarded: number;
  state: CentralBusinessDurableQueueState;
} {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  const matching = state.operations.filter(
    (operation) =>
      operation.input.entityType === input.entityType &&
      operation.input.entityId === input.entityId &&
      operation.resolution === "accept_server",
  );
  if (matching.length === 0) {
    throw new CentralBusinessDurableQueueError(
      "INVALID_OPERATION",
      "No hay una resolucion central preparada para este elemento.",
    );
  }
  const known =
    state.entityVersions[entityKey(input.entityType, input.entityId)];
  const highestExpectedVersion = Math.max(
    ...matching.map((operation) => operation.input.expectedVersion),
  );
  if (!known || known.version <= highestExpectedVersion) {
    throw new CentralBusinessDurableQueueError(
      "EVENT_VERSION_CONFLICT",
      "La version central todavia no supera el cambio local pendiente.",
    );
  }
  const operationIds = new Set(
    matching.map((operation) => operation.operationId),
  );
  return {
    discarded: matching.length,
    state: persistState(
      {
        ...state,
        operations: state.operations.filter(
          (operation) => !operationIds.has(operation.operationId),
        ),
      },
      storage,
    ),
  };
}

export function discardCentralBusinessOperation(input: {
  ownerScope: string;
  operationId: string;
  storage?: CentralBusinessQueueStorage;
}): CentralBusinessDurableQueueState {
  const storage = resolveStorage(input.storage);
  const state = loadCentralBusinessDurableQueue(input.ownerScope, storage);
  const selected = state.operations.find(
    (operation) => operation.operationId === input.operationId,
  );
  return persistState(
    {
      ...state,
      operations: state.operations.filter(
        (operation) =>
          operation.operationId !== input.operationId &&
          (!selected?.batchId || operation.batchId !== selected.batchId),
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
  commitPage?: () => Promise<void>;
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
  const localConflicts = state.operations.filter(
    (operation) =>
      operation.resolution !== "accept_server" &&
      conflictingKeys.has(
        entityKey(operation.input.entityType, operation.input.entityId),
      ),
  );
  if (localConflicts.length > 0) {
    const batchIds = new Set(
      localConflicts
        .map((operation) => operation.batchId)
        .filter((batchId): batchId is string => Boolean(batchId)),
    );
    const operationIds = new Set(
      state.operations
        .filter(
          (operation) =>
            localConflicts.includes(operation) ||
            (operation.batchId && batchIds.has(operation.batchId)),
        )
        .map((operation) => operation.operationId),
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
      if (event.entityVersion < known.version) {
        skipped += 1;
        continue;
      }
      if (
        event.entityVersion === known.version &&
        event.contentHash === known.contentHash
      ) {
        try {
          await input.applyEvent(event);
        } catch {
          return {
            ok: false,
            code: "EVENT_APPLY_FAILED",
            message:
              "No se verifico toda la pagina. El cursor se conserva para reintentar.",
            state,
          };
        }
        skipped += 1;
        continue;
      }
      return {
        ok: false,
        code: "EVENT_VERSION_CONFLICT",
        message:
          "Un evento antiguo no coincide con la version local confirmada.",
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
  try {
    await input.commitPage?.();
  } catch {
    return {
      ok: false,
      code: "EVENT_APPLY_FAILED",
      message:
        "No se verifico toda la pagina. El cursor se conserva para reintentar.",
      state,
    };
  }
  nextState.lastAppliedEventSequence = input.nextSequence;
  return {
    ok: true,
    applied,
    skipped,
    state: persistState(nextState, storage),
  };
}
