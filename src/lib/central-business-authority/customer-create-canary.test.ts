import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { createCustomerInCollection } from "@/lib/customers";
import { EMPTY_DATA, type AppData, type Customer } from "@/lib/types";

import {
  createCustomerWithCentralCanary,
  isCentralCustomerCreateCanaryEnabledForUser,
  type CentralCustomerCreateCanaryDependencies,
} from "./customer-create-canary";
import {
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
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
const customerId = "customer-synthetic-0001";
const now = "2026-07-29T20:00:00.000Z";
const environment = { enabled: "true", userIds: userId };
const draft = {
  customerType: "person" as const,
  firstName: "Canario",
  lastName: "Sintetico",
  name: "Canario Sintetico",
};

function appData(): AppData {
  return { ...EMPTY_DATA, customers: [] };
}

function readyStatus(): Extract<
  CentralBusinessAuthorityStatusResult,
  { ok: true }
> {
  return {
    ok: true as const,
    schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_CLIENT_V1" as const,
    activation: {
      requestedMode: "canary" as const,
      effectiveMode: "canary" as const,
      enabled: true,
      writesEnabled: true,
      appliesToUser: true,
      production: true,
      reason: "canary_allowlist",
    },
    readiness: {
      schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS_V1" as const,
      checkedAt: now,
      ready: true,
      checks: [],
      blockers: [],
    },
    summary: {
      writesPossible: true,
      modeAllowsWrites: true,
      serverSchemaReady: true,
      deviceVerified: true as const,
    },
  };
}

function appliedCustomer(
  baseline: AppData,
  id: string,
  createdAt: string,
): AppDataDurabilityResult<Customer> {
  const write = createCustomerInCollection(
    baseline.customers,
    draft,
    id,
    createdAt,
  );
  if (!write.ok) throw new Error(write.error);
  return {
    status: "applied",
    data: { ...baseline, customers: write.customers },
    value: write.customer,
    replayed: false,
  };
}

function dependencies(
  overrides: Partial<CentralCustomerCreateCanaryDependencies> = {},
): CentralCustomerCreateCanaryDependencies {
  const baseline = appData();
  return {
    getCurrentData: () => baseline,
    addCustomerFallback: vi.fn(() => {
      const result = createCustomerInCollection(
        baseline.customers,
        draft,
        "fallback-customer",
        now,
      );
      if (!result.ok) return result;
      return { ok: true as const, customer: result.customer };
    }),
    addCustomerDurably: vi.fn((_draft, identity, expected) =>
      appliedCustomer(expected, identity.id, identity.now),
    ),
    fetchStatus: vi.fn(async () => readyStatus()),
    mutate: vi.fn(
      async (): Promise<CentralBusinessBrowserMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-synthetic-0001",
        eventSequence: 1,
        entityVersion: 1,
        deleted: false,
        contentHash: "hash-synthetic-0001",
      }),
    ),
    storage: new MemoryStorage(),
    createId: () => customerId,
    now: () => now,
    environment,
    ...overrides,
  };
}

describe("central customer create canary", () => {
  it("solo incluye usuarios explicitamente permitidos", () => {
    expect(
      isCentralCustomerCreateCanaryEnabledForUser(userId, environment),
    ).toBe(true);
    expect(
      isCentralCustomerCreateCanaryEnabledForUser("persianas-user", environment),
    ).toBe(false);
    expect(
      isCentralCustomerCreateCanaryEnabledForUser(userId, {
        enabled: "false",
        userIds: userId,
      }),
    ).toBe(false);
  });

  it("mantiene intacto el guardado local fuera del canario", async () => {
    const deps = dependencies();
    const result = await createCustomerWithCentralCanary({
      userId: "persianas-user",
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "local" });
    expect(deps.addCustomerFallback).toHaveBeenCalledOnce();
    expect(deps.fetchStatus).not.toHaveBeenCalled();
    expect(deps.addCustomerDurably).not.toHaveBeenCalled();
  });

  it("relee la cola antes del commit local y confirma en servidor", async () => {
    const storage = new MemoryStorage();
    const addCustomerDurably = vi.fn(
      (_draft, identity, expected): AppDataDurabilityResult<Customer> => {
        expect(
          loadCentralBusinessDurableQueue(userId, storage).operations,
        ).toEqual([
          expect.objectContaining({
            operationId: `CENTRAL_CUSTOMER_CREATE:${customerId}`,
            status: "pending",
          }),
        ]);
        return appliedCustomer(expected, identity.id, identity.now);
      },
    );
    const deps = dependencies({ storage, addCustomerDurably });

    const result = await createCustomerWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      customer: { id: customerId, firstName: "Canario" },
    });
    expect(loadCentralBusinessDurableQueue(userId, storage)).toMatchObject({
      operations: [],
      lastAppliedEventSequence: 0,
      entityVersions: {
        [`customer:${customerId}`]: { version: 1, deleted: false },
      },
    });
  });

  it("guarda local y conserva la operacion si la red no responde", async () => {
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

    const result = await createCustomerWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "central_pending" });
    expect(deps.mutate).not.toHaveBeenCalled();
    expect(loadCentralBusinessDurableQueue(userId, storage).operations).toHaveLength(
      1,
    );
  });

  it("no congela el formulario si el preflight queda colgado", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      fetchStatus: vi.fn(
        () => new Promise<CentralBusinessAuthorityStatusResult>(() => {}),
      ),
      statusTimeoutMs: 1,
    });

    const result = await createCustomerWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: true, delivery: "central_pending" });
    expect(loadCentralBusinessDurableQueue(userId, storage).operations).toHaveLength(
      1,
    );
  });

  it("falla cerrado si el servidor responde que el canario no esta listo", async () => {
    const status = readyStatus();
    status.summary.writesPossible = false;
    status.readiness.ready = false;
    status.readiness.blockers = ["MUTATIONS_NOT_READY"];
    const deps = dependencies({
      fetchStatus: vi.fn(async () => status),
    });

    const result = await createCustomerWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "El servidor central todavía no está preparado para guardar clientes en esta cuenta.",
    });
    expect(deps.addCustomerDurably).not.toHaveBeenCalled();
  });

  it("retira la operacion si el commit local queda bloqueado", async () => {
    const storage = new MemoryStorage();
    const deps = dependencies({
      storage,
      addCustomerDurably: vi.fn(
        (): AppDataDurabilityResult<Customer> => ({
          status: "blocked",
          reason: "stale_precondition",
        }),
      ),
    });

    const result = await createCustomerWithCentralCanary({
      userId,
      draft,
      dependencies: deps,
    });

    expect(result).toMatchObject({ ok: false });
    expect(loadCentralBusinessDurableQueue(userId, storage).operations).toEqual(
      [],
    );
    expect(deps.mutate).not.toHaveBeenCalled();
  });
});
