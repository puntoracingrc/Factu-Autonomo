import { normalizeLoadedData } from "../storage";
import type { AppData } from "../types";
import {
  applySyncChanges,
  clearSyncedChanges,
  diffAppData,
  mergePendingChanges,
  type SyncChange,
} from "./diff";

export function trackDataDiff(prev: AppData, next: AppData): AppData {
  const incoming = diffAppData(prev, next);
  if (incoming.length === 0) {
    return next;
  }

  return {
    ...next,
    meta: {
      ...next.meta,
      lastModified: next.meta?.lastModified ?? new Date().toISOString(),
      pendingChanges: mergePendingChanges(next.meta?.pendingChanges, incoming),
    },
  };
}

export function hasPendingSyncChanges(data: AppData): boolean {
  return (data.meta?.pendingChanges?.length ?? 0) > 0;
}

export function applyRemoteChanges(
  local: AppData,
  remoteChanges: SyncChange[],
): AppData {
  const merged = applySyncChanges(local, remoteChanges);
  const newestRemote = remoteChanges.reduce(
    (max, change) => (change.updatedAt > max ? change.updatedAt : max),
    local.meta?.lastSyncedAt ?? "1970-01-01T00:00:00.000Z",
  );

  return {
    ...merged,
    meta: {
      ...merged.meta,
      lastModified: merged.meta?.lastModified ?? new Date().toISOString(),
      lastSyncedAt: newestRemote,
      pendingChanges: merged.meta?.pendingChanges,
    },
  };
}

export function markChangesSynced(
  data: AppData,
  syncedChanges: SyncChange[],
  syncedAt: string,
): AppData {
  return {
    ...data,
    meta: {
      ...data.meta,
      lastModified: data.meta?.lastModified ?? syncedAt,
      lastSyncedAt: syncedAt,
      pendingChanges: clearSyncedChanges(data.meta?.pendingChanges, syncedChanges),
    },
  };
}

export function mergeRemoteOntoLocal(
  local: AppData,
  remoteChanges: SyncChange[],
): { data: AppData; applied: number } {
  if (remoteChanges.length === 0) {
    return { data: local, applied: 0 };
  }

  const localPending = new Map(
    (local.meta?.pendingChanges ?? []).map((change) => [
      `${change.entityType}:${change.entityId}`,
      change,
    ]),
  );

  const toApply: SyncChange[] = [];
  for (const remote of remoteChanges) {
    const key = `${remote.entityType}:${remote.entityId}`;
    const pending = localPending.get(key);
    if (!pending || remote.updatedAt >= pending.updatedAt) {
      toApply.push(remote);
    }
  }

  return {
    data: applyRemoteChanges(local, toApply),
    applied: toApply.length,
  };
}

export function normalizeImportedCloudData(raw: unknown): AppData {
  return normalizeLoadedData(raw as Partial<AppData>);
}
