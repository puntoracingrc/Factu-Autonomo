"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import {
  deleteUserReminderFromCollection,
  updateUserReminderInCollection,
} from "@/lib/user-reminder-mutations";
import type { AppData, UserReminder } from "@/lib/types";

import type { CentralBusinessQueueStorage } from "./durable-queue";
import {
  mutateCentralBusinessEntityWithCanary,
  type CentralBusinessEntityMutationResult,
} from "./entity-mutation-canary";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import type { CentralBusinessJson } from "./mutation-command";
import {
  isCentralReminderCanaryEnabledForUser,
  type CentralReminderCreateCanaryEnvironment,
} from "./reminder-create-canary";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

export const CENTRAL_REMINDER_MUTATION_CANARY =
  "CENTRAL_REMINDER_MUTATION_CANARY_V1";

export interface CentralReminderMutationCanaryDependencies {
  getCurrentData(): AppData;
  completeUserReminderFallback(id: string): void;
  reopenUserReminderFallback(id: string): void;
  deleteUserReminderFallback(id: string): void;
  updateUserReminderDurably(
    reminder: UserReminder,
    identity: { now: string },
    expected: AppData,
  ): AppDataDurabilityResult<UserReminder>;
  deleteUserReminderDurably(
    id: string,
    expected: AppData,
  ): AppDataDurabilityResult<string>;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<
      typeof import("./mutation-client").mutateCentralBusinessFromBrowser
    >[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  environment?: CentralReminderCreateCanaryEnvironment;
}

function jsonReminder(reminder: UserReminder): CentralBusinessJson {
  return JSON.parse(JSON.stringify(reminder)) as CentralBusinessJson;
}

function reminderById(data: AppData, id: string): UserReminder | null {
  const matches = data.userReminders.filter((reminder) => reminder.id === id);
  return matches.length === 1 ? matches[0] : null;
}

export async function setReminderCompletedWithCentralCanary(input: {
  userId: string | null | undefined;
  reminderId: string;
  completed: boolean;
  dependencies: CentralReminderMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<UserReminder>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralReminderCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    ),
    userId: input.userId,
    entityType: "user_reminder",
    entityId: input.reminderId,
    operationKind: "upsert",
    operationIdPrefix: input.completed
      ? "CENTRAL_REMINDER_COMPLETE"
      : "CENTRAL_REMINDER_REOPEN",
    entityLabel: "este recordatorio",
    dependencies: {
      ...dependencies,
      fallback: () => {
        const current = reminderById(
          dependencies.getCurrentData(),
          input.reminderId,
        );
        if (!current) {
          return { ok: false, error: "El recordatorio ya no existe." };
        }
        if (input.completed) {
          dependencies.completeUserReminderFallback(input.reminderId);
        } else {
          dependencies.reopenUserReminderFallback(input.reminderId);
        }
        return {
          ok: true,
          value: {
            ...current,
            completed: input.completed,
            completedAt: input.completed ? new Date().toISOString() : undefined,
          },
          delivery: "local",
        };
      },
      prepareLocal: ({ data, now }) => {
        const current = reminderById(data, input.reminderId);
        if (!current) {
          return { ok: false, error: "El recordatorio ya no existe." };
        }
        const updated: UserReminder = {
          ...current,
          completed: input.completed,
          completedAt: input.completed ? now : undefined,
          updatedAt: now,
        };
        const collection = updateUserReminderInCollection(
          data.userReminders,
          updated,
          now,
        );
        if (!collection.ok) {
          return {
            ok: false,
            error:
              collection.reason === "identifier_collision"
                ? "Hay identificadores de recordatorio duplicados. No se aplicó el cambio."
                : "El recordatorio ya no existe.",
          };
        }
        return {
          ok: true,
          payload: jsonReminder(collection.reminder),
          transition: {
            data: { ...data, userReminders: collection.reminders },
            value: collection.reminder,
          },
        };
      },
      commitLocal: (expected, transition, now) =>
        dependencies.updateUserReminderDurably(
          transition.value,
          { now },
          expected,
        ),
    },
  });
}

export async function deleteReminderWithCentralCanary(input: {
  userId: string | null | undefined;
  reminderId: string;
  dependencies: CentralReminderMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<string>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralReminderCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    ),
    userId: input.userId,
    entityType: "user_reminder",
    entityId: input.reminderId,
    operationKind: "delete",
    operationIdPrefix: "CENTRAL_REMINDER_DELETE",
    entityLabel: "este recordatorio",
    dependencies: {
      ...dependencies,
      fallback: () => {
        if (!reminderById(dependencies.getCurrentData(), input.reminderId)) {
          return { ok: false, error: "El recordatorio ya no existe." };
        }
        dependencies.deleteUserReminderFallback(input.reminderId);
        return {
          ok: true,
          value: input.reminderId,
          delivery: "local",
        };
      },
      prepareLocal: ({ data }) => {
        const deleted = deleteUserReminderFromCollection(
          data.userReminders,
          input.reminderId,
        );
        if (!deleted.ok) {
          return {
            ok: false,
            error:
              deleted.reason === "identifier_collision"
                ? "Hay identificadores de recordatorio duplicados. No se eliminó nada."
                : "El recordatorio ya no existe.",
          };
        }
        return {
          ok: true,
          payload: null,
          transition: {
            data: { ...data, userReminders: deleted.reminders },
            value: input.reminderId,
          },
        };
      },
      commitLocal: (expected) =>
        dependencies.deleteUserReminderDurably(input.reminderId, expected),
    },
  });
}
