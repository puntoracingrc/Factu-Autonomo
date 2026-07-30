"use client";

import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import {
  applyProductCatalogStructureOperation,
  type ProductCatalogStructureOperation,
  type ProductCatalogStructureResult,
} from "@/lib/product-catalog-structure";
import type { AppData, BusinessProfile, Product } from "@/lib/types";

import { CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS } from "./batch-contract";
import {
  mutateCentralBusinessBatchFromBrowser,
  type CentralBusinessBrowserBatchMutationInput,
  type CentralBusinessBrowserBatchMutationResult,
} from "./batch-mutation-client";
import {
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessBatch,
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
  withCentralBusinessQueueLock,
} from "./durable-queue";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import {
  mutateCentralBusinessFromBrowser,
  type CentralBusinessBrowserMutationResult,
} from "./mutation-client";
import type { CentralBusinessJson } from "./mutation-command";
import {
  isCentralProductCreateCanaryEnabledForUser,
  type CentralProductCreateCanaryEnvironment,
} from "./product-create-canary";
import {
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityStatusResult,
} from "./status-client";

export const CENTRAL_PRODUCT_CATALOG_BATCH_CANARY =
  "CENTRAL_PRODUCT_CATALOG_BATCH_CANARY_V1";

type ProductCatalogSuccess = Extract<
  ProductCatalogStructureResult,
  { ok: true }
>;

export type CentralProductCatalogBatchDelivery =
  "local" | "central_confirmed" | "central_pending" | "central_review";

export type CentralProductCatalogBatchResult =
  | {
      ok: true;
      result: ProductCatalogSuccess;
      delivery: CentralProductCatalogBatchDelivery;
    }
  | { ok: false; error: string };

