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
  recordCentralBusinessEntityVersionCheckpoint,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import {
  saveCentralExpenseBundleWithCanary,
  type CentralExpenseBundleCanaryDependencies,
  type CentralExpenseBundlePreparation,
} from "./expense-bundle-canary";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";
import { prepareCentralScannedExpenseBundle } from "./expense-bundle-preparation";
import type { ScannedExpenseDurableValue } from "@/lib/scanned-expense-durability";
import type { Product } from "@/lib/types";

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
    fallback: vi.fn(
      (): AppDataDurabilityResult<Expense> => ({
        status: "applied",
        data: transition(baseline).data,
        value: createdExpense,
        replayed: false,
      }),
    ),
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
    expect(order).toEqual(["server", "local"]);
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

  it("keeps only the recovery envelope when the server response is unreachable", async () => {
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

    expect(result).toMatchObject({ ok: false });
    expect(deps.commitLocal).not.toHaveBeenCalled();
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

  it("rejects a conflicting batch without applying or retaining local changes", async () => {
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

    expect(result).toMatchObject({ ok: false });
    expect(deps.commitLocal).not.toHaveBeenCalled();
    expect(queue.operations).toHaveLength(0);
  });

  it("does not apply local data if confirmation is incomplete", async () => {
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

    expect(result).toMatchObject({ ok: false });
    expect(deps.commitLocal).not.toHaveBeenCalled();
    expect(
      loadCentralBusinessDurableQueue(userId, storage).operations,
    ).toHaveLength(3);
  });

  it("keeps the server confirmation when the cache persistence blocks", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      commitLocal: vi.fn(
        (): AppDataDurabilityResult<Expense> => ({
          status: "blocked",
          reason: "stale_precondition",
        }),
      ),
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
    expect(deps.mutateBatch).toHaveBeenCalledOnce();
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

describe("atomic expense and catalogue cost delivery", () => {
  it("replays the same expense/product batch after a timeout and a clock change", async () => {
    const storage = new MemoryStorage();
    const product: Product = {
      id: "synthetic-cost-retry-product",
      key: "motor",
      name: "Motor",
      family: "Motores",
      unit: "ud",
      sales: { unitPrice: 150 },
      purchase: {
        unit: "ud",
        listPrice: 100,
        discountPercent: 35,
        netUnitCost: 65,
        supplierName: "Proveedor sintético",
      },
      source: "manual",
      createdAt: now,
      updatedAt: now,
    };
    const baseline = { ...EMPTY_DATA, expenses: [], products: [product] };
    recordCentralBusinessEntityVersionCheckpoint({
      ownerScope: userId,
      storage,
      entities: [
        {
          entityType: "product",
          entityId: product.id,
          version: 1,
          contentHash: "a".repeat(64),
        },
      ],
    });
    let clock = now;
    const expense = {
      ...createdExpense,
      id: undefined,
      createdAt: undefined,
      supplierId: undefined,
      amount: 67.6,
      purchaseLines: [
        {
          id: "synthetic-retry-line",
          description: "Motor",
          quantity: 1,
          unitPrice: 104,
          discountPercent: 35,
          unit: "ud",
          catalogProduct: false,
        },
      ],
    };
    const { id, createdAt, ...draft } = expense;
    void id;
    void createdAt;
    const bodies: CentralBusinessBrowserBatchMutationInput[][] = [];
    const commitLocal = vi.fn(
      (
        expected: AppData,
        prepared: AppDataTransition<ScannedExpenseDurableValue>,
      ): AppDataDurabilityResult<ScannedExpenseDurableValue> => ({
        status: "applied",
        ...prepared,
        replayed: false,
      }),
    );
    const deps: CentralExpenseBundleCanaryDependencies<ScannedExpenseDurableValue> =
      {
        getCurrentData: () => baseline,
        storage,
        environment,
        now: () => clock,
        fetchStatus: async () => readyStatus(),
        fallback: () => {
          throw Error("Unexpected local fallback");
        },
        prepareLocal: ({ data, now: preparedAt }) =>
          prepareCentralScannedExpenseBundle({
            data,
            expense: draft,
            operationId: "synthetic-retry-cost",
            now: preparedAt,
          }),
        commitLocal,
        mutateBatch: async (mutations) => {
          bodies.push(structuredClone(mutations));
          if (bodies.length === 1)
            return {
              ok: false,
              status: 0,
              code: "CENTRAL_BUSINESS_BATCH_NETWORK_ERROR",
              message: "offline",
              retryable: true,
              conflict: false,
            };
          return {
            ok: true,
            schema: "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1",
            operations: mutations.map((m, operationIndex) => ({
              operationIndex,
              status: "replayed",
              eventId: `event-${operationIndex}`,
              eventSequence: operationIndex + 1,
              entityVersion: m.expectedVersion + 1,
              deleted: false,
              contentHash: `hash-${operationIndex}`,
            })),
          };
        },
      };
    expect(
      await saveCentralExpenseBundleWithCanary({
        userId,
        operationId: "synthetic-retry-cost",
        dependencies: deps,
      }),
    ).toMatchObject({ ok: false });
    expect(commitLocal).not.toHaveBeenCalled();
    expect(baseline.products[0].purchase?.netUnitCost).toBe(65);
    expect(baseline.expenses).toEqual([]);
    clock = "2026-07-30T10:05:00.000Z";
    const recovered = await saveCentralExpenseBundleWithCanary({
      userId,
      operationId: "synthetic-retry-cost",
      dependencies: deps,
    });
    expect(recovered).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
    });
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[0].map((m) => [m.entityType, m.expectedVersion])).toEqual([
      ["expense", 0],
      ["product", 1],
    ]);
    expect(commitLocal).toHaveBeenCalledTimes(1);
    if (!recovered.ok) return;
    expect(recovered.local.data.expenses).toHaveLength(1);
    expect(recovered.local.data.products[0].purchase?.netUnitCost).toBe(67.6);
    expect(recovered.local.data.products[0].sales).toEqual(product.sales);
    expect(loadCentralBusinessDurableQueue(userId, storage).operations).toEqual(
      [],
    );
  });
});
