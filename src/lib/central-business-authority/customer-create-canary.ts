"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { createCustomerInCollection } from "@/lib/customers";
import type { AppData, Customer } from "@/lib/types";

import {
  discardCentralBusinessOperation,
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
  type CentralBusinessQueueStorage,
  withCentralBusinessQueueLock,
} from "./durable-queue";
import {
  mutateCentralBusinessFromBrowser,
  type CentralBusinessBrowserMutationResult,
} from "./mutation-client";
import {
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityStatusResult,
} from "./status-client";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";

export const CENTRAL_CUSTOMER_CREATE_CANARY =
  "CENTRAL_CUSTOMER_CREATE_CANARY_V1";

type CustomerDraft = Omit<Customer, "id" | "createdAt" | "updatedAt">;

export type CentralCustomerCreateDelivery =
  | "local"
  | "central_confirmed"
  | "central_pending"
  | "central_review";

export type CentralCustomerCreateResult =
  | {
      ok: true;
      customer: Customer;
      delivery: CentralCustomerCreateDelivery;
    }
  | { ok: false; error: string };

export interface CentralCustomerCreateCanaryEnvironment {
  enabled?: string;
  userIds?: string;
}

export interface CentralCustomerCreateCanaryDependencies {
  getCurrentData(): AppData;
  addCustomerFallback(draft: CustomerDraft):
    | { ok: true; customer: Customer }
    | { ok: false; error: string };
  addCustomerDurably(
    draft: CustomerDraft,
    identity: { id: string; now: string },
    expected: AppData,
  ): AppDataDurabilityResult<Customer>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<typeof mutateCentralBusinessFromBrowser>[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  environment?: CentralCustomerCreateCanaryEnvironment;
}

const publicEnvironment: CentralCustomerCreateCanaryEnvironment = {
  enabled:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_CUSTOMER_CREATE_CANARY_ENABLED,
  userIds:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_CUSTOMER_CREATE_CANARY_USER_IDS,
};

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function isCentralCustomerCreateCanaryEnabledForUser(
  userId: string | null | undefined,
  environment: CentralCustomerCreateCanaryEnvironment = publicEnvironment,
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

function jsonCustomer(customer: Customer) {
  return JSON.parse(JSON.stringify(customer)) as Record<
    string,
    string | string[]
  >;
}

function durabilityError(
  result: Exclude<AppDataDurabilityResult<Customer>, { status: "applied" }>,
): string {
  if (result.status === "indeterminate") {
    return "El cliente quedó pendiente de revisión porque no se pudo confirmar el almacenamiento local.";
  }
  if (result.reason === "stale_precondition") {
    return "Los clientes cambiaron mientras se guardaba. Revisa el listado y vuelve a intentarlo.";
  }
  return "No se pudo guardar y verificar el cliente en este dispositivo.";
}

export async function createCustomerWithCentralCanary(input: {
  userId: string | null | undefined;
  draft: CustomerDraft;
  dependencies: CentralCustomerCreateCanaryDependencies;
}): Promise<CentralCustomerCreateResult> {
  const { dependencies } = input;
  if (
    !isCentralCustomerCreateCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    )
  ) {
    const fallback = dependencies.addCustomerFallback(input.draft);
    return fallback.ok
      ? { ...fallback, delivery: "local" }
      : fallback;
  }

  const ownerScope = input.userId as string;
  const eventSync = await dependencies.syncEventsBeforeWrite?.();
  if (eventSync && !eventSync.ok && !eventSync.retryable) {
    return {
      ok: false,
      error:
        "Hay cambios centrales que este dispositivo no pudo aplicar. Revisa la sincronización antes de guardar el cliente.",
    };
  }
  const status = await statusWithTimeout(
    dependencies.fetchStatus ??
      fetchCentralBusinessAuthorityStatusFromBrowser,
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
        "El servidor central todavía no está preparado para guardar clientes en esta cuenta.",
    };
  }

  try {
    return await withCentralBusinessQueueLock(ownerScope, async () => {
      const baseline = dependencies.getCurrentData();
      const id = (dependencies.createId ?? (() => crypto.randomUUID()))();
      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const prepared = createCustomerInCollection(
        baseline.customers,
        input.draft,
        id,
        now,
      );
      if (!prepared.ok) return prepared;

      const operationId = `CENTRAL_CUSTOMER_CREATE:${id}`;
      enqueueCentralBusinessOperation({
        ownerScope,
        operationId,
        mutation: {
          idempotencyKey: operationId,
          operationKind: "upsert",
          entityType: "customer",
          entityId: id,
          expectedVersion: 0,
          payload: jsonCustomer(prepared.customer),
        },
        storage: dependencies.storage,
        now: () => now,
      });

      const local = dependencies.addCustomerDurably(
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
          customer: local.value,
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
          customer: local.value,
          delivery: "central_confirmed",
        };
      }
      return {
        ok: true,
        customer: local.value,
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
        "No se pudo preparar y verificar la cola segura. No se guardó el cliente.",
    };
  }
}
