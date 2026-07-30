import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import {
  deleteUserReminderFromCollection,
  updateUserReminderInCollection,
} from "@/lib/user-reminder-mutations";
import { EMPTY_DATA, type AppData, type UserReminder } from "@/lib/types";

import {
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import {
  deleteReminderWithCentralCanary,
  setReminderCompletedWithCentralCanary,
  type CentralReminderMutationCanaryDependencies,
} from "./reminder-mutation-canary";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

class MemoryStorage implements CentralBusinessQueueStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const userId = "dee25bc5-381c-40a7-9402-383d4b309052";
const reminderId = "reminder-synthetic-0001";
const now = "2026-07-30T07:30:00.000Z";
const environment = { enabled: "true", userIds: userId };
const reminder: UserReminder = {
  id: reminderId,
  text: "Recordatorio sintético",
  link: { kind: "none" },
  target: "self",
  completed: false,
  createdAt: "2026-07-30T07:00:00.000Z",
  updatedAt: "2026-07-30T07:00:00.000Z",
};

function appData(): AppData {
  return { ...EMPTY_DATA, userReminders: [reminder] };
}

function readyStatus(): Extract<
  CentralBusinessAuthorityStatusResult,
  { ok: true }
> {
  return {
    ok: true,
    schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_CLIENT_V1",
    activation: {
      requestedMode: "canary",
      effectiveMode: "canary",
      enabled: true,
      writesEnabled: true,
      appliesToUser: true,
      production: true,
      reason: "canary_allowlist",
    },
    readiness: {
      schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS_V1",
      checkedAt: now,
      ready: true,
      checks: [],
      blockers: [],
    },
    summary: {
      writesPossible: true,
      modeAllowsWrites: true,
      serverSchemaReady: true,
      deviceVerified: true,
    },
  };
}

async function seedVersion(storage: MemoryStorage) {
  enqueueCentralBusinessOperation({
    ownerScope: userId,
    operationId: "CENTRAL_REMINDER_CREATE:seed",
    mutation: {
      idempotencyKey: "CENTRAL_REMINDER_CREATE:seed",
      operationKind: "upsert",
      entityType: "user_reminder",
      entityId: reminderId,
      expectedVersion: 0,
      payload: JSON.parse(JSON.stringify(reminder)),
    },
    storage,
    now: () => now,
  });
  await drainCentralBusinessDurableQueue({
    ownerScope: userId,
    storage,
    mutate: async () => ({
      ok: true,
      schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
      status: "committed",
      eventId: "event-reminder-seed",
      eventSequence: 1,
      entityVersion: 1,
      deleted: false,
      contentHash: "hash-reminder-v1",
    }),
  });
}

function dependencies(
  storage: MemoryStorage,
  current: AppData,
  overrides: Partial<CentralReminderMutationCanaryDependencies> = {},
): CentralReminderMutationCanaryDependencies {
  return {
    getCurrentData: () => current,
    completeUserReminderFallback: vi.fn(),
    reopenUserReminderFallback: vi.fn(),
    deleteUserReminderFallback: vi.fn(),
    updateUserReminderDurably: vi.fn(
      (next, identity, expected): AppDataDurabilityResult<UserReminder> => {
        const result = updateUserReminderInCollection(
          expected.userReminders,
          next,
          identity.now,
        );
        if (!result.ok) {
          return { status: "blocked", reason: result.reason };
        }
        return {
          status: "applied",
          data: { ...expected, userReminders: result.reminders },
          value: result.reminder,
          replayed: false,
        };
      },
    ),
    deleteUserReminderDurably: vi.fn(
      (id, expected): AppDataDurabilityResult<string> => {
        const result = deleteUserReminderFromCollection(
          expected.userReminders,
          id,
        );
        if (!result.ok) {
          return { status: "blocked", reason: result.reason };
        }
        return {
          status: "applied",
          data: { ...expected, userReminders: result.reminders },
          value: id,
          replayed: false,
        };
      },
    ),
    syncEventsBeforeWrite: vi.fn(async () => ({
      ok: true as const,
      schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1" as const,
      pulled: 0,
      applied: 0,
      skipped: 0,
      nextSequence: 1,
      hasMore: false,
    })),
    fetchStatus: vi.fn(async () => readyStatus()),
    mutate: vi.fn(async (): Promise<CentralBusinessBrowserMutationResult> => ({
      ok: true,
      schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
      status: "committed",
      eventId: "event-reminder-mutation",
      eventSequence: 2,
      entityVersion: 2,
      deleted: false,
      contentHash: "hash-reminder-v2",
    })),
    storage,
    createId: () => "operation-reminder-synthetic",
    now: () => now,
    environment,
    ...overrides,
  };
}

describe("central reminder mutation canary", () => {
  it("completa con la versión conocida y el instante central preparado", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);
    const current = appData();
    const deps = dependencies(storage, current);

    const result = await setReminderCompletedWithCentralCanary({
      userId,
      reminderId,
      completed: true,
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      value: {
        completed: true,
        completedAt: now,
        updatedAt: now,
      },
    });
    expect(deps.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "user_reminder",
        entityId: reminderId,
        expectedVersion: 1,
        payload: expect.objectContaining({
          completed: true,
          completedAt: now,
        }),
      }),
    );
    expect(
      loadCentralBusinessDurableQueue(userId, storage).entityVersions[
        `user_reminder:${reminderId}`
      ],
    ).toMatchObject({ version: 2, deleted: false });
  });

  it("reabre sin conservar completedAt", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);
    const current = appData();
    current.userReminders[0] = {
      ...current.userReminders[0],
      completed: true,
      completedAt: "2026-07-30T07:15:00.000Z",
    };
    const deps = dependencies(storage, current);

    const result = await setReminderCompletedWithCentralCanary({
      userId,
      reminderId,
      completed: false,
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      value: { completed: false, updatedAt: now },
    });
    if (result.ok) expect(result.value.completedAt).toBeUndefined();
  });

  it("elimina mediante tombstone central después del commit local", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);
    const current = appData();
    const mutate = vi.fn(
      async (): Promise<CentralBusinessBrowserMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-reminder-delete",
        eventSequence: 2,
        entityVersion: 2,
        deleted: true,
        contentHash: "hash-reminder-deleted",
      }),
    );
    const deps = dependencies(storage, current, { mutate });

    const result = await deleteReminderWithCentralCanary({
      userId,
      reminderId,
      dependencies: deps,
    });

    expect(result).toEqual({
      ok: true,
      value: reminderId,
      delivery: "central_confirmed",
    });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        operationKind: "delete",
        expectedVersion: 1,
        payload: null,
      }),
    );
    expect(
      loadCentralBusinessDurableQueue(userId, storage).entityVersions[
        `user_reminder:${reminderId}`
      ],
    ).toMatchObject({ version: 2, deleted: true });
  });

  it("fuera del canario conserva el comportamiento local", async () => {
    const storage = new MemoryStorage();
    const current = appData();
    const deps = dependencies(storage, current);

    const result = await setReminderCompletedWithCentralCanary({
      userId: "persianas-user",
      reminderId,
      completed: true,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "local" });
    expect(deps.completeUserReminderFallback).toHaveBeenCalledWith(reminderId);
    expect(deps.mutate).not.toHaveBeenCalled();
  });
});
