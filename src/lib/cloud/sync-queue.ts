import { hasPendingSyncChanges } from "./incremental";
import { appDataToSyncChanges, type SyncChange } from "./diff";
import { getDataTimestamp } from "../storage";
import type { AppData } from "../types";

const PENDING_KEY = "factura-autonomo-sync-pending";

export function hasUnsyncedChanges(data: AppData): boolean {
  if (hasPendingSyncChanges(data)) return true;
  const lastModified = getDataTimestamp(data);
  const lastSynced = data.meta?.lastSyncedAt;
  if (!lastSynced) return lastModified > "1970-01-01T00:00:00.000Z";
  return lastModified > lastSynced;
}

export function buildCloudUploadChanges(data: AppData): SyncChange[] {
  const pending = data.meta?.pendingChanges ?? [];
  if (pending.length > 0) return pending;
  if (!hasUnsyncedChanges(data)) return [];

  const updatedAt = new Date().toISOString();
  return appDataToSyncChanges(data).map((change) => ({
    ...change,
    updatedAt,
  }));
}

export function markSyncPending(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_KEY, new Date().toISOString());
}

export function clearSyncPending(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_KEY);
}

export function isSyncPendingFlag(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(PENDING_KEY));
}

export function isBrowserOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}
