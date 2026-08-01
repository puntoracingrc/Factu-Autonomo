"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { AppData, Supplier } from "@/lib/types";

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

export const CENTRAL_SUPPLIER_CREATE_CANARY =
  "CENTRAL_SUPPLIER_CREATE_CANARY_V1";

type SupplierDraft = Omit<Supplier, "id" | "createdAt">;

export type CentralSupplierCreateDelivery =
  "local" | "central_confirmed" | "central_pending" | "central_review";

export type CentralSupplierCreateResult =
  | {
      ok: true;
      supplier: Supplier;
      delivery: CentralSupplierCreateDelivery;
    }
  | { ok: false; error: string };

export interface CentralSupplierCreateCanaryEnvironment {
  enabled?: string;
  userIds?: string;
}

export interface CentralSupplierCreateCanaryDependencies {
  getCurrentData(): AppData;
  addSupplierFallback(draft: SupplierDraft): Supplier;
  addSupplierDurably(
    draft: SupplierDraft,
    identity: { id: string; now: string },
    expected: AppData,
  ): AppDataDurabilityResult<Supplier>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<typeof mutateCentralBusinessFromBrowser>[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  environment?: CentralSupplierCreateCanaryEnvironment;
}

const publicEnvironment: CentralSupplierCreateCanaryEnvironment = {
  enabled:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_SUPPLIER_CREATE_CANARY_ENABLED,
  userIds:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_SUPPLIER_CREATE_CANARY_USER_IDS,
};

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function isCentralSupplierCreateCanaryEnabledForUser(
  userId: string | null | undefined,
  environment: CentralSupplierCreateCanaryEnvironment = publicEnvironment,
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

function createSupplier(
  draft: SupplierDraft,
  identity: { id: string; now: string },
): Supplier {
  return { ...draft, id: identity.id, createdAt: identity.now };
}

function jsonSupplier(supplier: Supplier): CentralBusinessJson {
  return JSON.parse(JSON.stringify(supplier)) as CentralBusinessJson;
}

function durabilityError(
  result: Exclude<AppDataDurabilityResult<Supplier>, { status: "applied" }>,
): string {
  if (result.status === "indeterminate") {
    return "El proveedor quedó pendiente de revisión porque no se pudo confirmar el almacenamiento local.";
  }
  if (result.reason === "stale_precondition") {
    return "Los proveedores cambiaron mientras se guardaba. Revisa el listado y vuelve a intentarlo.";
  }
  return "No se pudo guardar y verificar el proveedor en este dispositivo.";
}

export async function createSupplierWithCentralCanary(input: {
  userId: string | null | undefined;
  draft: SupplierDraft;
  dependencies: CentralSupplierCreateCanaryDependencies;
}): Promise<CentralSupplierCreateResult> {
  const { dependencies } = input;
  if (
    !isCentralSupplierCreateCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    )
  ) {
    try {
      return {
        ok: true,
        supplier: dependencies.addSupplierFallback(input.draft),
        delivery: "local",
      };
    } catch {
      return { ok: false, error: "No se pudo guardar el proveedor." };
    }
  }

  const ownerScope = input.userId as string;
  const eventSync = await dependencies.syncEventsBeforeWrite?.();
  if (eventSync && !eventSync.ok && !eventSync.retryable) {
    return {
      ok: false,
      error:
        "Hay cambios centrales que este dispositivo no pudo aplicar. Ve a Cuenta > Migración central y usa la copia del servidor en este dispositivo antes de guardar el proveedor.",
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
        "El servidor central todavía no está preparado para guardar proveedores en esta cuenta.",
    };
  }

  try {
    return await withCentralBusinessQueueLock(ownerScope, async () => {
      const baseline = dependencies.getCurrentData();
      const id = (dependencies.createId ?? (() => crypto.randomUUID()))();
      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const prepared = createSupplier(input.draft, { id, now });
      const operationId = `CENTRAL_SUPPLIER_CREATE:${id}`;

      enqueueCentralBusinessOperation({
        ownerScope,
        operationId,
        mutation: {
          idempotencyKey: operationId,
          operationKind: "upsert",
          entityType: "supplier",
          entityId: id,
          expectedVersion: 0,
          payload: jsonSupplier(prepared),
        },
        storage: dependencies.storage,
        now: () => now,
      });

      const local = dependencies.addSupplierDurably(
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
          supplier: local.value,
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
          supplier: local.value,
          delivery: "central_confirmed",
        };
      }
      return {
        ok: true,
        supplier: local.value,
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
        "No se pudo preparar y verificar la cola segura. No se guardó el proveedor.",
    };
  }
}
