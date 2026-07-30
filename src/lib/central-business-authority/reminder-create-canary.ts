"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import {
  createUserReminderWithIdentity,
  type UserReminderDraft,
} from "@/lib/user-reminder-mutations";
import type { AppData, UserReminder } from "@/lib/types";

import {
  discardCentralBusinessOperation,
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
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
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityStatusResult,
} from "./status-client";

export const CENTRAL_REMINDER_CREATE_CANARY =
  "CENTRAL_REMINDER_CREATE_CANARY_V1";

export type CentralReminderCreateDelivery =
  "local" | "central_confirmed" | "central_pending" | "central_review";

export type CentralReminderCreateResult =
  | {
      ok: true;
      reminder: UserReminder;
      delivery: CentralReminderCreateDelivery;
    }
  | { ok: false; error: string };

export interface CentralReminderCreateCanaryEnvironment {
  enabled?: string;
  userIds?: string;
}

export interface CentralReminderCreateCanaryDependencies {
  getCurrentData(): AppData;
  addUserReminderFallback(draft: UserReminderDraft): UserReminder;
  addUserReminderDurably(
    draft: UserReminderDraft,
    identity: { id: string; now: string },
    expected: AppData,
  ): AppDataDurabilityResult<UserReminder>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<typeof mutateCentralBusinessFromBrowser>[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  environment?: CentralReminderCreateCanaryEnvironment;
}

const publicEnvironment: CentralReminderCreateCanaryEnvironment = {
  enabled: process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_REMINDER_CANARY_ENABLED,
  userIds: process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_REMINDER_CANARY_USER_IDS,
};

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function isCentralReminderCanaryEnabledForUser(
  userId: string | null | undefined,
  environment: CentralReminderCreateCanaryEnvironment = publicEnvironment,
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

function jsonReminder(reminder: UserReminder): CentralBusinessJson {
  return JSON.parse(JSON.stringify(reminder)) as CentralBusinessJson;
}

function durabilityError(
  result: Exclude<AppDataDurabilityResult<UserReminder>, { status: "applied" }>,
): string {
  if (result.status === "indeterminate") {
    return "El recordatorio quedó pendiente de revisión porque no se pudo confirmar el almacenamiento local.";
  }
  if (result.reason === "stale_precondition") {
    return "Los recordatorios cambiaron mientras se guardaba. Revisa la lista y vuelve a intentarlo.";
  }
  return "No se pudo guardar y verificar el recordatorio en este dispositivo.";
}

export async function createReminderWithCentralCanary(input: {
  userId: string | null | undefined;
  draft: UserReminderDraft;
  dependencies: CentralReminderCreateCanaryDependencies;
}): Promise<CentralReminderCreateResult> {
  const { dependencies } = input;
  if (
    !isCentralReminderCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    )
  ) {
    try {
      return {
        ok: true,
        reminder: dependencies.addUserReminderFallback(input.draft),
        delivery: "local",
      };
    } catch {
      return { ok: false, error: "No se pudo guardar el recordatorio." };
    }
  }

  const ownerScope = input.userId as string;
  const eventSync = await dependencies.syncEventsBeforeWrite?.();
  if (eventSync && !eventSync.ok && !eventSync.retryable) {
    return {
      ok: false,
      error:
        "Hay cambios centrales que este dispositivo no pudo aplicar. Revisa la sincronización antes de guardar el recordatorio.",
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
        "El servidor central todavía no está preparado para guardar recordatorios en esta cuenta.",
    };
  }

  try {
    return await withCentralBusinessQueueLock(ownerScope, async () => {
      const baseline = dependencies.getCurrentData();
      const id = (dependencies.createId ?? (() => crypto.randomUUID()))();
      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const prepared = createUserReminderWithIdentity(input.draft, { id, now });
      const operationId = `CENTRAL_REMINDER_CREATE:${id}`;

      enqueueCentralBusinessOperation({
        ownerScope,
        operationId,
        mutation: {
          idempotencyKey: operationId,
          operationKind: "upsert",
          entityType: "user_reminder",
          entityId: id,
          expectedVersion: 0,
          payload: jsonReminder(prepared),
        },
        storage: dependencies.storage,
        now: () => now,
      });

      const local = dependencies.addUserReminderDurably(
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
          reminder: local.value,
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
          reminder: local.value,
          delivery: "central_confirmed",
        };
      }
      return {
        ok: true,
        reminder: local.value,
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
        "No se pudo preparar y verificar la cola segura. No se aplicó el recordatorio.",
    };
  }
}
