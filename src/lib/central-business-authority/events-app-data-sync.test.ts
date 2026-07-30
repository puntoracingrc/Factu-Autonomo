import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type AppData,
  type BusinessProfile,
  type Customer,
  type Expense,
  type Product,
  type RecurringExpense,
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

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    date: "2026-07-29",
    supplierName: "Proveedor central",
    description: "Gasto central",
    amount: 121,
    ivaPercent: 21,
    category: "Compras",
    paymentMethod: "Tarjeta",
    createdAt: "2026-07-29T19:00:00.000Z",
    ...overrides,
  };
}

function recurringExpense(
  overrides: Partial<RecurringExpense> = {},
): RecurringExpense {
  return {
    id: "recurring-expense-1",
    supplierName: "Proveedor central",
    description: "Alquiler central",
    amount: 1000,
    ivaPercent: 21,
    category: "Alquiler",
    paymentMethod: "Domiciliación",
    frequency: "monthly",
    dueTiming: { kind: "start_of_month" },
    duration: { kind: "indefinite" },
    startDate: "2026-07-01",
    enabled: true,
    createdAt: "2026-07-29T19:00:00.000Z",
    updatedAt: "2026-07-29T19:00:00.000Z",
    ...overrides,
  };
}

function event(
  entity:
    | Customer
    | Supplier
    | Product
    | UserReminder
    | Expense
    | RecurringExpense,
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
          : "frequency" in entity
            ? "recurring_expense"
            : "amount" in entity
              ? "expense"
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

function profileEvent(
  profile: BusinessProfile,
  overrides: Partial<CentralBusinessBrowserEvent> = {},
): CentralBusinessBrowserEvent {
  return {
    schema: "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1",
    eventId: "profile-event-1",
    eventSequence: 1,
    entityType: "profile",
    entityId: "profile",
    entityVersion: 1,
    operationKind: "upsert",
    payload: JSON.parse(JSON.stringify(profile)),
    contentHash: "profile-hash-v1",
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
    expect(target.commit).toHaveBeenCalledTimes(1);
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

  it("añade, actualiza y borra gastos solo con continuidad central", () => {
    const original = expense();
    const added = buildCentralBusinessEventAppDataTransition({
      data: { ...EMPTY_DATA, expenses: [] },
      event: event(original),
    });
    const updatedExpense = expense({ amount: 242 });
    const updated = buildCentralBusinessEventAppDataTransition({
      data: added.data,
      event: event(updatedExpense, { entityVersion: 2 }),
      knownVersion: {
        entityType: "expense",
        entityId: original.id,
        version: 1,
        deleted: false,
        contentHash: "hash-v1",
      },
    });
    const deleted = buildCentralBusinessEventAppDataTransition({
      data: updated.data,
      event: event(updatedExpense, {
        entityVersion: 3,
        operationKind: "delete",
        payload: null,
      }),
      knownVersion: {
        entityType: "expense",
        entityId: original.id,
        version: 2,
        deleted: false,
        contentHash: "hash-v2",
      },
    });

    expect(added.value.action).toBe("added");
    expect(updated.value.action).toBe("updated");
    expect(updated.data.expenses).toEqual([updatedExpense]);
    expect(deleted.value.action).toBe("deleted");
    expect(deleted.data.expenses).toEqual([]);
  });

  it("aplica el ciclo central de un gasto fijo sin borrar cargos históricos", () => {
    const original = recurringExpense();
    const historical = expense({
      id: "expense-history-1",
      recurringExpenseId: original.id,
      recurringOccurrenceKey: `${original.id}:2026-07-01`,
    });
    const added = buildCentralBusinessEventAppDataTransition({
      data: { ...EMPTY_DATA, recurringExpenses: [], expenses: [historical] },
      event: event(original),
    });
    const updatedTemplate = recurringExpense({ enabled: false });
    const updated = buildCentralBusinessEventAppDataTransition({
      data: added.data,
      event: event(updatedTemplate, { entityVersion: 2 }),
      knownVersion: {
        entityType: "recurring_expense",
        entityId: original.id,
        version: 1,
        deleted: false,
        contentHash: "hash-v1",
      },
    });
    const deleted = buildCentralBusinessEventAppDataTransition({
      data: updated.data,
      event: event(updatedTemplate, {
        entityVersion: 3,
        operationKind: "delete",
        payload: null,
      }),
      knownVersion: {
        entityType: "recurring_expense",
        entityId: original.id,
        version: 2,
        deleted: false,
        contentHash: "hash-v2",
      },
    });

    expect(updated.data.recurringExpenses).toEqual([updatedTemplate]);
    expect(deleted.data.recurringExpenses).toEqual([]);
    expect(deleted.data.expenses).toEqual([historical]);
  });

  it("reconoce como confirmacion una regla y una ocurrencia locales identicas", async () => {
    const storage = new MemoryStorage();
    const rule = recurringExpense();
    const occurrence = expense({
      id: "recurring-occurrence-1",
      recurringExpenseId: rule.id,
      recurringOccurrenceKey: `${rule.id}:2026-07-01`,
      origin: "recurring",
      businessKind: "fixed",
    });
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: "CENTRAL_RECURRING_CREATE_RULE_0001",
      mutation: {
        idempotencyKey: "CENTRAL_RECURRING_CREATE_RULE_0001",
        operationKind: "upsert",
        entityType: "recurring_expense",
        entityId: rule.id,
        expectedVersion: 0,
        payload: JSON.parse(JSON.stringify(rule)),
      },
      storage,
    });
    enqueueCentralBusinessOperation({
      ownerScope,
      operationId: "CENTRAL_RECURRING_CREATE_EXPENSE_0001",
      mutation: {
        idempotencyKey: "CENTRAL_RECURRING_CREATE_EXPENSE_0001",
        operationKind: "upsert",
        entityType: "expense",
        entityId: occurrence.id,
        expectedVersion: 0,
        payload: JSON.parse(JSON.stringify(occurrence)),
      },
      storage,
    });
    await drainCentralBusinessDurableQueue({
      ownerScope,
      storage,
      mutate: async (mutation) => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: `event-${mutation.entityId}`,
        entityVersion: 1,
        eventSequence: mutation.entityType === "expense" ? 1 : 2,
        deleted: false,
        contentHash:
          mutation.entityType === "expense" ? "hash-expense" : "hash-rule",
      }),
    });
    const target = harness(
      {
        ...EMPTY_DATA,
        recurringExpenses: [rule],
        expenses: [occurrence],
      },
      storage,
    );

    const result = await syncCentralBusinessEventsIntoAppData(
      { ownerScope },
      {
        ...target.dependencies,
        pull: async () => ({
          ok: true,
          schema: "CENTRAL_BUSINESS_EVENTS_CLIENT_V1",
          events: [
            event(occurrence, {
              eventId: "event-expense",
              eventSequence: 1,
              contentHash: "hash-expense",
            }),
            event(rule, {
              eventId: "event-rule",
              eventSequence: 2,
              contentHash: "hash-rule",
            }),
          ],
          nextSequence: 2,
          hasMore: false,
        }),
      },
    );

    expect(result).toMatchObject({
      ok: true,
      pulled: 2,
      applied: 0,
      skipped: 2,
      nextSequence: 2,
    });
    expect(target.commit).not.toHaveBeenCalled();
    expect(target.data.expenses).toEqual([occurrence]);
    expect(target.data.recurringExpenses).toEqual([rule]);
  });

  it("actualiza el perfil conocido y rechaza su borrado", () => {
    const updatedProfile = {
      ...DEFAULT_PROFILE,
      name: "Empresa central",
    };
    const knownVersion = {
      entityType: "profile" as const,
      entityId: "profile",
      version: 1,
      deleted: false,
      contentHash: "profile-hash-v1",
    };
    const updated = buildCentralBusinessEventAppDataTransition({
      data: { ...EMPTY_DATA, profile: DEFAULT_PROFILE },
      event: profileEvent(updatedProfile, { entityVersion: 2 }),
      knownVersion,
    });

    expect(updated.value.action).toBe("updated");
    expect(updated.data.profile.name).toBe("Empresa central");
    expect(() =>
      buildCentralBusinessEventAppDataTransition({
        data: updated.data,
        event: profileEvent(updatedProfile, {
          operationKind: "delete",
          payload: null,
          entityVersion: 3,
        }),
        knownVersion: { ...knownVersion, version: 2 },
      }),
    ).toThrow("El perfil fiscal central no se puede borrar.");
  });

  it("rechaza gastos incompletos y no permite pisar un perfil sin versión", () => {
    expect(() =>
      buildCentralBusinessEventAppDataTransition({
        data: EMPTY_DATA,
        event: event(expense(), {
          payload: JSON.parse(
            JSON.stringify({
              ...expense(),
              purchaseLines: [{ id: "line-1" }],
            }),
          ),
        }),
      }),
    ).toThrow("El servidor devolvió un gasto incompleto.");
    expect(() =>
      buildCentralBusinessEventAppDataTransition({
        data: EMPTY_DATA,
        event: profileEvent({ ...DEFAULT_PROFILE, name: "Otra empresa" }),
      }),
    ).toThrow(
      "El perfil local difiere de la primera versión recibida del servidor.",
    );
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
    expect(
      loadCentralBusinessDurableQueue(ownerScope, target.storage),
    ).toMatchObject({ lastAppliedEventSequence: 0, entityVersions: {} });
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
