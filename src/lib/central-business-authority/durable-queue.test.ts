import { describe, expect, it, vi } from "vitest";

import type { CentralBusinessBrowserEvent } from "./events-client";
import type { CentralBusinessBrowserBatchMutationInput } from "./batch-mutation-client";
import {
  applyCentralBusinessEventPage,
  CentralBusinessDurableQueueError,
  discardCentralBusinessOperation,
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessBatch,
  enqueueCentralBusinessOperation,
  finalizeCentralBusinessEntityServerResolution,
  loadCentralBusinessDurableQueue,
  prepareCentralBusinessEntityServerResolution,
  recordCentralBusinessEntityVersionCheckpoint,
  retryCentralBusinessOperation,
  type CentralBusinessQueueStorage,
  withCentralBusinessQueueLock,
} from "./durable-queue";

class MemoryStorage implements CentralBusinessQueueStorage {
  value = new Map<string, string>();
  failWrite = false;
  corruptReadback = false;

  getItem(key: string) {
    const value = this.value.get(key) ?? null;
    return this.corruptReadback && value ? `${value}corrupt` : value;
  }

  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error("quota");
    this.value.set(key, value);
  }
}

const ownerScope = "synthetic-user-0001";
const mutation = {
  idempotencyKey: "CENTRAL_OP_SYNTHETIC_0001",
  operationKind: "upsert" as const,
  entityType: "customer" as const,
  entityId: "customer-1",
  expectedVersion: 0,
  payload: { id: "customer-1", name: "Synthetic" },
};
const batchMutations: CentralBusinessBrowserBatchMutationInput[] = [
  {
    ...mutation,
    idempotencyKey: "CENTRAL_BATCH_SUPPLIER_0001",
    entityType: "supplier" as const,
    entityId: "supplier-1",
    payload: { id: "supplier-1", name: "Synthetic Supplier" },
  },
  {
    ...mutation,
    idempotencyKey: "CENTRAL_BATCH_EXPENSE_0001",
    entityType: "expense" as const,
    entityId: "expense-1",
    payload: { id: "expense-1", description: "Synthetic Expense" },
  },
];

function event(
  overrides: Partial<CentralBusinessBrowserEvent> = {},
): CentralBusinessBrowserEvent {
  return {
    schema: "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1",
    eventId: "event-1",
    eventSequence: 1,
    entityType: "customer",
    entityId: "customer-1",
    entityVersion: 1,
    operationKind: "upsert",
    payload: { id: "customer-1", name: "Synthetic" },
    contentHash: "hash-v1",
    actorDeviceId: "device-a",
    createdAt: "2026-07-29T17:00:00.000Z",
    ...overrides,
  };
}

