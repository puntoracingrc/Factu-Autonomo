import { appDataToSyncChanges, applySyncChanges, diffAppData } from "../cloud/diff";
import { normalizeImportedCloudData } from "../cloud/incremental";
import type { AppData, SyncChange, SyncEntityType } from "../types";
import { EMPTY_DATA } from "../types";

export const ADMIN_RESTORE_ENTITY_TYPES: SyncEntityType[] = [
  "document",
  "customer",
  "expense",
  "recurring_expense",
  "supplier",
  "product",
  "user_reminder",
  "profile",
  "counters",
];

export interface AdminSyncEntityRow {
  entity_type: string;
  entity_id: string;
  payload: unknown;
  deleted: boolean;
  updated_at: string;
}

export interface AdminRestoreDataSummary {
  documents: number;
  customers: number;
  expenses: number;
  recurringExpenses: number;
  userReminders: number;
  suppliers: number;
  products: number;
  activeEntities: number;
  deletedEntities: number;
  totalRows: number;
  latestSyncAt: string | null;
}

export interface AdminRestoreDiffTypeSummary {
  added: number;
  updated: number;
  deleted: number;
}

export interface AdminRestoreDiffSummary {
  added: number;
  updated: number;
  deleted: number;
  totalChanges: number;
  byType: Record<SyncEntityType, AdminRestoreDiffTypeSummary>;
}

export interface AdminUserRestorePointSummary {
  id: string;
  userId: string;
  label: string;
  reason: string | null;
  source: "admin_manual" | "pre_restore_safety";
  createdAt: string;
  createdBy: string | null;
  summary: AdminRestoreDataSummary;
}

const EMPTY_RESTORE_SUMMARY: AdminRestoreDataSummary = {
  documents: 0,
  customers: 0,
  expenses: 0,
  recurringExpenses: 0,
  userReminders: 0,
  suppliers: 0,
  products: 0,
  activeEntities: 0,
  deletedEntities: 0,
  totalRows: 0,
  latestSyncAt: null,
};

function emptyTypeSummary(): Record<SyncEntityType, AdminRestoreDiffTypeSummary> {
  return Object.fromEntries(
    ADMIN_RESTORE_ENTITY_TYPES.map((type) => [
      type,
      { added: 0, updated: 0, deleted: 0 },
    ]),
  ) as Record<SyncEntityType, AdminRestoreDiffTypeSummary>;
}

function isSyncEntityType(value: string): value is SyncEntityType {
  return ADMIN_RESTORE_ENTITY_TYPES.includes(value as SyncEntityType);
}

function keyFor(change: Pick<SyncChange, "entityType" | "entityId">): string {
  return `${change.entityType}:${change.entityId}`;
}

function maxIso(values: string[]): string | null {
  return values.reduce<string | null>(
    (max, value) => (!max || value > max ? value : max),
    null,
  );
}

export function syncRowsToChanges(rows: AdminSyncEntityRow[]): SyncChange[] {
  return rows.flatMap((row) => {
    if (!isSyncEntityType(row.entity_type)) return [];
    if (typeof row.entity_id !== "string" || !row.entity_id.trim()) return [];
    return [
      {
        entityType: row.entity_type,
        entityId: row.entity_id,
        deleted: row.deleted === true,
        payload: row.deleted ? undefined : row.payload,
        updatedAt:
          typeof row.updated_at === "string" && row.updated_at
            ? row.updated_at
            : new Date().toISOString(),
      },
    ];
  });
}

export function appDataFromSyncRows(rows: AdminSyncEntityRow[]): AppData {
  const changes = syncRowsToChanges(rows);
  return normalizeImportedCloudData(applySyncChanges(EMPTY_DATA, changes));
}

export function summarizeRestoreData(
  data: AppData,
  rows: AdminSyncEntityRow[] = [],
): AdminRestoreDataSummary {
  const changes = syncRowsToChanges(rows);
  const activeEntities = appDataToSyncChanges(data).length;
  const deletedEntities = changes.filter((change) => change.deleted).length;

  return {
    documents: data.documents.length,
    customers: data.customers.length,
    expenses: data.expenses.length,
    recurringExpenses: data.recurringExpenses.length,
    userReminders: data.userReminders.length,
    suppliers: data.suppliers.length,
    products: data.products.length,
    activeEntities,
    deletedEntities,
    totalRows: rows.length,
    latestSyncAt: maxIso(changes.map((change) => change.updatedAt)),
  };
}

export function summarizeRestoreDiff(
  current: AppData,
  target: AppData,
): AdminRestoreDiffSummary {
  const currentKeys = new Set(
    appDataToSyncChanges(current).map((change) => keyFor(change)),
  );
  const changes = diffAppData(current, target);
  const byType = emptyTypeSummary();
  let added = 0;
  let updated = 0;
  let deleted = 0;

  for (const change of changes) {
    const typeSummary = byType[change.entityType];
    if (change.deleted) {
      typeSummary.deleted += 1;
      deleted += 1;
    } else if (currentKeys.has(keyFor(change))) {
      typeSummary.updated += 1;
      updated += 1;
    } else {
      typeSummary.added += 1;
      added += 1;
    }
  }

  return {
    added,
    updated,
    deleted,
    totalChanges: changes.length,
    byType,
  };
}

export function buildRestoreChanges(
  current: AppData,
  target: AppData,
  restoredAt = new Date().toISOString(),
): SyncChange[] {
  return diffAppData(current, target).map((change) => ({
    ...change,
    updatedAt: restoredAt,
  }));
}

export function normalizeRestorePointData(raw: unknown): AppData {
  return normalizeImportedCloudData(raw);
}

function normalizeSummary(raw: unknown): AdminRestoreDataSummary {
  if (!raw || typeof raw !== "object") return EMPTY_RESTORE_SUMMARY;
  const value = raw as Partial<AdminRestoreDataSummary>;
  return {
    documents: Number(value.documents) || 0,
    customers: Number(value.customers) || 0,
    expenses: Number(value.expenses) || 0,
    recurringExpenses: Number(value.recurringExpenses) || 0,
    userReminders: Number(value.userReminders) || 0,
    suppliers: Number(value.suppliers) || 0,
    products: Number(value.products) || 0,
    activeEntities: Number(value.activeEntities) || 0,
    deletedEntities: Number(value.deletedEntities) || 0,
    totalRows: Number(value.totalRows) || 0,
    latestSyncAt:
      typeof value.latestSyncAt === "string" ? value.latestSyncAt : null,
  };
}

export function normalizeRestorePointSummary(
  row: Record<string, unknown>,
): AdminUserRestorePointSummary {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    label: String(row.label ?? "Copia sin título"),
    reason: typeof row.reason === "string" ? row.reason : null,
    source:
      row.source === "pre_restore_safety"
        ? "pre_restore_safety"
        : "admin_manual",
    createdAt: String(row.created_at),
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
    summary: normalizeSummary(row.summary),
  };
}
