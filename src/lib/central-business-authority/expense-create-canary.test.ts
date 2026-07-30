import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData, type Expense } from "@/lib/types";

import {
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import {
  createExpenseWithCentralCanary,
  type CentralExpenseCreateCanaryDependencies,
} from "./expense-create-canary";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
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
const expenseId = "expense-synthetic-0001";
const now = "2026-07-30T09:00:00.000Z";
const draft = {
  date: "2026-07-30",
  origin: "manual" as const,
  supplierName: "Proveedor sintético",
  description: "Canario central",
  amount: 12.34,
  ivaPercent: 21,
  category: "Otros",
  paymentMethod: "Tarjeta",
};
const environment = {
  expenseEnabled: "true",
  expenseUserIds: userId,
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

function dependencies(
  overrides: Partial<CentralExpenseCreateCanaryDependencies> = {},
): CentralExpenseCreateCanaryDependencies {
  const baseline: AppData = { ...EMPTY_DATA, expenses: [] };
  return {
    getCurrentData: () => baseline,
    addExpenseFallback: vi.fn(),
    addExpenseDurably: vi.fn(
      (expense, identity, expected): AppDataDurabilityResult<Expense> => {
        const created = {
          ...expense,
          id: identity.id,
          createdAt: identity.now,
        };
        return {
          status: "applied",
          data: { ...expected, expenses: [...expected.expenses, created] },
          value: created,
          replayed: false,
        };
      },
    ),
    fetchStatus: vi.fn(async () => readyStatus()),
    mutate: vi.fn(async (): Promise<CentralBusinessBrowserMutationResult> => ({
      ok: true,
      schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
      status: "committed",
      eventId: "event-expense-create",
      eventSequence: 1,
      entityVersion: 1,
      deleted: false,
      contentHash: "hash-expense-v1",
    })),
    storage: new MemoryStorage(),
    createId: () => expenseId,
    now: () => now,
    environment,
    ...overrides,
  };
}

describe("central expense create canary", () => {
  it("keeps the existing local path outside the exact allowlist", async () => {
    const deps = dependencies();
    const result = await createExpenseWithCentralCanary({
      userId: "persianas-user",
      expense: draft,
      dependencies: deps,
    });

    expect(result).toEqual({
      ok: true,
      expense: null,
      delivery: "local",
    });
    expect(deps.addExpenseFallback).toHaveBeenCalledWith(draft);
    expect(deps.fetchStatus).not.toHaveBeenCalled();
  });

  it("persists locally before confirming version one centrally", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({ storage });
    const result = await createExpenseWithCentralCanary({
      userId,
      expense: draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      expense: { id: expenseId, createdAt: now },
    });
    expect(deps.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "expense",
        entityId: expenseId,
        expectedVersion: 0,
        payload: expect.objectContaining({ description: "Canario central" }),
      }),
    );
    expect(loadCentralBusinessDurableQueue(userId, storage)).toMatchObject({
      operations: [],
      entityVersions: {
        [`expense:${expenseId}`]: { version: 1, deleted: false },
      },
    });
  });

  it("keeps a durable pending operation when the status check is offline", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      fetchStatus: vi.fn(
        async (): Promise<CentralBusinessAuthorityStatusResult> => ({
          ok: false,
          status: 0,
          code: "CENTRAL_BUSINESS_STATUS_NETWORK_ERROR",
          message: "offline",
        }),
      ),
    });

    const result = await createExpenseWithCentralCanary({
      userId,
      expense: draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "central_pending" });
    expect(loadCentralBusinessDurableQueue(userId, storage).operations).toHaveLength(
      1,
    );
    expect(deps.mutate).not.toHaveBeenCalled();
  });
});
