import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { ProductCatalogStructureResult } from "@/lib/product-catalog-structure";
import { EMPTY_DATA, type AppData, type Product } from "@/lib/types";

import type {
  CentralBusinessBrowserBatchMutationInput,
  CentralBusinessBrowserBatchMutationResult,
} from "./batch-mutation-client";
import {
  loadCentralBusinessDurableQueue,
  recordCentralBusinessEntityVersionCheckpoint,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import {
  applyProductCatalogBatchWithCentralCanary,
  type CentralProductCatalogBatchDependencies,
} from "./product-catalog-batch-canary";
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
const now = "2026-07-30T20:00:00.000Z";
const environment = { enabled: "true", userIds: userId };

function product(id: string, family: string): Product {
  return {
    id,
    key: id,
    aliases: [],
    name: id,
    family,
    unit: "ud",
    source: "manual",
    createdAt: "2026-07-30T10:00:00.000Z",
    updatedAt: "2026-07-30T10:00:00.000Z",
  };
}

function baseline(): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...EMPTY_DATA.profile,
      productFamilyMarkups: {
        rules: [
          {
            id: "margin-source",
            family: "Origen",
            markupPercent: 25,
          },
        ],
      },
    },
    products: [
      product("product-source", "Origen"),
      product("product-target", "Destino"),
    ],
  };
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

function seedVersions(storage: MemoryStorage) {
  recordCentralBusinessEntityVersionCheckpoint({
    ownerScope: userId,
    storage,
    entities: [
      {
        entityType: "product",
        entityId: "product-source",
        version: 3,
        contentHash: "a".repeat(64),
      },
      {
        entityType: "product",
        entityId: "product-target",
        version: 5,
        contentHash: "b".repeat(64),
      },
      {
        entityType: "profile",
        entityId: "profile",
        version: 2,
        contentHash: "c".repeat(64),
      },
    ],
  });
}

function dependencies(
  overrides: Partial<CentralProductCatalogBatchDependencies> = {},
): CentralProductCatalogBatchDependencies {
  const data = baseline();
  const storage = new MemoryStorage();
  seedVersions(storage);
  return {
    getCurrentData: () => data,
    fallback: vi.fn((): ProductCatalogStructureResult => ({
      ok: true,
      data,
      productCount: 1,
      ruleMigrated: false,
    })),
    commitLocal: vi.fn(
      (
        _expected,
        transition,
      ): AppDataDurabilityResult<
        Extract<ProductCatalogStructureResult, { ok: true }>
      > => ({
        status: "applied",
        data: transition.data,
        value: transition.value,
        replayed: false,
      }),
    ),
    fetchStatus: vi.fn(async () => readyStatus()),
    mutateBatch: vi.fn(
      async (
        mutations: CentralBusinessBrowserBatchMutationInput[],
      ): Promise<CentralBusinessBrowserBatchMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1",
        operations: mutations.map((mutation, operationIndex) => ({
          operationIndex,
          status: "committed",
          eventId: `event-${operationIndex}`,
          eventSequence: operationIndex + 20,
          entityVersion: mutation.expectedVersion + 1,
          deleted: mutation.operationKind === "delete",
          contentHash: `${operationIndex + 1}`.repeat(64),
        })),
      }),
    ),
    storage,
    createId: () => "catalog-batch-atomic-0001",
    now: () => now,
    environment,
    ...overrides,
  };
}

const mergeFamilies = {
  type: "merge_families",
  sourceFamily: "Origen",
  targetFamily: "Destino",
} as const;

