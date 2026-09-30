"use client";

import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import type { AppData } from "@/lib/types";

import {
  CentralBusinessDurableQueueError,
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

function hasSafeBlockedPreflight(
  syncResult: CentralBusinessEventsAppDataSyncResult | undefined,
): boolean {
  return (
    syncResult?.ok === false &&
    !syncResult.retryable &&
    (syncResult.code === "CENTRAL_BUSINESS_LOCAL_ENTITY_CONFLICT" ||
      syncResult.code === "LOCAL_OPERATION_CONFLICT" ||
      syncResult.code === "CENTRAL_BUSINESS_PENDING_REVIEW")
  );
}

function hasLocalBaselineAmbiguity(
  syncResult: CentralBusinessEventsAppDataSyncResult | undefined,
): boolean {
  return (
    syncResult?.ok === false &&
    !syncResult.retryable &&
    syncResult.code === "CENTRAL_BUSINESS_APP_DATA_BASELINE_AMBIGUOUS"
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
  allowVersionedUpsertAfterBlockedPreflight?: boolean;
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
    input.createMissingUpsertAfterFullSync === true &&
    input.operationKind === "upsert" &&
    !knownBeforeStatus &&
    hasSafeBlockedPreflight(eventSync);
  const createMissingUpsert =
    createMissingUpsertAfterFullSync ||
    createMissingUpsertAfterBlockedPreflight;
  const versionedUpsertAfterBlockedPreflight =
    input.allowVersionedUpsertAfterBlockedPreflight === true &&
    input.operationKind === "upsert" &&
    Boolean(knownBeforeStatus) &&
    (hasSafeBlockedPreflight(eventSync) || hasLocalBaselineAmbiguity(eventSync));
  const bypassBlockedPreflight =
    createMissingUpsertAfterBlockedPreflight ||
    versionedUpsertAfterBlockedPreflight;
  if (
    eventSync &&
    !eventSync.ok &&
    !eventSync.retryable &&
    !createMissingUpsert &&
    !versionedUpsertAfterBlockedPreflight
  ) {
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
  if (!status.ok || !status.summary.writesPossible) {
    return {
      ok: false,
      error:
        "Se necesita conexión con el servidor central para modificar esta ficha. No se ha aplicado ningún cambio en este dispositivo.",
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
        position: bypassBlockedPreflight ? "front" : "back",
        storage: dependencies.storage,
        now: () => now,
      });

      const drained = await drainCentralBusinessDurableQueue({
        ownerScope,
        storage: dependencies.storage,
        mutate: dependencies.mutate ?? mutateCentralBusinessFromBrowser,
        now: dependencies.now,
      });
      const ownOperation = drained.state.operations.find(
        (operation) => operation.operationId === operationId,
      );
      if (ownOperation) {
        if (ownOperation.status !== "pending") {
          discardCentralBusinessOperation({
            ownerScope,
            operationId,
            storage: dependencies.storage,
          });
        }
        return {
          ok: false,
          error:
            ownOperation.status === "pending" &&
            drained.stoppedBy === "retryable"
              ? "No se pudo confirmar la respuesta del servidor central. El cambio no se ha aplicado en este dispositivo y se conservará únicamente su identidad de recuperación para comprobarlo sin duplicarlo."
              : "El servidor central rechazó el cambio porque la ficha ya tiene otra versión. No se ha sobrescrito ni aplicado nada localmente.",
        };
      }

      const local = dependencies.commitLocal(
        baseline,
        prepared.transition,
        now,
      );
      if (local.status !== "applied") {
        return {
          ok: false,
          error:
            "El servidor confirmó el cambio, pero la caché local no pudo actualizarse. Recarga para recibir la versión central; el cambio no se ha perdido.",
        };
      }
      return {
        ok: true,
        value: local.value,
        delivery: "central_confirmed",
      };
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof CentralBusinessDurableQueueError
          ? error.message
          : "No se pudo preparar y verificar la cola segura. No se aplicó el cambio.",
    };
  }
}
