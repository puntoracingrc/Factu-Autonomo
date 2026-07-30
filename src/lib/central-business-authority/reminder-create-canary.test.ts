import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { createUserReminderWithIdentity } from "@/lib/user-reminder-mutations";
import { EMPTY_DATA, type AppData, type UserReminder } from "@/lib/types";

import {
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import {
  createReminderWithCentralCanary,
  isCentralReminderCanaryEnabledForUser,
  type CentralReminderCreateCanaryDependencies,
} from "./reminder-create-canary";
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
const now = "2026-07-30T07:00:00.000Z";
const environment = { enabled: "true", userIds: userId };
const draft = {
  text: "Recordatorio sintético",
  target: "self" as const,
  origin: "office" as const,
  link: { kind: "none" as const },
};

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

function appliedReminder(
  expected: AppData,
  id: string,
  createdAt: string,
): AppDataDurabilityResult<UserReminder> {
  const reminder = createUserReminderWithIdentity(draft, {
    id,
    now: createdAt,
  });
  return {
    status: "applied",
    data: {
      ...expected,
      userReminders: [...expected.userReminders, reminder],
    },
    value: reminder,
    replayed: false,
  };
}

function dependencies(
  overrides: Partial<CentralReminderCreateCanaryDependencies> = {},
): CentralReminderCreateCanaryDependencies {
  const baseline = { ...EMPTY_DATA, userReminders: [] };
  return {
    getCurrentData: () => baseline,
    addUserReminderFallback: vi.fn(() =>
      createUserReminderWithIdentity(draft, {
        id: "fallback-reminder",
        now,
      }),
    ),
    addUserReminderDurably: vi.fn((_draft, identity, expected) =>
      appliedReminder(expected, identity.id, identity.now),
    ),
    fetchStatus: vi.fn(async () => readyStatus()),
    mutate: vi.fn(async (): Promise<CentralBusinessBrowserMutationResult> => ({
      ok: true,
      schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
      status: "committed",
      eventId: "event-reminder-create",
      eventSequence: 10,
      entityVersion: 1,
      deleted: false,
      contentHash: "hash-reminder-v1",
    })),
    storage: new MemoryStorage(),
    createId: () => reminderId,
    now: () => now,
    environment,
    ...overrides,
  };
}

describe("central reminder create canary", () => {
  it("solo incluye UUIDs permitidos explícitamente", () => {
    expect(isCentralReminderCanaryEnabledForUser(userId, environment)).toBe(
      true,
    );
    expect(
      isCentralReminderCanaryEnabledForUser("persianas-user", environment),
    ).toBe(false);
  });

  it("mantiene el alta local fuera del canario", async () => {
    const deps = dependencies();
    const result = await createReminderWithCentralCanary({
      userId: "persianas-user",
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "local" });
    expect(deps.addUserReminderFallback).toHaveBeenCalledOnce();
    expect(deps.addUserReminderDurably).not.toHaveBeenCalled();
  });

  it("persiste local antes de confirmar una versión central", async () => {
    const storage = new MemoryStorage();
    const addUserReminderDurably = vi.fn(
      (_draft, identity, expected): AppDataDurabilityResult<UserReminder> => {
        expect(
          loadCentralBusinessDurableQueue(userId, storage).operations[0],
        ).toMatchObject({
          operationId: `CENTRAL_REMINDER_CREATE:${reminderId}`,
          input: {
            entityType: "user_reminder",
            expectedVersion: 0,
          },
        });
        return appliedReminder(expected, identity.id, identity.now);
      },
    );
    const deps = dependencies({ storage, addUserReminderDurably });

    const result = await createReminderWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      reminder: { id: reminderId, completed: false },
    });
    expect(
      loadCentralBusinessDurableQueue(userId, storage).entityVersions[
        `user_reminder:${reminderId}`
      ],
    ).toMatchObject({ version: 1, deleted: false });
  });

  it("conserva la operación local pendiente cuando no hay red", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      fetchStatus: vi.fn(
        async (): Promise<CentralBusinessAuthorityStatusResult> => ({
          ok: false,
          status: 0,
          code: "NETWORK",
          message: "offline",
        }),
      ),
    });

    const result = await createReminderWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "central_pending" });
    expect(
      loadCentralBusinessDurableQueue(userId, storage).operations,
    ).toHaveLength(1);
  });
});
