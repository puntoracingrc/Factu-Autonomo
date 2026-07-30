import { describe, expect, it, vi } from "vitest";

import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData, type Expense } from "@/lib/types";

import type { CentralBusinessBrowserBatchMutationResult } from "./batch-mutation-client";
import type { CentralBusinessBrowserBatchMutationInput } from "./batch-mutation-client";
import {
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import {
  saveCentralExpenseBundleWithCanary,
  type CentralExpenseBundleCanaryDependencies,
  type CentralExpenseBundlePreparation,
} from "./expense-bundle-canary";
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
const now = "2026-07-30T10:00:00.000Z";
const environment = {
  expenseEnabled: "true",
  expenseUserIds: userId,
};
const createdExpense: Expense = {
  id: "expense-bundle-0001",
  createdAt: now,
  date: "2026-07-30",
  supplierId: "supplier-bundle-0001",
  supplierName: "Proveedor sintético",
  description: "Gasto atómico",
  amount: 18.15,
  ivaPercent: 21,
  category: "Otros",
  paymentMethod: "Tarjeta",
  origin: "manual",
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

function transition(data: AppData): AppDataTransition<Expense> {
  return {
    data: { ...data, expenses: [...data.expenses, createdExpense] },
    value: createdExpense,
  };
}

function dependencies(
  overrides: Partial<CentralExpenseBundleCanaryDependencies<Expense>> = {},
): CentralExpenseBundleCanaryDependencies<Expense> {
  const baseline: AppData = { ...EMPTY_DATA, expenses: [], suppliers: [] };
  return {
    getCurrentData: () => baseline,
    fallback: vi.fn((): AppDataDurabilityResult<Expense> => ({
      status: "applied",
      data: transition(baseline).data,
      value: createdExpense,
      replayed: false,
    })),
    prepareLocal: vi.fn(
      ({ data }): CentralExpenseBundlePreparation<Expense> => ({
        ok: true,
        transition: transition(data),
        mutations: [
          {
            entityType: "supplier",
            entityId: "supplier-bundle-0001",
            expectation: "create",
            payload: {
              id: "supplier-bundle-0001",
              createdAt: now,
              name: "Proveedor sintético",
            },
          },
          {
            entityType: "expense",
            entityId: createdExpense.id,
            expectation: "create",
            payload: JSON.parse(JSON.stringify(createdExpense)),
          },
          {
            entityType: "recurring_expense",
            entityId: "recurring-bundle-0001",
            expectation: "create",
            payload: {
              id: "recurring-bundle-0001",
              createdAt: now,
              description: "Plantilla sintética",
            },
          },
        ],
      }),
    ),
    commitLocal: vi.fn(
      (expected, prepared): AppDataDurabilityResult<Expense> => ({
        status: "applied",
        data: prepared.data,
        value: prepared.value,
        replayed: false,
      }),
    ),
    fetchStatus: vi.fn(async () => readyStatus()),
    mutate: vi.fn(),
    mutateBatch: vi.fn(
      async (
        mutations: CentralBusinessBrowserBatchMutationInput[],
      ): Promise<CentralBusinessBrowserBatchMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1",
        operations: mutations.map((_, operationIndex) => ({
          operationIndex,
          status: "committed",
          eventId: `event-${operationIndex}`,
          eventSequence: operationIndex + 1,
          entityVersion: 1,
          deleted: false,
          contentHash: `hash-${operationIndex}`,
        })),
      }),
    ),
    storage: new MemoryStorage(),
    now: () => now,
    environment,
    ...overrides,
  };
}