describe("central product catalog batch canary", () => {
  it("preserva el flujo local fuera del canario exacto", async () => {
    const deps = dependencies();
    const result = await applyProductCatalogBatchWithCentralCanary({
      userId: "persianas-user",
      operation: mergeFamilies,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "local" });
    expect(deps.fallback).toHaveBeenCalledOnce();
    expect(deps.fetchStatus).not.toHaveBeenCalled();
    expect(deps.commitLocal).not.toHaveBeenCalled();
  });

  it("confirma productos y perfil en el servidor antes del guardado local", async () => {
    const order: string[] = [];
    const deps = dependencies({
      commitLocal: vi.fn((_expected, transition) => {
        order.push("local");
        return {
          status: "applied" as const,
          data: transition.data,
          value: transition.value,
          replayed: false,
        };
      }),
      mutateBatch: vi.fn(
        async (mutations: CentralBusinessBrowserBatchMutationInput[]) => {
          order.push("server");
          return {
            ok: true as const,
            schema: "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1" as const,
            operations: mutations.map((mutation, operationIndex) => ({
              operationIndex,
              status: "committed" as const,
              eventId: `event-${operationIndex}`,
              eventSequence: operationIndex + 20,
              entityVersion: mutation.expectedVersion + 1,
              deleted: false,
              contentHash: `${operationIndex + 1}`.repeat(64),
            })),
          };
        },
      ),
    });

    const result = await applyProductCatalogBatchWithCentralCanary({
      userId,
      operation: mergeFamilies,
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      result: { productCount: 1, ruleMigrated: true },
    });
    expect(order).toEqual(["server", "local"]);
    expect(deps.mutateBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        entityType: "product",
        entityId: "product-source",
        expectedVersion: 3,
      }),
      expect.objectContaining({
        entityType: "profile",
        entityId: "profile",
        expectedVersion: 2,
      }),
    ]);
  });

  it("confirma la actualización y la baja de una fusión como un único lote", async () => {
    const deps = dependencies();

    const result = await applyProductCatalogBatchWithCentralCanary({
      userId,
      operation: {
        type: "merge_products",
        keepProductKey: "product source",
        removeProductKeys: ["product target"],
      },
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      result: { productCount: 1, ruleMigrated: false },
    });
    expect(deps.mutateBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        operationKind: "upsert",
        entityType: "product",
        entityId: "product-source",
        expectedVersion: 3,
      }),
      expect.objectContaining({
        operationKind: "delete",
        entityType: "product",
        entityId: "product-target",
        expectedVersion: 5,
        payload: null,
      }),
    ]);
    expect(deps.commitLocal).toHaveBeenCalledOnce();
  });

  it("no aplica nada si falta la versión central de una ficha afectada", async () => {
    const storage = new MemoryStorage();
    recordCentralBusinessEntityVersionCheckpoint({
      ownerScope: userId,
      storage,
      entities: [
        {
          entityType: "profile",
          entityId: "profile",
          version: 2,
          contentHash: "c".repeat(64),
        },
      ],
    });
    const deps = dependencies({ storage });

    const result = await applyProductCatalogBatchWithCentralCanary({
      userId,
      operation: mergeFamilies,
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("versión central"),
    });
    expect(deps.commitLocal).not.toHaveBeenCalled();
    expect(deps.mutateBatch).not.toHaveBeenCalled();
  });

  it("conserva el lote pendiente cuando la red central no responde", async () => {
    const deps = dependencies({
      fetchStatus: vi.fn(async () => ({
        ok: false as const,
        status: 0,
        code: "NETWORK",
        message: "Sin red",
      })),
    });

    const result = await applyProductCatalogBatchWithCentralCanary({
      userId,
      operation: mergeFamilies,
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("no se ha aplicado"),
    });
    expect(deps.commitLocal).not.toHaveBeenCalled();
    const queue = loadCentralBusinessDurableQueue(
      userId,
      deps.storage as CentralBusinessQueueStorage,
    );
    expect(queue.operations).toHaveLength(2);
    expect(
      new Set(queue.operations.map((operation) => operation.batchId)).size,
    ).toBe(1);
  });

  it("pide actualizar si el servidor confirma y el CAS local detecta una pestaña obsoleta", async () => {
    const deps = dependencies({
      commitLocal: vi.fn(
        (): AppDataDurabilityResult<
          Extract<ProductCatalogStructureResult, { ok: true }>
        > => ({
          status: "blocked",
          reason: "stale_precondition",
        }),
      ),
    });

    const result = await applyProductCatalogBatchWithCentralCanary({
      userId,
      operation: mergeFamilies,
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("servidor confirmó"),
    });
    expect(
      loadCentralBusinessDurableQueue(
        userId,
        deps.storage as CentralBusinessQueueStorage,
      ).operations,
    ).toEqual([]);
    expect(deps.mutateBatch).toHaveBeenCalledOnce();
    expect(deps.commitLocal).toHaveBeenCalledOnce();
  });

  it("mantiene ambos productos locales y muestra el conflicto si el lote central responde 409", async () => {
    const deps = dependencies({
      mutateBatch: vi.fn(
        async (): Promise<CentralBusinessBrowserBatchMutationResult> => ({
          ok: false,
          status: 409,
          code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
          message:
            "Una ficha del catálogo cambió en otro dispositivo. Actualiza y vuelve a intentarlo.",
          retryable: false,
          conflict: true,
        }),
      ),
    });

    const result = await applyProductCatalogBatchWithCentralCanary({
      userId,
      operation: {
        type: "merge_products",
        keepProductKey: "product source",
        removeProductKeys: ["product target"],
      },
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining(
        "Una ficha del catálogo cambió en otro dispositivo",
      ),
    });
    expect(result).toMatchObject({
      error: expect.stringContaining("No se ha aplicado ningún cambio local"),
    });
    expect(deps.commitLocal).not.toHaveBeenCalled();
    const queue = loadCentralBusinessDurableQueue(
      userId,
      deps.storage as CentralBusinessQueueStorage,
    );
    expect(queue.operations).toHaveLength(2);
    expect(
      queue.operations.every((operation) => operation.status === "conflict"),
    ).toBe(true);
  });
});
