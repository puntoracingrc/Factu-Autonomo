"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import {
  normalizeProductCatalogItem,
  purchaseProductKey,
} from "@/lib/purchase-products";
import type { AppData, Product } from "@/lib/types";

import {
  discardCentralBusinessOperation,
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
  type CentralBusinessQueueStorage,
  withCentralBusinessQueueLock,
} from "./durable-queue";
import type { CentralBusinessJson } from "./mutation-command";
import {
  mutateCentralBusinessFromBrowser,
  type CentralBusinessBrowserMutationResult,
} from "./mutation-client";
import {
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityStatusResult,
} from "./status-client";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";

export const CENTRAL_PRODUCT_CREATE_CANARY = "CENTRAL_PRODUCT_CREATE_CANARY_V1";

type ProductDraft = Omit<Product, "id" | "createdAt" | "updatedAt">;

export type CentralProductCreateDelivery =
  "local" | "central_confirmed" | "central_pending" | "central_review";

export type CentralProductCreateResult =
  | {
      ok: true;
      product: Product;
      delivery: CentralProductCreateDelivery;
    }
  | { ok: false; error: string };

export interface CentralProductCreateCanaryEnvironment {
  enabled?: string;
  userIds?: string;
}

export interface CentralProductCreateCanaryDependencies {
  getCurrentData(): AppData;
  addProductFallback(draft: ProductDraft): Product;
  addProductDurably(
    draft: ProductDraft,
    identity: { id: string; now: string },
    expected: AppData,
  ): AppDataDurabilityResult<Product>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<typeof mutateCentralBusinessFromBrowser>[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  environment?: CentralProductCreateCanaryEnvironment;
}

const publicEnvironment: CentralProductCreateCanaryEnvironment = {
  enabled:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_PRODUCT_CREATE_CANARY_ENABLED,
  userIds:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_PRODUCT_CREATE_CANARY_USER_IDS,
};

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function isCentralProductCreateCanaryEnabledForUser(
  userId: string | null | undefined,
  environment: CentralProductCreateCanaryEnvironment = publicEnvironment,
): boolean {
  return (
    environment.enabled?.trim().toLowerCase() === "true" &&
    typeof userId === "string" &&
    values(environment.userIds).has(userId)
  );
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

function createProduct(
  draft: ProductDraft,
  identity: { id: string; now: string },
): Product {
  return normalizeProductCatalogItem({
    ...draft,
    id: identity.id,
    key: draft.key || purchaseProductKey(draft.name),
    createdAt: identity.now,
    updatedAt: identity.now,
  });
}

function jsonProduct(product: Product): CentralBusinessJson {
  return JSON.parse(JSON.stringify(product)) as CentralBusinessJson;
}

function durabilityError(
  result: Exclude<AppDataDurabilityResult<Product>, { status: "applied" }>,
): string {
  if (result.status === "indeterminate") {
    return "El producto quedó pendiente de revisión porque no se pudo confirmar el almacenamiento local.";
  }
  if (result.reason === "stale_precondition") {
    return "Los productos cambiaron mientras se guardaba. Revisa el listado y vuelve a intentarlo.";
  }
  return "No se pudo guardar y verificar el producto en este dispositivo.";
}

export async function createProductWithCentralCanary(input: {
  userId: string | null | undefined;
  draft: ProductDraft;
  dependencies: CentralProductCreateCanaryDependencies;
}): Promise<CentralProductCreateResult> {
  const { dependencies } = input;
  if (
    !isCentralProductCreateCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    )
  ) {
    try {
      return {
        ok: true,
        product: dependencies.addProductFallback(input.draft),
        delivery: "local",
      };
    } catch {
      return { ok: false, error: "No se pudo guardar el producto." };
    }
  }

  const ownerScope = input.userId as string;
  const eventSync = await dependencies.syncEventsBeforeWrite?.();
  if (eventSync && !eventSync.ok && !eventSync.retryable) {
    return {
      ok: false,
      error:
        "Hay cambios centrales que este dispositivo no pudo aplicar. Revisa la sincronización antes de guardar el producto.",
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
        "El servidor central todavía no está preparado para guardar productos en esta cuenta.",
    };
  }

  try {
    return await withCentralBusinessQueueLock(ownerScope, async () => {
      const baseline = dependencies.getCurrentData();
      const id = (dependencies.createId ?? (() => crypto.randomUUID()))();
      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const prepared = createProduct(input.draft, { id, now });
      const operationId = `CENTRAL_PRODUCT_CREATE:${id}`;

      enqueueCentralBusinessOperation({
        ownerScope,
        operationId,
        mutation: {
          idempotencyKey: operationId,
          operationKind: "upsert",
          entityType: "product",
          entityId: id,
          expectedVersion: 0,
          payload: jsonProduct(prepared),
        },
        storage: dependencies.storage,
        now: () => now,
      });

      const local = dependencies.addProductDurably(
        input.draft,
        { id, now },
        baseline,
      );
      if (local.status !== "applied") {
        if (local.status === "blocked") {
          discardCentralBusinessOperation({
            ownerScope,
            operationId,
            storage: dependencies.storage,
          });
        }
        return { ok: false, error: durabilityError(local) };
      }

      if (!canAttemptServer) {
        return {
          ok: true,
          product: local.value,
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
          product: local.value,
          delivery: "central_confirmed",
        };
      }
      return {
        ok: true,
        product: local.value,
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
        "No se pudo preparar y verificar la cola segura. No se guardó el producto.",
    };
  }
}
