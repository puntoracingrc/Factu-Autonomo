"use client";

import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import type { AppData } from "@/lib/types";

import {
  discardCentralBusinessOperation,
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
  withCentralBusinessQueueLock,
} from "./durable-queue";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import {
  mutateCentralBusinessFromBrowser,
  type CentralBusinessBrowserMutationResult,
} from "./mutation-client";
import type {
  CentralBusinessEntityType,
  CentralBusinessJson,
  CentralBusinessOperationKind,
} from "./mutation-command";
import {
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityStatusResult,
} from "./status-client";

export const CENTRAL_BUSINESS_ENTITY_MUTATION_CANARY =
  "CENTRAL_BUSINESS_ENTITY_MUTATION_CANARY_V1";

export type CentralBusinessEntityMutationDelivery =
  "local" | "central_confirmed" | "central_pending" | "central_review";

export type CentralBusinessEntityMutationResult<T> =
  | {
      ok: true;
      value: T;
      delivery: CentralBusinessEntityMutationDelivery;
    }
  | { ok: false; error: string };

export type CentralBusinessPreparedLocalMutation<T> =
  | {
      ok: true;
      payload: CentralBusinessJson | null;
      transition: AppDataTransition<T>;
    }
  | { ok: false; error: string };

export interface CentralBusinessEntityMutationDependencies<T> {
  getCurrentData(): AppData;
  fallback(): CentralBusinessEntityMutationResult<T>;
  prepareLocal(input: {
    data: AppData;
    now: string;
  }): CentralBusinessPreparedLocalMutation<T>;
  commitLocal(
    expected: AppData,
    transition: AppDataTransition<T>,
    now: string,
  ): AppDataDurabilityResult<T>;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<typeof mutateCentralBusinessFromBrowser>[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
}

function transientStatusFailure(
  result: Extract<CentralBusinessAuthorityStatusResult, { ok: false }>,
): boolean {
  return result.status === 0 || result.status === 429 || result.status >= 500;
}

async function statusWithTimeout(
  fetchStatus: () => Promise<CentralBusinessAuthorityStatusResult>,
  timeoutMs: number,
): Promise<CentralBusinessAuthorityStatusResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetchStatus(),
      new Promise<CentralBusinessAuthorityStatusResult>((resolve) => {
        timeout = setTimeout(
          () =>
            resolve({
              ok: false,
              status: 0,
              code: "CENTRAL_BUSINESS_STATUS_TIMEOUT",
              message: "La comprobacion central tardo demasiado.",
            }),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function entityKey(entityType: CentralBusinessEntityType, entityId: string) {
  return `${entityType}:${entityId}`;
}

function durableFailure<T>(
  result: Exclude<AppDataDurabilityResult<T>, { status: "applied" }>,
): string {
  if (result.status === "indeterminate") {
    return "El cambio quedó pendiente de revisión porque no se pudo confirmar el almacenamiento local.";
  }
  if (result.reason === "stale_precondition") {
    return "Otro dispositivo cambió los datos mientras guardabas. No se ha sobrescrito nada. Revisa la información actual y vuelve a guardar para confirmar tu cambio.";
  }
  return "No se pudo guardar y verificar el cambio en este dispositivo.";
}

function createMissingUpsertDespiteBlockedPreflight(
  input: {
    enabled: boolean | undefined;
    operationKind: CentralBusinessOperationKind;
    knownVersion: unknown;
    syncResult: CentralBusinessEventsAppDataSyncResult | undefined;
  },
): boolean {
  return (
    input.enabled === true &&
    input.operationKind === "upsert" &&
    !input.knownVersion &&
    input.syncResult?.ok === false &&
    !input.syncResult.retryable &&
    (input.syncResult.code === "CENTRAL_BUSINESS_LOCAL_ENTITY_CONFLICT" ||
      input.syncResult.code === "LOCAL_OPERATION_CONFLICT" ||
      input.syncResult.code === "CENTRAL_BUSINESS_PENDING_REVIEW")
  );
}

export async function mutateCentralBusinessEntityWithCanary<T>(input: {
  enabled: boolean;
  userId: string | null | undefined;
  entityType: CentralBusinessEntityType;
  entityId: string;
  operationKind: CentralBusinessOperationKind;
  operationIdPrefix: string;
  entityLabel: string;
  createMissingUpsertAfterFullSync?: boolean;
  dependencies: CentralBusinessEntityMutationDependencies<T>;
}): Promise<CentralBusinessEntityMutationResult<T>> {
  const { dependencies } = input;
  if (!input.enabled || !input.userId) return dependencies.fallback();

  const ownerScope = input.userId;
  const eventSync = await dependencies.syncEventsBeforeWrite?.();
  let knownBeforeStatus;
  try {
    knownBeforeStatus = loadCentralBusinessDurableQueue(
      ownerScope,
      dependencies.storage,
    ).entityVersions[entityKey(input.entityType, input.entityId)];
  } catch {
    return {
      ok: false,
      error:
        "No se pudo verificar la versión central guardada en este dispositivo.",
    };
  }

  const createMissingUpsertAfterFullSync =
    input.createMissingUpsertAfterFullSync === true &&
    input.operationKind === "upsert" &&
    eventSync?.ok === true &&
    eventSync.hasMore === false;
  const createMissingUpsertAfterBlockedPreflight =
    createMissingUpsertDespiteBlockedPreflight({
      enabled: input.createMissingUpsertAfterFullSync,
      operationKind: input.operationKind,
      knownVersion: knownBeforeStatus,
      syncResult: eventSync,
    });
  const createMissingUpsert =
    createMissingUpsertAfterFullSync ||
    createMissingUpsertAfterBlockedPreflight;
  if (eventSync && !eventSync.ok && !eventSync.retryable && !createMissingUpsert) {
    return {
      ok: false,
      error: `Hay cambios centrales que este dispositivo no pudo aplicar. Ve a Cuenta > Migración central y usa la copia del servidor en este dispositivo antes de modificar ${input.entityLabel}.`,
    };
  }
  if (!knownBeforeStatus) {
    if (!createMissingUpsert) {
      if (
        input.createMissingUpsertAfterFullSync === true &&
        input.operationKind === "upsert" &&
        eventSync?.ok === true &&
        eventSync.hasMore
      ) {
        return {
          ok: false,
          error:
            "Quedan cambios centrales por recibir. Espera a que termine la sincronización y vuelve a guardar esta ficha.",
        };
      }
      if (!eventSync || eventSync.ok) return dependencies.fallback();
    }
  }
  if (!knownBeforeStatus && !createMissingUpsert) {
    return {
      ok: false,
      error:
        "No se pudo confirmar si esta ficha ya pertenece al servidor central. Vuelve a intentarlo con conexión.",
    };
  }
  if (knownBeforeStatus?.deleted) {
    return {
      ok: false,
      error: `La ficha de ${input.entityLabel} ya fue eliminada en el servidor central.`,
    };
  }

  const status = await statusWithTimeout(
    dependencies.fetchStatus ?? fetchCentralBusinessAuthorityStatusFromBrowser,
    dependencies.statusTimeoutMs ?? 3_000,
  );
  const canAttemptServer = status.ok && status.summary.writesPossible;
  if (
    (!status.ok && !transientStatusFailure(status)) ||
    (status.ok && !status.summary.writesPossible)
  ) {
    return {
      ok: false,
      error:
        "El servidor central todavía no está preparado para modificar esta ficha.",
    };
  }

  try {
    return await withCentralBusinessQueueLock(ownerScope, async () => {
      const queue = loadCentralBusinessDurableQueue(
        ownerScope,
        dependencies.storage,
      );
      const key = entityKey(input.entityType, input.entityId);
      const knownVersion = queue.entityVersions[key];
      if ((!knownVersion && !createMissingUpsert) || knownVersion?.deleted) {
        return {
          ok: false,
          error:
            "La versión central de esta ficha cambió antes de preparar la operación.",
        };
      }
      if (
        knownVersion &&
        knownBeforeStatus &&
        (knownVersion.version !== knownBeforeStatus.version ||
          knownVersion.contentHash !== knownBeforeStatus.contentHash)
      ) {
        return {
          ok: false,
          error:
            "La ficha recibió una versión nueva mientras se preparaba el cambio. Revisa los datos y vuelve a intentarlo.",
        };
      }
      if (
        queue.operations.some(
          (operation) =>
            operation.input.entityType === input.entityType &&
            operation.input.entityId === input.entityId,
        )
      ) {
        return {
          ok: false,
          error:
            "Esta ficha ya tiene un cambio pendiente de confirmación. Sincroniza antes de volver a modificarla.",
        };
      }

      const baseline = dependencies.getCurrentData();
      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const prepared = dependencies.prepareLocal({ data: baseline, now });
      if (!prepared.ok) return prepared;

      const operationId = `${input.operationIdPrefix}:${(
        dependencies.createId ?? (() => crypto.randomUUID())
      )()}`;
      enqueueCentralBusinessOperation({
        ownerScope,
        operationId,
        mutation: {
          idempotencyKey: operationId,
          operationKind: input.operationKind,
          entityType: input.entityType,
          entityId: input.entityId,
          expectedVersion: knownVersion?.version ?? 0,
          payload: prepared.payload,
        },
        position: createMissingUpsertAfterBlockedPreflight
          ? "front"
          : "back",
        storage: dependencies.storage,
        now: () => now,
      });

      const local = dependencies.commitLocal(
        baseline,
        prepared.transition,
        now,
      );
      if (local.status !== "applied") {
        if (local.status === "blocked") {
          discardCentralBusinessOperation({
            ownerScope,
            operationId,
            storage: dependencies.storage,
          });
        }
        return { ok: false, error: durableFailure(local) };
      }

      if (!canAttemptServer) {
        return {
          ok: true,
          value: local.value,
          delivery: "central_pending",
        };
      }

      const drained = await drainCentralBusinessDurableQueue({
        ownerScope,
        storage: dependencies.storage,
        mutate: dependencies.mutate ?? mutateCentralBusinessFromBrowser,
        now: dependencies.now,
      });
      const ownOperation = drained.state.operations.find(
        (operation) => operation.operationId === operationId,
      );
      if (!ownOperation) {
        return {
          ok: true,
          value: local.value,
          delivery: "central_confirmed",
        };
      }
      return {
        ok: true,
        value: local.value,
        delivery:
          ownOperation.status === "pending" && drained.stoppedBy === "retryable"
            ? "central_pending"
            : "central_review",
      };
    });
  } catch {
    return {
      ok: false,
      error:
        "No se pudo preparar y verificar la cola segura. No se aplicó el cambio.",
    };
  }
}
