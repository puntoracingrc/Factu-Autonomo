import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData, type BusinessProfile, type Expense } from "@/lib/types";

import {
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import {
  deleteExpenseWithCentralCanary,
  updateExpenseWithCentralCanary,
  type CentralExpenseMutationCanaryDependencies,
} from "./expense-mutation-canary";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import {
  updateProfileWithCentralCanary,
  type CentralProfileMutationCanaryDependencies,
} from "./profile-mutation-canary";
import type { CentralBusinessJson } from "./mutation-command";
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
const now = "2026-07-30T09:10:00.000Z";
const expense: Expense = {
  id: "expense-synthetic-0001",
  date: "2026-07-30",
  origin: "manual",
  supplierName: "Proveedor sintético",
  description: "Antes",
  amount: 12.34,
  ivaPercent: 21,
  category: "Otros",
  paymentMethod: "Tarjeta",
  createdAt: "2026-07-30T09:00:00.000Z",
};
const environment = {
  expenseEnabled: "true",
  expenseUserIds: userId,
  profileEnabled: "true",
  profileUserIds: userId,
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

async function seedVersion(
  storage: MemoryStorage,
  entityType: "expense" | "profile",
  entityId: string,
  payload: CentralBusinessJson,
) {
  const operationId = `CENTRAL_TEST_SEED:${entityType}:${entityId}`;
  enqueueCentralBusinessOperation({
    ownerScope: userId,
    operationId,
    mutation: {
      idempotencyKey: operationId,
      operationKind: "upsert",
      entityType,
      entityId,
      expectedVersion: 0,
      payload,
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
      eventId: `event-seed-${entityType}`,
      eventSequence: entityType === "expense" ? 1 : 2,
      entityVersion: 1,
      deleted: false,
      contentHash: `hash-${entityType}-v1`,
    }),
  });
}

function mutationResult(version: number): CentralBusinessBrowserMutationResult {
  return {
    ok: true,
    schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
    status: "committed",
    eventId: `event-mutation-${version}`,
    eventSequence: version + 2,
    entityVersion: version,
    deleted: false,
    contentHash: `hash-mutation-v${version}`,
  };
}

describe("central expense and profile mutation canaries", () => {
  it("updates an existing expense with optimistic version one", async () => {
    const storage = new MemoryStorage();
    await seedVersion(
      storage,
      "expense",
      expense.id,
      JSON.parse(JSON.stringify(expense)) as CentralBusinessJson,
    );
    const current: AppData = { ...EMPTY_DATA, expenses: [expense] };
    const updated = { ...expense, description: "Después" };
    const dependencies: CentralExpenseMutationCanaryDependencies = {
      getCurrentData: () => current,
      updateExpenseFallback: vi.fn(),
      deleteExpenseFallback: vi.fn(),
      updateExpenseDurably: vi.fn(
        (next, expected): AppDataDurabilityResult<Expense> => ({
          status: "applied",
          data: { ...expected, expenses: [next] },
          value: next,
          replayed: false,
        }),
      ),
      deleteExpenseDurably: vi.fn(),
      fetchStatus: vi.fn(async () => readyStatus()),
      mutate: vi.fn(async () => mutationResult(2)),
      storage,
      now: () => now,
      createId: () => "expense-update-operation",
      environment,
    };

    const result = await updateExpenseWithCentralCanary({
      userId,
      expense: updated,
      dependencies,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      value: { description: "Después" },
    });
    expect(dependencies.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "expense",
        entityId: expense.id,
        expectedVersion: 1,
      }),
    );
  });

  it("does not split deletion of a recurring occurrence from its template", async () => {
    const storage = new MemoryStorage();
    const recurring = { ...expense, recurringExpenseId: "fixed-template-1" };
    await seedVersion(
      storage,
      "expense",
      recurring.id,
      JSON.parse(JSON.stringify(recurring)) as CentralBusinessJson,
    );
    const current: AppData = { ...EMPTY_DATA, expenses: [recurring] };
    const mutate = vi.fn(async () => mutationResult(2));
    const dependencies: CentralExpenseMutationCanaryDependencies = {
      getCurrentData: () => current,
      updateExpenseFallback: vi.fn(),
      deleteExpenseFallback: vi.fn(),
      updateExpenseDurably: vi.fn(),
      deleteExpenseDurably: vi.fn(),
      fetchStatus: vi.fn(async () => readyStatus()),
      mutate,
      storage,
      now: () => now,
      createId: () => "expense-delete-operation",
      environment,
    };

    const result = await deleteExpenseWithCentralCanary({
      userId,
      expenseId: recurring.id,
      dependencies,
    });

    expect(result).toMatchObject({ ok: false });
    expect(mutate).not.toHaveBeenCalled();
    expect(dependencies.deleteExpenseDurably).not.toHaveBeenCalled();
  });

  it("normalizes and updates the singleton profile centrally", async () => {
    const storage = new MemoryStorage();
    const profile = {
      ...EMPTY_DATA.profile,
      name: "Empresa sintética",
    } satisfies BusinessProfile;
    await seedVersion(
      storage,
      "profile",
      "profile",
      JSON.parse(JSON.stringify(profile)) as CentralBusinessJson,
    );
    const current: AppData = { ...EMPTY_DATA, profile };
    const next = { ...profile, phone: "600000000" };
    const dependencies: CentralProfileMutationCanaryDependencies = {
      getCurrentData: () => current,
      updateProfileFallback: vi.fn(),
      updateProfileDurably: vi.fn(
        (updated, expected): AppDataDurabilityResult<BusinessProfile> => ({
          status: "applied",
          data: { ...expected, profile: updated },
          value: updated,
          replayed: false,
        }),
      ),
      fetchStatus: vi.fn(async () => readyStatus()),
      mutate: vi.fn(async () => mutationResult(2)),
      storage,
      now: () => now,
      createId: () => "profile-update-operation",
      environment,
    };

    const result = await updateProfileWithCentralCanary({
      userId,
      profile: next,
      dependencies,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      value: { phone: "600000000" },
    });
    expect(dependencies.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "profile",
        entityId: "profile",
        expectedVersion: 1,
        payload: expect.objectContaining({ phone: "600000000" }),
      }),
    );
  });
});
