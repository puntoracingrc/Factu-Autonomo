import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import {
  EMPTY_DATA,
  type AppData,
  type Customer,
  type Product,
  type Supplier,
  type UserReminder,
} from "@/lib/types";

import {
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import {
  buildCentralBusinessEventAppDataTransition,
  syncCentralBusinessEventsIntoAppData,
  verifyCentralBusinessEventContentHash,
  type CentralBusinessEventLocalApplyValue,
} from "./events-app-data-sync";
import type { CentralBusinessBrowserEvent } from "./events-client";

class MemoryStorage implements CentralBusinessQueueStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const ownerScope = "synthetic-user-0001";

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "customer-1",
    customerType: "company",
    firstName: "Cliente central",
    lastName: "",
    name: "Cliente central",
    createdAt: "2026-07-29T19:00:00.000Z",
    updatedAt: "2026-07-29T19:00:00.000Z",
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    key: "producto central",
    name: "Producto central",
    family: "General",
    source: "manual",
    createdAt: "2026-07-29T19:00:00.000Z",
    updatedAt: "2026-07-29T19:00:00.000Z",
    ...overrides,
  };
}

function supplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: "supplier-1",
    name: "Proveedor central",
    nif: "B00000000",
    createdAt: "2026-07-29T19:00:00.000Z",
    ...overrides,
  };
}

function reminder(overrides: Partial<UserReminder> = {}): UserReminder {
  return {
    id: "reminder-1",
    text: "Recordatorio central",
    link: { kind: "none" },
    target: "self",
    completed: false,
    createdAt: "2026-07-29T19:00:00.000Z",
    updatedAt: "2026-07-29T19:00:00.000Z",
    ...overrides,
  };
}

function event(
  entity: Customer | Supplier | Product | UserReminder,
  overrides: Partial<CentralBusinessBrowserEvent> = {},
): CentralBusinessBrowserEvent {
  return {
    schema: "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1",
    eventId: "event-1",
    eventSequence: 1,
    entityType:
      "firstName" in entity
        ? "customer"
        : "completed" in entity
          ? "user_reminder"
        : "key" in entity
          ? "product"
          : "supplier",
    entityId: entity.id,
    entityVersion: 1,
    operationKind: "upsert",
    payload: JSON.parse(JSON.stringify(entity)),
    contentHash: "hash-v1",
    actorDeviceId: "device-1",
    createdAt: "2026-07-29T19:01:00.000Z",
    ...overrides,
  };
}

function harness(initial: AppData, storage = new MemoryStorage()) {
  let current = initial;
  const commit = vi.fn(
    (
      expected: AppData,
      build: (data: AppData) => {
        data: AppData;
        value: CentralBusinessEventLocalApplyValue;
      },
    ): AppDataDurabilityResult<CentralBusinessEventLocalApplyValue> => {
      if (current !== expected) {
        return { status: "blocked", reason: "stale_precondition" };
      }
      const transition = build(current);
      current = transition.data;
      return {
        status: "applied",
        data: current,
        value: transition.value,
        replayed: false,
      };
    },
  );
  return {
    storage,
    commit,
    get data() {
      return current;
    },
    dependencies: {
      storage,
      getCurrentData: () => current,
      commit,
      verifyContentHash: async () => true,
    },
  };
}

