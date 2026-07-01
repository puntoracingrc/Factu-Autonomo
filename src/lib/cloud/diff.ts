import type {
  AppData,
  BusinessProfile,
  SyncChange,
  SyncEntityType,
} from "../types";

export type { SyncChange, SyncEntityType };

function now(): string {
  return new Date().toISOString();
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function diffById<T extends { id: string }>(
  entityType: SyncEntityType,
  prev: T[],
  next: T[],
  timestamp: string,
): SyncChange[] {
  const changes: SyncChange[] = [];
  const prevMap = new Map(prev.map((item) => [item.id, item]));
  const nextMap = new Map(next.map((item) => [item.id, item]));

  for (const item of next) {
    const before = prevMap.get(item.id);
    if (!before || stableJson(before) !== stableJson(item)) {
      changes.push({
        entityType,
        entityId: item.id,
        deleted: false,
        payload: item,
        updatedAt: timestamp,
      });
    }
  }

  for (const item of prev) {
    if (!nextMap.has(item.id)) {
      changes.push({
        entityType,
        entityId: item.id,
        deleted: true,
        updatedAt: timestamp,
      });
    }
  }

  return changes;
}

export function diffAppData(prev: AppData, next: AppData): SyncChange[] {
  const timestamp = now();
  const changes: SyncChange[] = [
    ...diffById("document", prev.documents, next.documents, timestamp),
    ...diffById("customer", prev.customers, next.customers, timestamp),
    ...diffById("expense", prev.expenses, next.expenses, timestamp),
    ...diffById(
      "recurring_expense",
      prev.recurringExpenses,
      next.recurringExpenses,
      timestamp,
    ),
    ...diffById("user_reminder", prev.userReminders, next.userReminders, timestamp),
    ...diffById("supplier", prev.suppliers, next.suppliers, timestamp),
    ...diffById("product", prev.products, next.products, timestamp),
  ];

  if (stableJson(prev.profile) !== stableJson(next.profile)) {
    changes.push({
      entityType: "profile",
      entityId: "profile",
      deleted: false,
      payload: next.profile,
      updatedAt: timestamp,
    });
  }

  if (stableJson(prev.counters) !== stableJson(next.counters)) {
    changes.push({
      entityType: "counters",
      entityId: "counters",
      deleted: false,
      payload: next.counters,
      updatedAt: timestamp,
    });
  }

  return changes;
}

export function mergePendingChanges(
  existing: SyncChange[] | undefined,
  incoming: SyncChange[],
): SyncChange[] {
  const map = new Map<string, SyncChange>();
  for (const change of existing ?? []) {
    map.set(`${change.entityType}:${change.entityId}`, change);
  }
  for (const change of incoming) {
    map.set(`${change.entityType}:${change.entityId}`, change);
  }
  return [...map.values()];
}

export function appDataToSyncChanges(data: AppData): SyncChange[] {
  const timestamp = now();
  return [
    ...data.documents.map((doc) => ({
      entityType: "document" as const,
      entityId: doc.id,
      deleted: false,
      payload: doc,
      updatedAt: doc.updatedAt || timestamp,
    })),
    ...data.customers.map((customer) => ({
      entityType: "customer" as const,
      entityId: customer.id,
      deleted: false,
      payload: customer,
      updatedAt: customer.updatedAt || timestamp,
    })),
    ...data.expenses.map((expense) => ({
      entityType: "expense" as const,
      entityId: expense.id,
      deleted: false,
      payload: expense,
      updatedAt: expense.createdAt || timestamp,
    })),
    ...data.recurringExpenses.map((item) => ({
      entityType: "recurring_expense" as const,
      entityId: item.id,
      deleted: false,
      payload: item,
      updatedAt: item.updatedAt || timestamp,
    })),
    ...data.userReminders.map((item) => ({
      entityType: "user_reminder" as const,
      entityId: item.id,
      deleted: false,
      payload: item,
      updatedAt: item.updatedAt || timestamp,
    })),
    ...data.suppliers.map((supplier) => ({
      entityType: "supplier" as const,
      entityId: supplier.id,
      deleted: false,
      payload: supplier,
      updatedAt: supplier.createdAt || timestamp,
    })),
    ...data.products.map((product) => ({
      entityType: "product" as const,
      entityId: product.id,
      deleted: false,
      payload: product,
      updatedAt: product.updatedAt || product.createdAt || timestamp,
    })),
    {
      entityType: "profile",
      entityId: "profile",
      deleted: false,
      payload: data.profile,
      updatedAt: timestamp,
    },
    {
      entityType: "counters",
      entityId: "counters",
      deleted: false,
      payload: data.counters,
      updatedAt: timestamp,
    },
  ];
}

export function applySyncChanges(
  data: AppData,
  remoteChanges: SyncChange[],
): AppData {
  let next: AppData = { ...data };

  const sorted = [...remoteChanges].sort((a, b) =>
    a.updatedAt.localeCompare(b.updatedAt),
  );

  for (const change of sorted) {
    next = applyOneChange(next, change);
  }

  return next;
}

function applyOneChange(data: AppData, change: SyncChange): AppData {
  switch (change.entityType) {
    case "document":
      return {
        ...data,
        documents: applyListChange(data.documents, change),
      };
    case "customer":
      return {
        ...data,
        customers: applyListChange(data.customers, change),
      };
    case "expense":
      return {
        ...data,
        expenses: applyListChange(data.expenses, change),
      };
    case "recurring_expense":
      return {
        ...data,
        recurringExpenses: applyListChange(data.recurringExpenses, change),
      };
    case "user_reminder":
      return {
        ...data,
        userReminders: applyListChange(data.userReminders, change),
      };
    case "supplier":
      return {
        ...data,
        suppliers: applyListChange(data.suppliers, change),
      };
    case "product":
      return {
        ...data,
        products: applyListChange(data.products, change),
      };
    case "profile":
      if (change.deleted) return data;
      return {
        ...data,
        profile: change.payload as BusinessProfile,
      };
    case "counters":
      if (change.deleted) return data;
      return {
        ...data,
        counters: change.payload as AppData["counters"],
      };
    default:
      return data;
  }
}

function applyListChange<T extends { id: string }>(
  list: T[],
  change: SyncChange,
): T[] {
  if (change.deleted) {
    return list.filter((item) => item.id !== change.entityId);
  }
  const payload = change.payload as T;
  const index = list.findIndex((item) => item.id === change.entityId);
  if (index === -1) return [...list, payload];
  const copy = [...list];
  copy[index] = payload;
  return copy;
}

export function clearSyncedChanges(
  pending: SyncChange[] | undefined,
  synced: SyncChange[],
): SyncChange[] {
  const syncedKeys = new Set(
    synced.map((change) => `${change.entityType}:${change.entityId}`),
  );
  return (pending ?? []).filter(
    (change) => !syncedKeys.has(`${change.entityType}:${change.entityId}`),
  );
}