describe("central business durable queue", () => {
  it("ancla versiones verificadas sin adelantar el cursor de eventos", () => {
    const storage = new MemoryStorage();
    const result = recordCentralBusinessEntityVersionCheckpoint({
      ownerScope,
      entities: [
        {
          entityType: "customer",
          entityId: "customer-1",
          version: 3,
          contentHash: "a".repeat(64),
        },
      ],
      storage,
    });

    expect(result.lastAppliedEventSequence).toBe(0);
    expect(result.entityVersions["customer:customer-1"]).toEqual({
      entityType: "customer",
      entityId: "customer-1",
      version: 3,
      deleted: false,
      contentHash: "a".repeat(64),
    });
  });

  it("no ancla un bootstrap sobre operaciones pendientes", () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
    });

    expect(() =>
      recordCentralBusinessEntityVersionCheckpoint({
        ownerScope,
        entities: [
          {
            entityType: "customer",
            entityId: "customer-1",
            version: 1,
            contentHash: "a".repeat(64),
          },
        ],
        storage,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CentralBusinessDurableQueueError>>({
        code: "LOCAL_OPERATION_CONFLICT",
      }),
    );
  });

  it("persiste y relee la operacion antes de permitir el cambio local", () => {
    const storage = new MemoryStorage();
    const result = enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
      now: () => "2026-07-29T17:00:00.000Z",
    });

    expect(result.replayed).toBe(false);
    expect(result.state.revision).toBe(1);
    expect(loadCentralBusinessDurableQueue(ownerScope, storage).operations).toEqual([
      expect.objectContaining({
        operationId: mutation.idempotencyKey,
        status: "pending",
        attemptCount: 0,
      }),
    ]);
  });

  it("repite la misma identidad sin duplicar y rechaza reutilizarla", () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
    });
    expect(
      enqueueCentralBusinessOperation({
        ownerScope,
        operationId: mutation.idempotencyKey,
        mutation: { ...mutation, payload: { name: "Synthetic", id: "customer-1" } },
        storage,
      }).replayed,
    ).toBe(true);
    expect(() =>
      enqueueCentralBusinessOperation({
        ownerScope,
        operationId: mutation.idempotencyKey,
        mutation: { ...mutation, payload: { id: "customer-1", name: "Other" } },
        storage,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CentralBusinessDurableQueueError>>({
        code: "IDEMPOTENCY_KEY_REUSED",
      }),
    );
  });

  it("falla cerrado si localStorage no escribe o no conserva el valor exacto", () => {
    const storage = new MemoryStorage();
    storage.failWrite = true;
    expect(() =>
      enqueueCentralBusinessOperation({
        ownerScope,
        operationId: mutation.idempotencyKey,
        mutation,
        storage,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CentralBusinessDurableQueueError>>({
        code: "STORAGE_WRITE_FAILED",
      }),
    );

    storage.failWrite = false;
    storage.corruptReadback = true;
    expect(() =>
      enqueueCentralBusinessOperation({
        ownerScope,
        operationId: mutation.idempotencyKey,
        mutation,
        storage,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CentralBusinessDurableQueueError>>({
        code: "STORAGE_WRITE_FAILED",
      }),
    );
  });

  it("drena FIFO y conserva versiones sin adelantar el cursor de eventos", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
    });
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: "CENTRAL_OP_SYNTHETIC_0002",
      mutation: {
        ...mutation,
        idempotencyKey: "CENTRAL_OP_SYNTHETIC_0002",
        entityId: "customer-2",
      },
      storage,
    });
    const mutate = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-10",
        eventSequence: 10,
        entityVersion: 1,
        deleted: false,
        contentHash: "hash-1",
      })
      .mockResolvedValueOnce({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-12",
        eventSequence: 12,
        entityVersion: 1,
        deleted: false,
        contentHash: "hash-2",
      });

    const result = await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate,
    });

    expect(mutate.mock.calls.map(([input]) => input.entityId)).toEqual([
      "customer-1",
      "customer-2",
    ]);
    expect(result).toMatchObject({
      processed: 2,
      remaining: 0,
      stoppedBy: "empty",
      state: { lastAppliedEventSequence: 0 },
    });
    expect(result.state.entityVersions["customer:customer-2"]?.version).toBe(1);
  });

  it("persiste y confirma un lote como una sola unidad", async () => {
    const storage = new MemoryStorage();
    const enqueued = enqueueCentralBusinessBatch({
      ownerScope,
      batchId: "CENTRAL_BATCH_SYNTHETIC_0001",
      mutations: batchMutations,
      storage,
      now: () => "2026-07-29T17:00:00.000Z",
    });
    expect(enqueued).toMatchObject({
      replayed: false,
      state: {
        revision: 1,
        operations: [
          { batchIndex: 0, batchSize: 2, status: "pending" },
          { batchIndex: 1, batchSize: 2, status: "pending" },
        ],
      },
    });

    const mutate = vi.fn();
    const mutateBatch = vi.fn(async () => ({
      ok: true as const,
      schema: "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1" as const,
      operations: [
        {
          operationIndex: 0,
          status: "committed" as const,
          eventId: "event-batch-1",
          eventSequence: 11,
          entityVersion: 1,
          deleted: false,
          contentHash: "hash-supplier",
        },
        {
          operationIndex: 1,
          status: "committed" as const,
          eventId: "event-batch-2",
          eventSequence: 12,
          entityVersion: 1,
          deleted: false,
          contentHash: "hash-expense",
        },
      ],
    }));
    const drained = await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate,
      mutateBatch,
    });

    expect(mutate).not.toHaveBeenCalled();
    expect(mutateBatch).toHaveBeenCalledWith(batchMutations);
    expect(drained).toMatchObject({
      processed: 2,
      remaining: 0,
      stoppedBy: "empty",
      state: {
        operations: [],
        entityVersions: {
          "supplier:supplier-1": {
            version: 1,
            contentHash: "hash-supplier",
          },
          "expense:expense-1": {
            version: 1,
            contentHash: "hash-expense",
          },
        },
      },
    });
  });

  it("reintenta, bloquea y descarta siempre el lote completo", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessBatch({
      ownerScope,
      batchId: "CENTRAL_BATCH_SYNTHETIC_0002",
      mutations: batchMutations,
      storage,
    });
    const drained = await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: vi.fn(),
      mutateBatch: async () => ({
        ok: false,
        status: 0,
        code: "CENTRAL_BUSINESS_BATCH_NETWORK_ERROR",
        message: "offline",
        retryable: true,
        conflict: false,
      }),
    });
    expect(drained.state.operations).toEqual([
      expect.objectContaining({ status: "pending", attemptCount: 1 }),
      expect.objectContaining({ status: "pending", attemptCount: 1 }),
    ]);

    const retried = retryCentralBusinessOperation({
      ownerScope,
      operationId: batchMutations[1].idempotencyKey,
      storage,
    });
    expect(retried.operations.every((operation) => operation.status === "pending"))
      .toBe(true);
    const discarded = discardCentralBusinessOperation({
      ownerScope,
      operationId: batchMutations[0].idempotencyKey,
      storage,
    });
    expect(discarded.operations).toEqual([]);
  });

  it("marca todo el lote si un evento remoto toca una de sus fichas", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessBatch({
      ownerScope,
      batchId: "CENTRAL_BATCH_SYNTHETIC_0003",
      mutations: batchMutations,
      storage,
    });
    const result = await applyCentralBusinessEventPage({
      ownerScope,
      events: [
        event({
          entityType: "supplier",
          entityId: "supplier-1",
        }),
      ],
      nextSequence: 1,
      storage,
      applyEvent: vi.fn(),
    });

    expect(result).toMatchObject({
      ok: false,
      code: "LOCAL_OPERATION_CONFLICT",
      state: {
        operations: [{ status: "conflict" }, { status: "conflict" }],
      },
    });
    expect(() =>
      prepareCentralBusinessEntityServerResolution({
        ownerScope,
        entityType: "supplier",
        entityId: "supplier-1",
        storage,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CentralBusinessDurableQueueError>>({
        code: "INVALID_OPERATION",
      }),
    );
  });

  it("conserva un fallo reintentable y detiene los siguientes", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
    });
    const result = await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async () => ({
        ok: false,
        status: 0,
        code: "CENTRAL_BUSINESS_MUTATION_NETWORK_ERROR",
        message: "offline",
        retryable: true,
        conflict: false,
      }),
      now: () => "2026-07-29T17:01:00.000Z",
    });

    expect(result).toMatchObject({
      processed: 0,
      remaining: 1,
      stoppedBy: "retryable",
      state: {
        operations: [
          {
            status: "pending",
            attemptCount: 1,
            lastAttemptAt: "2026-07-29T17:01:00.000Z",
          },
        ],
      },
    });
  });

  it("retiene conflictos hasta una decision explicita", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
    });
    const result = await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async () => ({
        ok: false,
        status: 409,
        code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
        message: "stale",
        retryable: false,
        conflict: true,
      }),
    });
    expect(result.stoppedBy).toBe("conflict");
    expect(
      retryCentralBusinessOperation({
        ownerScope,
        operationId: mutation.idempotencyKey,
        storage,
      }).operations[0].status,
    ).toBe("pending");
    expect(
      discardCentralBusinessOperation({
        ownerScope,
        operationId: mutation.idempotencyKey,
        storage,
      }).operations,
    ).toEqual([]);
  });

  it("solo retira cambios locales tras aplicar una version central superior", async () => {
    const storage = new MemoryStorage();
    await applyCentralBusinessEventPage({
      ownerScope,
      events: [event()],
      nextSequence: 1,
      storage,
      applyEvent: async () => undefined,
    });
    const first = { ...mutation, expectedVersion: 1 };
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: first.idempotencyKey,
      mutation: first,
      storage,
    });
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: "CENTRAL_OP_SYNTHETIC_0002",
      mutation: {
        ...first,
        idempotencyKey: "CENTRAL_OP_SYNTHETIC_0002",
        payload: { id: "customer-1", name: "Synthetic final" },
      },
      storage,
    });
    await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async () => ({
        ok: false,
        status: 409,
        code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
        message: "stale",
        retryable: false,
        conflict: true,
      }),
    });

    expect(
      prepareCentralBusinessEntityServerResolution({
        ownerScope,
        entityType: "customer",
        entityId: "customer-1",
        storage,
      }),
    ).toMatchObject({
      prepared: 2,
      state: {
        operations: [
          { status: "conflict", resolution: "accept_server" },
          { status: "pending", resolution: "accept_server" },
        ],
      },
    });
    expect(() =>
      finalizeCentralBusinessEntityServerResolution({
        ownerScope,
        entityType: "customer",
        entityId: "customer-1",
        storage,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CentralBusinessDurableQueueError>>({
        code: "EVENT_VERSION_CONFLICT",
      }),
    );

    const applied = await applyCentralBusinessEventPage({
      ownerScope,
      events: [
        event({
          eventId: "event-2",
          eventSequence: 2,
          entityVersion: 2,
          contentHash: "hash-v2",
        }),
      ],
      nextSequence: 2,
      storage,
      applyEvent: async () => undefined,
    });
    expect(applied.ok).toBe(true);
    expect(
      finalizeCentralBusinessEntityServerResolution({
        ownerScope,
        entityType: "customer",
        entityId: "customer-1",
        storage,
      }),
    ).toMatchObject({
      discarded: 2,
      state: {
        operations: [],
        entityVersions: {
          "customer:customer-1": { version: 2 },
        },
      },
    });
  });

  it("no prepara una sustitucion automatica ante conflicto de idempotencia", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
    });
    await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async () => ({
        ok: false,
        status: 409,
        code: "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
        message: "identity mismatch",
        retryable: false,
        conflict: true,
      }),
    });

    expect(() =>
      prepareCentralBusinessEntityServerResolution({
        ownerScope,
        entityType: "customer",
        entityId: "customer-1",
        storage,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CentralBusinessDurableQueueError>>({
        code: "INVALID_OPERATION",
      }),
    );
  });

  it("no aplica eventos sobre una entidad con escritura local pendiente", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
    });
    const applyEvent = vi.fn();
    const result = await applyCentralBusinessEventPage({
      ownerScope,
      events: [event()],
      nextSequence: 1,
      storage,
      applyEvent,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "LOCAL_OPERATION_CONFLICT",
      state: { operations: [{ status: "conflict" }] },
    });
    expect(applyEvent).not.toHaveBeenCalled();
    expect(result.state.lastAppliedEventSequence).toBe(0);
  });

  it("solo confirma el cursor despues de aplicar toda la pagina", async () => {
    const storage = new MemoryStorage();
    const applyEvent = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("local failure"));
    const failed = await applyCentralBusinessEventPage({
      ownerScope,
      events: [
        event(),
        event({
          eventId: "event-2",
          eventSequence: 2,
          entityVersion: 2,
          contentHash: "hash-v2",
        }),
      ],
      nextSequence: 2,
      storage,
      applyEvent,
    });
    expect(failed).toMatchObject({
      ok: false,
      code: "EVENT_APPLY_FAILED",
      state: { lastAppliedEventSequence: 0, entityVersions: {} },
    });
    expect(loadCentralBusinessDurableQueue(ownerScope, storage)).toMatchObject({
      lastAppliedEventSequence: 0,
      entityVersions: {},
    });

    const succeeded = await applyCentralBusinessEventPage({
      ownerScope,
      events: [
        event(),
        event({
          eventId: "event-2",
          eventSequence: 2,
          entityVersion: 2,
          contentHash: "hash-v2",
        }),
      ],
      nextSequence: 2,
      storage,
      applyEvent: async () => undefined,
    });
    expect(succeeded).toMatchObject({
      ok: true,
      applied: 2,
      state: {
        lastAppliedEventSequence: 2,
        entityVersions: {
          "customer:customer-1": { version: 2, contentHash: "hash-v2" },
        },
      },
    });
  });

  it("avanza sobre eventos propios antiguos y revalida la ultima version confirmada", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
    });
    await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async () => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-3",
        entityVersion: 3,
        eventSequence: 3,
        deleted: false,
        contentHash: "hash-v3",
      }),
    });
    const applyEvent = vi.fn(async () => undefined);

    const result = await applyCentralBusinessEventPage({
      ownerScope,
      events: [
        event(),
        event({
          eventId: "event-2",
          eventSequence: 2,
          entityVersion: 2,
          contentHash: "hash-v2",
        }),
        event({
          eventId: "event-3",
          eventSequence: 3,
          entityVersion: 3,
          contentHash: "hash-v3",
        }),
      ],
      nextSequence: 3,
      storage,
      applyEvent,
    });

    expect(result).toMatchObject({
      ok: true,
      applied: 0,
      skipped: 3,
      state: {
        lastAppliedEventSequence: 3,
        entityVersions: {
          "customer:customer-1": { version: 3, contentHash: "hash-v3" },
        },
      },
    });
    expect(applyEvent).toHaveBeenCalledTimes(1);
    expect(applyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityVersion: 3 }),
    );
  });

  it("rechaza la ultima version propia si su huella ya no coincide", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: mutation.idempotencyKey,
      mutation,
      storage,
    });
    await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async () => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-2",
        entityVersion: 2,
        eventSequence: 2,
        deleted: false,
        contentHash: "hash-v2",
      }),
    });

    const result = await applyCentralBusinessEventPage({
      ownerScope,
      events: [
        event(),
        event({
          eventId: "event-2",
          eventSequence: 2,
          entityVersion: 2,
          contentHash: "different-hash",
        }),
      ],
      nextSequence: 2,
      storage,
      applyEvent: async () => undefined,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "EVENT_VERSION_CONFLICT",
      state: { lastAppliedEventSequence: 0 },
    });
  });

  it("rechaza paginas desordenadas, saltos de version y estado corrupto", async () => {
    const storage = new MemoryStorage();
    await expect(
      applyCentralBusinessEventPage({
        ownerScope,
        events: [event({ eventSequence: 2 })],
        nextSequence: 3,
        storage,
        applyEvent: async () => undefined,
      }),
    ).resolves.toMatchObject({ ok: false, code: "EVENT_PAGE_INVALID" });
    await expect(
      applyCentralBusinessEventPage({
        ownerScope,
        events: [event({ entityVersion: 2 })],
        nextSequence: 1,
        storage,
        applyEvent: async () => undefined,
      }),
    ).resolves.toMatchObject({ ok: false, code: "EVENT_VERSION_CONFLICT" });

    storage.value.set(
      "factu:central-business-authority:durable-queue:v1:synthetic-user-0001",
      "{broken",
    );
    expect(() =>
      loadCentralBusinessDurableQueue(ownerScope, storage),
    ).toThrowError(
      expect.objectContaining<Partial<CentralBusinessDurableQueueError>>({
        code: "STORAGE_CORRUPTED",
      }),
    );
  });

  it("serializa operaciones concurrentes tambien sin Web Locks", async () => {
    const order: string[] = [];
    let releaseFirst: () => void = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const first = withCentralBusinessQueueLock(ownerScope, async () => {
      order.push("first:start");
      await firstGate;
      order.push("first:end");
    });
    const second = withCentralBusinessQueueLock(ownerScope, async () => {
      order.push("second");
    });

    await Promise.resolve();
    expect(order).toEqual(["first:start"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first:start", "first:end", "second"]);
  });
});