describe("central business events app data sync", () => {
  it("verifica la huella SHA-256 de eventos y tombstones", async () => {
    const tombstone = event(customer(), {
      operationKind: "delete",
      payload: null,
      contentHash: createHash("sha256")
        .update("central-business-tombstone-v1")
        .digest("hex"),
    });

    await expect(
      verifyCentralBusinessEventContentHash(tombstone),
    ).resolves.toBe(true);
    await expect(
      verifyCentralBusinessEventContentHash({
        ...tombstone,
        contentHash: "incorrect",
      }),
    ).resolves.toBe(false);
  });

  it("añade fichas maestras y recordatorios ausentes antes de avanzar el cursor", async () => {
    const target = harness({
      ...EMPTY_DATA,
      customers: [],
      suppliers: [],
      products: [],
      userReminders: [],
    });
    const customerEvent = event(customer());
    const productEvent = event(product(), {
      eventId: "event-2",
      eventSequence: 2,
    });
    const supplierEvent = event(supplier(), {
      eventId: "event-3",
      eventSequence: 3,
    });
    const reminderEvent = event(reminder(), {
      eventId: "event-4",
      eventSequence: 4,
    });
    const result = await syncCentralBusinessEventsIntoAppData(
      { ownerScope },
      {
        ...target.dependencies,
        pull: async () => ({
          ok: true,
          schema: "CENTRAL_BUSINESS_EVENTS_CLIENT_V1",
          events: [
            customerEvent,
            productEvent,
            supplierEvent,
            reminderEvent,
          ],
          nextSequence: 4,
          hasMore: false,
        }),
      },
    );

    expect(result).toMatchObject({
      ok: true,
      pulled: 4,
      applied: 4,
      nextSequence: 4,
    });
    expect(target.data.customers).toEqual([
      expect.objectContaining(customer()),
    ]);
    expect(target.data.products).toEqual([expect.objectContaining(product())]);
    expect(target.data.suppliers).toEqual([
      expect.objectContaining(supplier()),
    ]);
    expect(target.data.userReminders).toEqual([
      expect.objectContaining(reminder()),
    ]);
    expect(
      loadCentralBusinessDurableQueue(ownerScope, target.storage),
    ).toMatchObject({ lastAppliedEventSequence: 4 });
  });

  it("edita y borra un recordatorio solo desde una versión central conocida", () => {
    const current = reminder();
    const updated = reminder({
      text: "Recordatorio central actualizado",
      updatedAt: "2026-07-29T20:00:00.000Z",
    });
    const knownVersion = {
      entityType: "user_reminder" as const,
      entityId: current.id,
      version: 1,
      deleted: false,
      contentHash: "hash-v1",
    };
    const update = buildCentralBusinessEventAppDataTransition({
      data: { ...EMPTY_DATA, userReminders: [current] },
      event: event(updated, { entityVersion: 2 }),
      knownVersion,
    });
    const deletion = buildCentralBusinessEventAppDataTransition({
      data: update.data,
      event: event(updated, {
        entityVersion: 3,
        operationKind: "delete",
        payload: null,
      }),
      knownVersion: { ...knownVersion, version: 2 },
    });

    expect(update.value.action).toBe("updated");
    expect(update.data.userReminders).toEqual([updated]);
    expect(deletion.value.action).toBe("deleted");
    expect(deletion.data.userReminders).toEqual([]);
  });

  it("aplica el borrado remoto de proveedor sin borrar el histórico del producto", () => {
    const linkedProduct = product({
      supplierId: "supplier-1",
      supplierName: "Proveedor central",
    });
    const transition = buildCentralBusinessEventAppDataTransition({
      data: {
        ...EMPTY_DATA,
        suppliers: [supplier()],
        products: [linkedProduct],
      },
      event: event(supplier(), {
        operationKind: "delete",
        payload: null,
        entityVersion: 2,
      }),
      knownVersion: {
        entityType: "supplier",
        entityId: "supplier-1",
        version: 1,
        deleted: false,
        contentHash: "hash-v1",
      },
    });

    expect(transition.value.action).toBe("deleted");
    expect(transition.data.suppliers).toEqual([]);
    expect(transition.data.products).toEqual([
      expect.objectContaining({
        id: linkedProduct.id,
        supplierName: "Proveedor central",
      }),
    ]);
    expect(transition.data.products[0]).not.toHaveProperty("supplierId");
  });

  it("repara una ficha ausente aunque la versión ya estuviera confirmada", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: "CENTRAL_CUSTOMER_CREATE:customer-1",
      mutation: {
        idempotencyKey: "CENTRAL_CUSTOMER_CREATE:customer-1",
        operationKind: "upsert",
        entityType: "customer",
        entityId: "customer-1",
        expectedVersion: 0,
        payload: JSON.parse(JSON.stringify(customer())),
      },
      storage,
    });
    await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async () => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "event-1",
        entityVersion: 1,
        eventSequence: 1,
        deleted: false,
        contentHash: "hash-v1",
      }),
    });
    const target = harness({ ...EMPTY_DATA, customers: [] }, storage);

    const result = await syncCentralBusinessEventsIntoAppData(
      { ownerScope },
      {
        ...target.dependencies,
        pull: async () => ({
          ok: true,
          schema: "CENTRAL_BUSINESS_EVENTS_CLIENT_V1",
          events: [event(customer())],
          nextSequence: 1,
          hasMore: false,
        }),
      },
    );

    expect(result).toMatchObject({ ok: true, applied: 1, nextSequence: 1 });
    expect(target.data.customers).toEqual([
      expect.objectContaining(customer()),
    ]);
  });

  it("no pisa una ficha local divergente ni avanza el cursor", async () => {
    const local = customer({
      name: "Versión local",
      firstName: "Versión local",
    });
    const target = harness({ ...EMPTY_DATA, customers: [local] });

    const result = await syncCentralBusinessEventsIntoAppData(
      { ownerScope },
      {
        ...target.dependencies,
        pull: async () => ({
          ok: true,
          schema: "CENTRAL_BUSINESS_EVENTS_CLIENT_V1",
          events: [event(customer())],
          nextSequence: 1,
          hasMore: false,
        }),
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_LOCAL_ENTITY_CONFLICT",
      nextSequence: 0,
    });
    expect(target.data.customers).toEqual([local]);
    expect(
      loadCentralBusinessDurableQueue(ownerScope, target.storage),
    ).toMatchObject({ lastAppliedEventSequence: 0 });
  });

  it("conserva el cursor si el almacenamiento local no confirma el cambio", async () => {
    const target = harness({ ...EMPTY_DATA, customers: [] });
    const result = await syncCentralBusinessEventsIntoAppData(
      { ownerScope },
      {
        ...target.dependencies,
        commit: () => ({
          status: "indeterminate",
          reason: "storage_state_unknown",
        }),
        pull: async () => ({
          ok: true,
          schema: "CENTRAL_BUSINESS_EVENTS_CLIENT_V1",
          events: [event(customer())],
          nextSequence: 1,
          hasMore: false,
        }),
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_LOCAL_STORAGE_UNKNOWN",
      nextSequence: 0,
    });
  });

  it("rechaza una página completa si falla la huella de contenido", async () => {
    const target = harness({ ...EMPTY_DATA, customers: [] });
    const result = await syncCentralBusinessEventsIntoAppData(
      { ownerScope },
      {
        ...target.dependencies,
        verifyContentHash: async () => false,
        pull: async () => ({
          ok: true,
          schema: "CENTRAL_BUSINESS_EVENTS_CLIENT_V1",
          events: [event(customer())],
          nextSequence: 1,
          hasMore: false,
        }),
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_EVENT_HASH_MISMATCH",
      nextSequence: 0,
    });
    expect(target.commit).not.toHaveBeenCalled();
    expect(target.data.customers).toEqual([]);
  });
});