export interface CentralProductCatalogBatchDependencies {
  getCurrentData(): AppData;
  fallback(
    operation: ProductCatalogStructureOperation,
  ): ProductCatalogStructureResult;
  commitLocal(
    expected: AppData,
    transition: AppDataTransition<ProductCatalogSuccess>,
  ): AppDataDurabilityResult<ProductCatalogSuccess>;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutateBatch?: (
    input: CentralBusinessBrowserBatchMutationInput[],
  ) => Promise<CentralBusinessBrowserBatchMutationResult>;
  mutate?: (
    input: Parameters<typeof mutateCentralBusinessFromBrowser>[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  environment?: CentralProductCreateCanaryEnvironment;
}

interface PreparedMutation {
  entityType: "product" | "profile";
  entityId: string;
  operationKind: "upsert" | "delete";
  existedLocally: boolean;
  payload: CentralBusinessJson | null;
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

function jsonPayload(value: Product | BusinessProfile): CentralBusinessJson {
  return JSON.parse(JSON.stringify(value)) as CentralBusinessJson;
}

function samePayload(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function prepareMutations(
  baseline: AppData,
  result: ProductCatalogSuccess,
): PreparedMutation[] {
  const before = new Map(
    baseline.products.map((product) => [product.id, product] as const),
  );
  const after = new Map(
    result.data.products.map((product) => [product.id, product] as const),
  );
  const mutations: PreparedMutation[] = [];

  for (const [entityId, product] of after) {
    const previous = before.get(entityId);
    if (previous && samePayload(previous, product)) continue;
    mutations.push({
      entityType: "product",
      entityId,
      operationKind: "upsert",
      existedLocally: Boolean(previous),
      payload: jsonPayload(product),
    });
  }
  for (const entityId of before.keys()) {
    if (after.has(entityId)) continue;
    mutations.push({
      entityType: "product",
      entityId,
      operationKind: "delete",
      existedLocally: true,
      payload: null,
    });
  }
  if (!samePayload(baseline.profile, result.data.profile)) {
    mutations.push({
      entityType: "profile",
      entityId: "profile",
      operationKind: "upsert",
      existedLocally: true,
      payload: jsonPayload(result.data.profile),
    });
  }
  return mutations;
}

function durabilityError(
  result: Exclude<
    AppDataDurabilityResult<ProductCatalogSuccess>,
    { status: "applied" }
  >,
): string {
  if (result.status === "indeterminate") {
    return "La organización quedó pendiente de revisión porque no se pudo confirmar el almacenamiento local.";
  }
  if (result.reason === "stale_precondition") {
    return "El catálogo cambió mientras se guardaba. Actualiza la lista y vuelve a intentarlo.";
  }
  return "No se pudo guardar y verificar la organización del catálogo.";
}

function entityKey(
  mutation: Pick<PreparedMutation, "entityType" | "entityId">,
) {
  return `${mutation.entityType}:${mutation.entityId}`;
}

function unconfirmedBatchError(input: {
  stoppedBy: "retryable" | "conflict" | "blocked";
  operations: ReturnType<typeof loadCentralBusinessDurableQueue>["operations"];
}): string {
  const serverMessage = input.operations.find(
    (operation) => operation.lastError,
  )?.lastError?.message;
  if (input.stoppedBy === "retryable") {
    return "No se pudo confirmar el lote con el servidor central. El cambio queda pendiente y no se ha aplicado todavía en este dispositivo.";
  }
  return `${
    serverMessage ??
    (input.stoppedBy === "conflict"
      ? "El servidor central detectó que una ficha cambió en otro dispositivo."
      : "El servidor central rechazó el lote.")
  } No se ha aplicado ningún cambio local.`;
}

export async function applyProductCatalogBatchWithCentralCanary(input: {
  userId: string | null | undefined;
  operation: ProductCatalogStructureOperation;
  dependencies: CentralProductCatalogBatchDependencies;
}): Promise<CentralProductCatalogBatchResult> {
  const { dependencies } = input;
  if (
    !isCentralProductCreateCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    )
  ) {
    const result = dependencies.fallback(input.operation);
    return result.ok
      ? { ok: true, result, delivery: "local" }
      : { ok: false, error: result.error };
  }

  const ownerScope = input.userId as string;
  const eventSync = await dependencies.syncEventsBeforeWrite?.();
  if (eventSync && !eventSync.ok && !eventSync.retryable) {
    return {
      ok: false,
      error:
        "Hay cambios centrales que este dispositivo no pudo aplicar. Revisa la sincronización antes de organizar el catálogo.",
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
        "El servidor central todavía no está preparado para organizar este catálogo.",
    };
  }

  try {
    return await withCentralBusinessQueueLock(ownerScope, async () => {
      const baseline = dependencies.getCurrentData();
      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const result = applyProductCatalogStructureOperation(
        baseline,
        input.operation,
        {
          now,
          createId:
            dependencies.createId ?? (() => globalThis.crypto.randomUUID()),
        },
      );
      if (!result.ok) return { ok: false, error: result.error };

      const prepared = prepareMutations(baseline, result);
      if (
        prepared.length < 1 ||
        prepared.length > CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS
      ) {
        return {
          ok: false,
          error:
            prepared.length < 1
              ? "La organización no produjo ningún cambio que guardar."
              : `La operación afecta a más de ${CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS} fichas. Divide la selección en varios cambios.`,
        };
      }

      const queue = loadCentralBusinessDurableQueue(
        ownerScope,
        dependencies.storage,
      );
      const preparedKeys = new Set(prepared.map(entityKey));
      if (
        queue.operations.some((operation) =>
          preparedKeys.has(
            `${operation.input.entityType}:${operation.input.entityId}`,
          ),
        )
      ) {
        return {
          ok: false,
          error:
            "Una ficha afectada ya tiene un cambio pendiente. Sincroniza antes de volver a organizar el catálogo.",
        };
      }

      const operationId = (
        dependencies.createId ?? (() => globalThis.crypto.randomUUID())
      )().replace(/[^A-Za-z0-9_-]/gu, "_");
      const batchId = `CENTRAL_PRODUCT_CATALOG:${operationId}`;
      const mutations = prepared.map((mutation, index) => {
        const known = queue.entityVersions[entityKey(mutation)];
        if (mutation.existedLocally && (!known || known.deleted)) {
          throw new Error("CENTRAL_PRODUCT_CATALOG_VERSION_UNKNOWN");
        }
        if (!mutation.existedLocally && known && !known.deleted) {
          throw new Error("CENTRAL_PRODUCT_CATALOG_ENTITY_EXISTS");
        }
        return {
          idempotencyKey: `${batchId}:${index}`,
          operationKind: mutation.operationKind,
          entityType: mutation.entityType,
          entityId: mutation.entityId,
          expectedVersion: mutation.existedLocally ? known!.version : 0,
          payload: mutation.payload,
        } satisfies CentralBusinessBrowserBatchMutationInput;
      });

      enqueueCentralBusinessBatch({
        ownerScope,
        batchId,
        mutations,
        storage: dependencies.storage,
        now: () => now,
      });

      if (!canAttemptServer) {
        return {
          ok: false,
          error:
            "No se pudo confirmar el lote con el servidor central. El cambio queda pendiente y no se ha aplicado todavía en este dispositivo.",
        };
      }

      let drained;
      try {
        drained = await drainCentralBusinessDurableQueue({
          ownerScope,
          storage: dependencies.storage,
          mutate: dependencies.mutate ?? mutateCentralBusinessFromBrowser,
          mutateBatch:
            dependencies.mutateBatch ?? mutateCentralBusinessBatchFromBrowser,
          now: dependencies.now,
        });
      } catch {
        return {
          ok: false,
          error:
            "No se pudo verificar la respuesta del servidor central. El cambio no se ha aplicado localmente.",
        };
      }
      const ownOperations = drained.state.operations.filter(
        (operation) => operation.batchId === batchId,
      );
      if (ownOperations.length > 0) {
        return {
          ok: false,
          error: unconfirmedBatchError({
            stoppedBy:
              drained.stoppedBy === "empty" ? "blocked" : drained.stoppedBy,
            operations: ownOperations,
          }),
        };
      }

      const local = dependencies.commitLocal(baseline, {
        data: result.data,
        value: result,
      });
      if (local.status !== "applied") {
        return {
          ok: false,
          error:
            local.status === "blocked"
              ? "El servidor confirmó el lote, pero los datos locales cambiaron durante la operación. Actualiza para recibir la versión central."
              : durabilityError(local),
        };
      }

      return {
        ok: true,
        result: local.value,
        delivery: "central_confirmed",
      };
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CENTRAL_PRODUCT_CATALOG_VERSION_UNKNOWN") {
      return {
        ok: false,
        error:
          "No se pudo confirmar la versión central de una ficha afectada. Sincroniza y vuelve a intentarlo.",
      };
    }
    if (code === "CENTRAL_PRODUCT_CATALOG_ENTITY_EXISTS") {
      return {
        ok: false,
        error:
          "El servidor central ya conoce una ficha que este cambio intentaba crear. Revisa la sincronización.",
      };
    }
    return {
      ok: false,
      error:
        "No se pudo preparar y verificar la organización atómica. No se aplicó el cambio.",
    };
  }
}
