import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData, type Supplier } from "@/lib/types";

import {
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import {
  createSupplierWithCentralCanary,
  isCentralSupplierCreateCanaryEnabledForUser,
  type CentralSupplierCreateCanaryDependencies,
} from "./supplier-create-canary";
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
const supplierId = "supplier-synthetic-0001";
const now = "2026-07-29T22:00:00.000Z";
const environment = { enabled: "true", userIds: userId };
const draft = {
  name: "Proveedor central sintetico",
  nif: "B00000000",
  email: "proveedor@example.com",
};

function appData(): AppData {
  return { ...EMPTY_DATA, suppliers: [] };
}

function supplier(id = supplierId): Supplier {
  return { ...draft, id, createdAt: now };
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
  overrides: Partial<CentralSupplierCreateCanaryDependencies> = {},
): CentralSupplierCreateCanaryDependencies {
  const baseline = appData();
  return {
    getCurrentData: () => baseline,
    addSupplierFallback: vi.fn(() => supplier("fallback-supplier")),
    addSupplierDurably: vi.fn(
      (_draft, identity, expected): AppDataDurabilityResult<Supplier> => {
        const created = { ...draft, id: identity.id, createdAt: identity.now };
        return {
          status: "applied",
          data: { ...expected, suppliers: [...expected.suppliers, created] },
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
      eventId: "event-supplier-0001",
      eventSequence: 14,
      entityVersion: 1,
      deleted: false,
      contentHash: "hash-supplier-0001",
    })),
    storage: new MemoryStorage(),
    createId: () => supplierId,
    now: () => now,
    environment,
    ...overrides,
  };
}

describe("central supplier create canary", () => {
  it("solo incluye usuarios explicitamente permitidos", () => {
    expect(
      isCentralSupplierCreateCanaryEnabledForUser(userId, environment),
    ).toBe(true);
    expect(
      isCentralSupplierCreateCanaryEnabledForUser(
        "persianas-user",
        environment,
      ),
    ).toBe(false);
  });

  it("mantiene el alta local fuera del canario", async () => {
    const deps = dependencies();
    const result = await createSupplierWithCentralCanary({
      userId: "persianas-user",
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "local" });
    expect(deps.addSupplierFallback).toHaveBeenCalledOnce();
    expect(deps.addSupplierDurably).not.toHaveBeenCalled();
  });

  it("conserva el comando antes del commit local y confirma la version", async () => {
    const storage = new MemoryStorage();
    let queuedBeforeLocal = false;
    const deps = dependencies({
      storage,
      addSupplierDurably: vi.fn(
        (_draft, identity, expected): AppDataDurabilityResult<Supplier> => {
          queuedBeforeLocal =
            loadCentralBusinessDurableQueue(userId, storage).operations
              .length === 1;
          const created = {
            ...draft,
            id: identity.id,
            createdAt: identity.now,
          };
          return {
            status: "applied",
            data: { ...expected, suppliers: [created] },
            value: created,
            replayed: false,
          };
        },
      ),
    });

    const result = await createSupplierWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(queuedBeforeLocal).toBe(true);
    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      supplier: { id: supplierId },
    });
    expect(loadCentralBusinessDurableQueue(userId, storage)).toMatchObject({
      operations: [],
      entityVersions: {
        [`supplier:${supplierId}`]: { version: 1, deleted: false },
      },
    });
  });

  it("guarda offline con la operacion pendiente", async () => {
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

    const result = await createSupplierWithCentralCanary({
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
});
