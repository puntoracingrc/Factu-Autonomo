import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData } from "@/lib/types";

import {
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import { mutateCentralBusinessEntityWithCanary } from "./entity-mutation-canary";
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

const ownerScope = "synthetic-user-0001";
const entityId = "customer-synthetic-0001";
const now = "2026-07-29T20:30:00.000Z";

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
    ownerScope,
    operationId: "CENTRAL_CUSTOMER_CREATE:seed",
    mutation: {
      idempotencyKey: "CENTRAL_CUSTOMER_CREATE:seed",
      operationKind: "upsert",
      entityType: "customer",
      entityId,
      expectedVersion: 0,
      payload: { id: entityId },
    },
    storage,
    now: () => now,
  });
  await drainCentralBusinessDurableQueue({
    ownerScope,
    storage,
    mutate: async () => ({
      ok: true,
      schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
      status: "committed",
      eventId: "event-seed",
      eventSequence: 1,
      entityVersion: 1,
      deleted: false,
      contentHash: "hash-v1",
    }),
  });
}

function successSync() {
  return {
    ok: true as const,
    schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1" as const,
    pulled: 0,
    applied: 0,
    skipped: 0,
    nextSequence: 1,
    hasMore: false,
  };
}

describe("central business entity mutation canary", () => {
  it("explica un choque local entre dispositivos sin sugerir que se guardó", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      dependencies: {
        storage,
        getCurrentData: () => EMPTY_DATA,
        fallback: () => ({ ok: false, error: "not expected" }),
        prepareLocal: ({ data }) => ({
          ok: true,
          payload: { id: entityId, name: "Cambio local" },
          transition: { data, value: entityId },
        }),
        commitLocal: () => ({
          status: "blocked",
          reason: "stale_precondition",
        }),
        syncEventsBeforeWrite: async () => successSync(),
        fetchStatus: async () => readyStatus(),
      },
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Otro dispositivo cambió los datos mientras guardabas. No se ha sobrescrito nada. Revisa la información actual y vuelve a guardar para confirmar tu cambio.",
    });
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).operations,
    ).toEqual([]);
  });

  it("usa la versión confirmada y persiste local antes de confirmar el cambio", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);
    let current: AppData = EMPTY_DATA;
    const commitLocal = vi.fn(
      (
        expected: AppData,
        transition: { data: AppData; value: string },
      ): AppDataDurabilityResult<string> => {
        expect(
          loadCentralBusinessDurableQueue(ownerScope, storage).operations[0]
            .input.expectedVersion,
        ).toBe(1);
        expect(current).toBe(expected);
        current = transition.data;
        return {
          status: "applied",
          data: current,
          value: transition.value,
          replayed: false,
        };
      },
    );
    const mutate = vi.fn(
      async (): Promise<CentralBusinessBrowserMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-update",
        eventSequence: 2,
        entityVersion: 2,
        deleted: false,
        contentHash: "hash-v2",
      }),
    );

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      dependencies: {
        storage,
        getCurrentData: () => current,
        fallback: vi.fn(() => ({
          ok: true as const,
          value: "fallback",
          delivery: "local" as const,
        })),
        prepareLocal: ({ data }) => ({
          ok: true,
          payload: { id: entityId, name: "Actualizado" },
          transition: { data: { ...data, updatedAt: now }, value: "updated" },
        }),
        commitLocal,
        syncEventsBeforeWrite: async () => successSync(),
        fetchStatus: async () => readyStatus(),
        mutate,
        createId: () => "operation-synthetic-0001",
        now: () => now,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: "updated",
      delivery: "central_confirmed",
    });
    expect(commitLocal).toHaveBeenCalledOnce();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedVersion: 1,
        entityId,
        operationKind: "upsert",
      }),
    );
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).entityVersions[
        `customer:${entityId}`
      ],
    ).toMatchObject({ version: 2, deleted: false });
  });

  it("actualiza una ficha versionada aunque haya una revisión antigua de otra ficha", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);
    const oldEntityId = "customer-old-blocked-0001";
    let current: AppData = EMPTY_DATA;
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: "CENTRAL_CUSTOMER_UPDATE:old-blocked",
      mutation: {
        idempotencyKey: "CENTRAL_CUSTOMER_UPDATE:old-blocked",
        operationKind: "upsert",
        entityType: "customer",
        entityId: oldEntityId,
        expectedVersion: 1,
        payload: { id: oldEntityId, name: "Bloqueado antiguo" },
      },
      storage,
      now: () => now,
    });
    await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async () => ({
        ok: false,
        status: 409,
        code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
        message: "old blocked operation",
        retryable: false,
        conflict: true,
      }),
    });

    const mutate = vi.fn(
      async (): Promise<CentralBusinessBrowserMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-versioned-update-while-blocked",
        eventSequence: 12,
        entityVersion: 2,
        deleted: false,
        contentHash: "hash-v2",
      }),
    );

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      allowVersionedUpsertAfterBlockedPreflight: true,
      dependencies: {
        storage,
        getCurrentData: () => current,
        fallback: () => ({ ok: false, error: "not expected" }),
        prepareLocal: ({ data }) => ({
          ok: true,
          payload: { id: entityId, name: "Cliente editado" },
          transition: {
            data: { ...data, updatedAt: now },
            value: "updated",
          },
        }),
        commitLocal: (expected, transition) => {
          current = transition.data;
          return {
            status: "applied",
            data: expected,
            value: transition.value,
            replayed: false,
          };
        },
        syncEventsBeforeWrite: async () => ({
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "CENTRAL_BUSINESS_PENDING_REVIEW",
          message: "old queue needs review",
          retryable: false,
          nextSequence: 3,
        }),
        fetchStatus: async () => readyStatus(),
        mutate,
        createId: () => "operation-versioned-update-blocked",
        now: () => now,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: "updated",
      delivery: "central_confirmed",
    });
    expect(mutate).toHaveBeenCalledOnce();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId,
        expectedVersion: 1,
        operationKind: "upsert",
      }),
    );
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).operations,
    ).toEqual([
      expect.objectContaining({
        operationId: "CENTRAL_CUSTOMER_UPDATE:old-blocked",
        status: "conflict",
      }),
    ]);
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).entityVersions[
        `customer:${entityId}`
      ],
    ).toMatchObject({ version: 2, deleted: false });
  });

  it("actualiza una ficha versionada aunque el pre-pull vea baseline local ambiguo", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);
    let current: AppData = EMPTY_DATA;
    const mutate = vi.fn(
      async (): Promise<CentralBusinessBrowserMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-versioned-update-after-ambiguous-baseline",
        eventSequence: 13,
        entityVersion: 2,
        deleted: false,
        contentHash: "hash-v2",
      }),
    );

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      allowVersionedUpsertAfterBlockedPreflight: true,
      dependencies: {
        storage,
        getCurrentData: () => current,
        fallback: () => ({ ok: false, error: "not expected" }),
        prepareLocal: ({ data }) => ({
          ok: true,
          payload: { id: entityId, name: "Cliente editado" },
          transition: {
            data: { ...data, updatedAt: now },
            value: "updated",
          },
        }),
        commitLocal: (expected, transition) => {
          current = transition.data;
          return {
            status: "applied",
            data: current,
            value: transition.value,
            replayed: false,
          };
        },
        syncEventsBeforeWrite: async () => ({
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "CENTRAL_BUSINESS_APP_DATA_BASELINE_AMBIGUOUS",
          message:
            "La copia visible y la copia guardada no tienen un orden verificable.",
          retryable: false,
          nextSequence: 3,
        }),
        fetchStatus: async () => readyStatus(),
        mutate,
        createId: () => "operation-versioned-update-ambiguous-baseline",
        now: () => now,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: "updated",
      delivery: "central_confirmed",
    });
    expect(mutate).toHaveBeenCalledOnce();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId,
        expectedVersion: 1,
        operationKind: "upsert",
      }),
    );
  });

  it("no salta el pre-pull bloqueado de una ficha versionada sin permiso explicito", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);
    const commitLocal = vi.fn();

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      dependencies: {
        storage,
        getCurrentData: () => EMPTY_DATA,
        fallback: () => ({ ok: false, error: "not expected" }),
        prepareLocal: () => ({
          ok: true,
          payload: { id: entityId },
          transition: { data: EMPTY_DATA, value: "unsafe" },
        }),
        commitLocal,
        syncEventsBeforeWrite: async () => ({
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "CENTRAL_BUSINESS_PENDING_REVIEW",
          message: "old queue needs review",
          retryable: false,
          nextSequence: 3,
        }),
      },
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Hay cambios centrales que este dispositivo no pudo aplicar. Ve a Cuenta > Migración central y usa la copia del servidor en este dispositivo antes de modificar este cliente.",
    });
    expect(commitLocal).not.toHaveBeenCalled();
  });

  it("mantiene local una ficha antigua que no existe en el ledger central", async () => {
    const fallback = vi.fn(() => ({
      ok: true as const,
      value: "legacy",
      delivery: "local" as const,
    }));

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      dependencies: {
        storage: new MemoryStorage(),
        getCurrentData: () => EMPTY_DATA,
        fallback,
        prepareLocal: () => {
          throw new Error("not expected");
        },
        commitLocal: () => {
          throw new Error("not expected");
        },
        syncEventsBeforeWrite: async () => successSync(),
      },
    });

    expect(result).toEqual({
      ok: true,
      value: "legacy",
      delivery: "local",
    });
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("promociona una ficha local como alta central si ya recibió todo el servidor", async () => {
    const storage = new MemoryStorage();
    let current: AppData = EMPTY_DATA;
    const fallback = vi.fn(() => ({
      ok: true as const,
      value: "legacy",
      delivery: "local" as const,
    }));
    const mutate = vi.fn(
      async (): Promise<CentralBusinessBrowserMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-create-from-local",
        eventSequence: 1,
        entityVersion: 1,
        deleted: false,
        contentHash: "hash-v1",
      }),
    );

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      createMissingUpsertAfterFullSync: true,
      dependencies: {
        storage,
        getCurrentData: () => current,
        fallback,
        prepareLocal: ({ data }) => ({
          ok: true,
          payload: { id: entityId, name: "Cliente local revisado" },
          transition: {
            data: { ...data, updatedAt: now },
            value: "promoted",
          },
        }),
        commitLocal: (expected, transition) => {
          current = transition.data;
          expect(expected).toBe(EMPTY_DATA);
          return {
            status: "applied",
            data: current,
            value: transition.value,
            replayed: false,
          };
        },
        syncEventsBeforeWrite: async () => successSync(),
        fetchStatus: async () => readyStatus(),
        mutate,
        createId: () => "operation-promote-local",
        now: () => now,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: "promoted",
      delivery: "central_confirmed",
    });
    expect(fallback).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId,
        expectedVersion: 0,
        operationKind: "upsert",
      }),
    );
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).entityVersions[
        `customer:${entityId}`
      ],
    ).toMatchObject({ version: 1, deleted: false });
  });

  it("promociona una ficha local aunque haya una revisión antigua de otra ficha", async () => {
    const storage = new MemoryStorage();
    const oldEntityId = "customer-old-blocked-0001";
    let current: AppData = EMPTY_DATA;
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: "CENTRAL_CUSTOMER_UPDATE:old-blocked",
      mutation: {
        idempotencyKey: "CENTRAL_CUSTOMER_UPDATE:old-blocked",
        operationKind: "upsert",
        entityType: "customer",
        entityId: oldEntityId,
        expectedVersion: 1,
        payload: { id: oldEntityId, name: "Bloqueado antiguo" },
      },
      storage,
      now: () => now,
    });
    await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async () => ({
        ok: false,
        status: 409,
        code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
        message: "old blocked operation",
        retryable: false,
        conflict: true,
      }),
    });
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).operations[0],
    ).toMatchObject({
      operationId: "CENTRAL_CUSTOMER_UPDATE:old-blocked",
      status: "conflict",
    });

    const mutate = vi.fn(
      async (): Promise<CentralBusinessBrowserMutationResult> => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-promoted-while-blocked",
        eventSequence: 12,
        entityVersion: 1,
        deleted: false,
        contentHash: "hash-promoted",
      }),
    );

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      createMissingUpsertAfterFullSync: true,
      dependencies: {
        storage,
        getCurrentData: () => current,
        fallback: () => ({ ok: false, error: "not expected" }),
        prepareLocal: ({ data }) => ({
          ok: true,
          payload: { id: entityId, name: "Cliente local promocionado" },
          transition: {
            data: { ...data, updatedAt: now },
            value: "promoted",
          },
        }),
        commitLocal: (expected, transition) => {
          current = transition.data;
          return {
            status: "applied",
            data: expected,
            value: transition.value,
            replayed: false,
          };
        },
        syncEventsBeforeWrite: async () => ({
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "CENTRAL_BUSINESS_PENDING_REVIEW",
          message: "old queue needs review",
          retryable: false,
          nextSequence: 3,
        }),
        fetchStatus: async () => readyStatus(),
        mutate,
        createId: () => "operation-promote-local-blocked",
        now: () => now,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: "promoted",
      delivery: "central_confirmed",
    });
    expect(mutate).toHaveBeenCalledOnce();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId,
        expectedVersion: 0,
        operationKind: "upsert",
      }),
    );
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).operations,
    ).toEqual([
      expect.objectContaining({
        operationId: "CENTRAL_CUSTOMER_UPDATE:old-blocked",
        status: "conflict",
      }),
    ]);
  });

  it("no promociona una ficha local si el pre-pull falla por integridad", async () => {
    const fallback = vi.fn(() => ({
      ok: true as const,
      value: "legacy",
      delivery: "local" as const,
    }));
    const commitLocal = vi.fn();

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      createMissingUpsertAfterFullSync: true,
      dependencies: {
        storage: new MemoryStorage(),
        getCurrentData: () => EMPTY_DATA,
        fallback,
        prepareLocal: () => ({
          ok: true,
          payload: { id: entityId },
          transition: { data: EMPTY_DATA, value: "unsafe" },
        }),
        commitLocal,
        syncEventsBeforeWrite: async () => ({
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "CENTRAL_BUSINESS_EVENT_HASH_MISMATCH",
          message: "hash mismatch",
          retryable: false,
          nextSequence: 1,
        }),
      },
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Hay cambios centrales que este dispositivo no pudo aplicar. Ve a Cuenta > Migración central y usa la copia del servidor en este dispositivo antes de modificar este cliente.",
    });
    expect(fallback).not.toHaveBeenCalled();
    expect(commitLocal).not.toHaveBeenCalled();
  });

  it("espera a terminar de recibir antes de promocionar una ficha local", async () => {
    const fallback = vi.fn(() => ({
      ok: true as const,
      value: "legacy",
      delivery: "local" as const,
    }));

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      createMissingUpsertAfterFullSync: true,
      dependencies: {
        storage: new MemoryStorage(),
        getCurrentData: () => EMPTY_DATA,
        fallback,
        prepareLocal: () => {
          throw new Error("not expected");
        },
        commitLocal: () => {
          throw new Error("not expected");
        },
        syncEventsBeforeWrite: async () => ({
          ...successSync(),
          hasMore: true,
        }),
      },
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Quedan cambios centrales por recibir. Espera a que termine la sincronización y vuelve a guardar esta ficha.",
    });
    expect(fallback).not.toHaveBeenCalled();
  });

  it("conserva en cola un cambio conocido cuando la red está caída", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "delete",
      operationIdPrefix: "CENTRAL_CUSTOMER_DELETE",
      entityLabel: "este cliente",
      dependencies: {
        storage,
        getCurrentData: () => EMPTY_DATA,
        fallback: () => ({ ok: false, error: "not expected" }),
        prepareLocal: ({ data }) => ({
          ok: true,
          payload: null,
          transition: { data, value: entityId },
        }),
        commitLocal: (expected, transition) => ({
          status: "applied",
          data: expected,
          value: transition.value,
          replayed: false,
        }),
        syncEventsBeforeWrite: async () => ({
          ok: false,
          schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
          code: "NETWORK",
          message: "offline",
          retryable: true,
          nextSequence: 1,
        }),
        fetchStatus: async () => ({
          ok: false,
          status: 0,
          code: "NETWORK",
          message: "offline",
        }),
        createId: () => "operation-synthetic-0002",
        now: () => now,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: entityId,
      delivery: "central_pending",
    });
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).operations,
    ).toEqual([
      expect.objectContaining({
        status: "pending",
        input: expect.objectContaining({
          operationKind: "delete",
          expectedVersion: 1,
          payload: null,
        }),
      }),
    ]);
  });

  it("no encadena dos cambios locales sobre la misma versión pendiente", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: "CENTRAL_CUSTOMER_UPDATE:pending",
      mutation: {
        idempotencyKey: "CENTRAL_CUSTOMER_UPDATE:pending",
        operationKind: "upsert",
        entityType: "customer",
        entityId,
        expectedVersion: 1,
        payload: { id: entityId, name: "Pendiente" },
      },
      storage,
      now: () => now,
    });
    const commitLocal = vi.fn();

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      dependencies: {
        storage,
        getCurrentData: () => EMPTY_DATA,
        fallback: () => ({ ok: false, error: "not expected" }),
        prepareLocal: ({ data }) => ({
          ok: true,
          payload: { id: entityId },
          transition: { data, value: entityId },
        }),
        commitLocal,
        syncEventsBeforeWrite: async () => successSync(),
        fetchStatus: async () => readyStatus(),
      },
    });

    expect(result).toMatchObject({ ok: false });
    expect(commitLocal).not.toHaveBeenCalled();
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).operations,
    ).toHaveLength(1);
  });

  it("no adopta silenciosamente una versión recibida mientras preparaba el cambio", async () => {
    const storage = new MemoryStorage();
    await seedVersion(storage);
    const commitLocal = vi.fn();

    const result = await mutateCentralBusinessEntityWithCanary({
      enabled: true,
      userId: ownerScope,
      entityType: "customer",
      entityId,
      operationKind: "upsert",
      operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
      entityLabel: "este cliente",
      dependencies: {
        storage,
        getCurrentData: () => EMPTY_DATA,
        fallback: () => ({ ok: false, error: "not expected" }),
        prepareLocal: ({ data }) => ({
          ok: true,
          payload: { id: entityId },
          transition: { data, value: entityId },
        }),
        commitLocal,
        syncEventsBeforeWrite: async () => successSync(),
        fetchStatus: async () => {
          enqueueCentralBusinessOperation({
            ownerScope,
            operationId: "CENTRAL_CUSTOMER_UPDATE:remote-race",
            mutation: {
              idempotencyKey: "CENTRAL_CUSTOMER_UPDATE:remote-race",
              operationKind: "upsert",
              entityType: "customer",
              entityId,
              expectedVersion: 1,
              payload: { id: entityId, name: "Versión intermedia" },
            },
            storage,
            now: () => now,
          });
          await drainCentralBusinessDurableQueue({
            ownerScope,
            storage,
            mutate: async () => ({
              ok: true,
              schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
              status: "committed",
              eventId: "event-race",
              eventSequence: 2,
              entityVersion: 2,
              deleted: false,
              contentHash: "hash-race-v2",
            }),
          });
          return readyStatus();
        },
      },
    });

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("versión nueva"),
    });
    expect(commitLocal).not.toHaveBeenCalled();
    expect(
      loadCentralBusinessDurableQueue(ownerScope, storage).entityVersions[
        `customer:${entityId}`
      ],
    ).toMatchObject({ version: 2 });
  });
});
