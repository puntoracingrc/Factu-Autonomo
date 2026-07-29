import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { normalizeProductCatalogItem } from "@/lib/purchase-products";
import { EMPTY_DATA, type AppData, type Product } from "@/lib/types";

import {
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import {
  createProductWithCentralCanary,
  isCentralProductCreateCanaryEnabledForUser,
  type CentralProductCreateCanaryDependencies,
} from "./product-create-canary";
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
const productId = "product-synthetic-0001";
const now = "2026-07-29T20:00:00.000Z";
const environment = { enabled: "true", userIds: userId };
const draft = {
  key: "producto central sintetico",
  aliases: [],
  name: "Producto central sintetico",
  family: "Pruebas",
  unit: "ud",
  sales: {
    enabled: true as const,
    unit: "ud",
    unitPrice: 12.5,
    ivaPercent: 21,
  },
  source: "manual" as const,
};

function appData(): AppData {
  return { ...EMPTY_DATA, products: [] };
}

function product(id = productId, createdAt = now): Product {
  return normalizeProductCatalogItem({
    ...draft,
    id,
    createdAt,
    updatedAt: createdAt,
  });
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

function dependencies(
  overrides: Partial<CentralProductCreateCanaryDependencies> = {},
): CentralProductCreateCanaryDependencies {
  const baseline = appData();
  return {
    getCurrentData: () => baseline,
    addProductFallback: vi.fn(() => product("fallback-product")),
    addProductDurably: vi.fn(
      (_draft, identity, expected): AppDataDurabilityResult<Product> => {
        const created = product(identity.id, identity.now);
        return {
          status: "applied",
          data: { ...expected, products: [...expected.products, created] },
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
      eventId: "event-product-0001",
      eventSequence: 2,
      entityVersion: 1,
      deleted: false,
      contentHash: "hash-product-0001",
    })),
    storage: new MemoryStorage(),
    createId: () => productId,
    now: () => now,
    environment,
    ...overrides,
  };
}

describe("central product create canary", () => {
  it("solo incluye usuarios explicitamente permitidos", () => {
    expect(
      isCentralProductCreateCanaryEnabledForUser(userId, environment),
    ).toBe(true);
    expect(
      isCentralProductCreateCanaryEnabledForUser("persianas-user", environment),
    ).toBe(false);
  });

  it("mantiene el alta local fuera del canario", async () => {
    const deps = dependencies();
    const result = await createProductWithCentralCanary({
      userId: "persianas-user",
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "local" });
    expect(deps.addProductFallback).toHaveBeenCalledOnce();
    expect(deps.fetchStatus).not.toHaveBeenCalled();
    expect(deps.addProductDurably).not.toHaveBeenCalled();
  });

  it("persiste antes del commit local y confirma el producto central", async () => {
    const storage = new MemoryStorage();
    let queuedBeforeLocalCommit:
      | ReturnType<typeof loadCentralBusinessDurableQueue>["operations"]
      | undefined;
    const addProductDurably = vi.fn(
      (_draft, identity, expected): AppDataDurabilityResult<Product> => {
        queuedBeforeLocalCommit = loadCentralBusinessDurableQueue(
          userId,
          storage,
        ).operations;
        const created = product(identity.id, identity.now);
        return {
          status: "applied",
          data: { ...expected, products: [created] },
          value: created,
          replayed: false,
        };
      },
    );
    const deps = dependencies({ storage, addProductDurably });

    const result = await createProductWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    if (!result.ok) throw new Error(result.error);
    expect(queuedBeforeLocalCommit).toEqual([
      expect.objectContaining({
        operationId: `CENTRAL_PRODUCT_CREATE:${productId}`,
        status: "pending",
        input: expect.objectContaining({
          entityType: "product",
          expectedVersion: 0,
        }),
      }),
    ]);
    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      product: { id: productId, name: draft.name },
    });
    expect(loadCentralBusinessDurableQueue(userId, storage)).toMatchObject({
      operations: [],
      lastAppliedEventSequence: 0,
      entityVersions: {
        [`product:${productId}`]: { version: 1, deleted: false },
      },
    });
  });

  it("guarda offline solo despues de conservar la operacion", async () => {
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

    const result = await createProductWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "central_pending" });
    expect(deps.mutate).not.toHaveBeenCalled();
    expect(
      loadCentralBusinessDurableQueue(userId, storage).operations,
    ).toHaveLength(1);
  });

  it("falla cerrado y no guarda si el servidor rechaza el canario", async () => {
    const status = readyStatus();
    status.summary.writesPossible = false;
    const deps = dependencies({ fetchStatus: vi.fn(async () => status) });

    const result = await createProductWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: false });
    expect(deps.addProductDurably).not.toHaveBeenCalled();
  });
});