describe("central expense bundle canary", () => {
  it("keeps the durable local path outside the exact allowlist", async () => {
    const deps = dependencies();
    const result = await saveCentralExpenseBundleWithCanary({
      userId: "persianas-user",
      operationId: "local-expense-bundle",
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "local" });
    expect(deps.fallback).toHaveBeenCalledOnce();
    expect(deps.fetchStatus).not.toHaveBeenCalled();
    expect(deps.prepareLocal).not.toHaveBeenCalled();
  });

  it("commits supplier, expense and recurrence in one batch after local durability", async () => {
    const order: string[] = [];
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      commitLocal: vi.fn(
        (
          expected: AppData,
          prepared: AppDataTransition<Expense>,
        ): AppDataDurabilityResult<Expense> => {
          order.push("local");
          return {
            status: "applied",
            data: prepared.data,
            value: prepared.value,
            replayed: false,
          };
        },
      ),
      mutateBatch: vi.fn(
        async (
          mutations: CentralBusinessBrowserBatchMutationInput[],
        ): Promise<CentralBusinessBrowserBatchMutationResult> => {
          order.push("server");
          return {
            ok: true,
            schema: "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1",
            operations: mutations.map((_, operationIndex) => ({
              operationIndex,
              status: "committed",
              eventId: `event-${operationIndex}`,
              eventSequence: operationIndex + 1,
              entityVersion: 1,
              deleted: false,
              contentHash: `hash-${operationIndex}`,
            })),
          };
        },
      ),
    });

    const result = await saveCentralExpenseBundleWithCanary({
      userId,
      operationId: "scan-bundle-atomic-0001",
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      local: { value: { id: createdExpense.id } },
    });
    expect(order).toEqual(["local", "server"]);
    expect(deps.mutate).not.toHaveBeenCalled();
    expect(deps.mutateBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        entityType: "supplier",
        expectedVersion: 0,
      }),
      expect.objectContaining({
        entityType: "expense",
        expectedVersion: 0,
      }),
      expect.objectContaining({
        entityType: "recurring_expense",
        expectedVersion: 0,
      }),
    ]);
    expect(loadCentralBusinessDurableQueue(userId, storage)).toMatchObject({
      operations: [],
      entityVersions: {
        "supplier:supplier-bundle-0001": { version: 1 },
        "expense:expense-bundle-0001": { version: 1 },
        "recurring_expense:recurring-bundle-0001": { version: 1 },
      },
    });
  });

  it("keeps every member pending when the server is unreachable", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      mutateBatch: vi.fn(
        async (): Promise<CentralBusinessBrowserBatchMutationResult> => ({
          ok: false,
          status: 0,
          code: "CENTRAL_BUSINESS_BATCH_NETWORK_ERROR",
          message: "offline",
          retryable: true,
          conflict: false,
        }),
      ),
    });

    const result = await saveCentralExpenseBundleWithCanary({
      userId,
      operationId: "scan-bundle-offline-0001",
      dependencies: deps,
    });
    const queue = loadCentralBusinessDurableQueue(userId, storage);

    expect(result).toMatchObject({ ok: true, delivery: "central_pending" });
    expect(queue.operations).toHaveLength(3);
    expect(new Set(queue.operations.map((entry) => entry.batchId)).size).toBe(
      1,
    );
    expect(queue.operations.every((entry) => entry.status === "pending")).toBe(
      true,
    );
  });

  it("forwards an explicit delete with the known central version", async () => {
    const storage = new MemoryStorage();
    await saveCentralExpenseBundleWithCanary({
      userId,
      operationId: "scan-bundle-delete-seed-0001",
      dependencies: dependencies({ storage }),
    });
    const mutateBatch = vi.fn(
      async (
        mutations: CentralBusinessBrowserBatchMutationInput[],
      ): Promise<CentralBusinessBrowserBatchMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1",
        operations: mutations.map((mutation, operationIndex) => ({
          operationIndex,
          status: "committed",
          eventId: `delete-event-${operationIndex}`,
          eventSequence: 10 + operationIndex,
          entityVersion: mutation.expectedVersion + 1,
          deleted: mutation.operationKind === "delete",
          contentHash: `delete-hash-${operationIndex}`,
        })),
      }),
    );
    const deps = dependencies({
      storage,
      mutateBatch,
      prepareLocal: vi.fn(
        ({ data }): CentralExpenseBundlePreparation<Expense> => ({
          ok: true,
          transition: transition(data),
          mutations: [
            {
              entityType: "recurring_expense",
              entityId: "recurring-bundle-0001",
              expectation: "known",
              operationKind: "delete",
              payload: null,
            },
          ],
        }),
      ),
    });

    const result = await saveCentralExpenseBundleWithCanary({
      userId,
      operationId: "scan-bundle-delete-0001",
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
    });
    expect(mutateBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        entityType: "recurring_expense",
        operationKind: "delete",
        expectedVersion: 1,
        payload: null,
      }),
    ]);
  });

  it("marks the complete batch for review on one version conflict", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      mutateBatch: vi.fn(
        async (): Promise<CentralBusinessBrowserBatchMutationResult> => ({
          ok: false,
          status: 409,
          code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
          message: "conflict",
          retryable: false,
          conflict: true,
        }),
      ),
    });

    const result = await saveCentralExpenseBundleWithCanary({
      userId,
      operationId: "scan-bundle-conflict-0001",
      dependencies: deps,
    });
    const queue = loadCentralBusinessDurableQueue(userId, storage);

    expect(result).toMatchObject({ ok: true, delivery: "central_review" });
    expect(queue.operations).toHaveLength(3);
    expect(queue.operations.every((entry) => entry.status === "conflict")).toBe(
      true,
    );
  });

  it("keeps the verified local result for review if confirmation is incomplete", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      mutateBatch: vi.fn(async () => {
        throw new Error("invalid confirmation");
      }),
    });

    const result = await saveCentralExpenseBundleWithCanary({
      userId,
      operationId: "scan-bundle-invalid-confirmation-0001",
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_review",
      local: { status: "applied", value: { id: createdExpense.id } },
    });
    expect(
      loadCentralBusinessDurableQueue(userId, storage).operations,
    ).toHaveLength(3);
  });

  it("discards the complete queued batch when local persistence blocks", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      commitLocal: vi.fn((): AppDataDurabilityResult<Expense> => ({
        status: "blocked",
        reason: "stale_precondition",
      })),
    });

    const result = await saveCentralExpenseBundleWithCanary({
      userId,
      operationId: "scan-bundle-local-block-0001",
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: false,
      localFailure: { status: "blocked", reason: "stale_precondition" },
    });
    expect(loadCentralBusinessDurableQueue(userId, storage).operations).toEqual(
      [],
    );
    expect(deps.mutateBatch).not.toHaveBeenCalled();
  });

  it("requires a known central version before updating a linked entity", async () => {
    const deps = dependencies({
      prepareLocal: vi.fn(
        ({ data }): CentralExpenseBundlePreparation<Expense> => ({
          ok: true,
          transition: transition(data),
          mutations: [
            {
              entityType: "expense",
              entityId: createdExpense.id,
              expectation: "known",
              payload: JSON.parse(JSON.stringify(createdExpense)),
            },
          ],
        }),
      ),
    });

    const result = await saveCentralExpenseBundleWithCanary({
      userId,
      operationId: "scan-bundle-update-0001",
      dependencies: deps,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "No se pudo confirmar la versión central de una ficha vinculada. Sincroniza y vuelve a intentarlo.",
    });
    expect(deps.commitLocal).not.toHaveBeenCalled();
    expect(deps.mutateBatch).not.toHaveBeenCalled();
  });
});
