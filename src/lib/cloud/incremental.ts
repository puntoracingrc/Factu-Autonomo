import { getDataTimestamp, normalizeLoadedData } from "../storage";
import type {
  AppData,
  RecurringExpense,
  RecurringOccurrenceExclusionSyncPayload,
} from "../types";
import {
  applySyncChanges,
  clearSyncedChanges,
  diffAppData,
  emptyCloudBootstrapData,
  mergePendingChanges,
  type SyncChange,
} from "./diff";
import { applyRecurringOccurrenceExclusionToData } from "../recurring-expenses";
import { withDocumentRelationshipIntegritySignals } from "../document-integrity/relationships";

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
  const integrityChecked: AppData = {
    ...merged,
    documents: withDocumentRelationshipIntegritySignals(merged.documents),
  };
  const newestRemote = remoteChanges.reduce(
    (max, change) => (change.updatedAt > max ? change.updatedAt : max),
    local.meta?.lastSyncedAt ?? "1970-01-01T00:00:00.000Z",
  );

  return {
    ...integrityChecked,
    meta: {
      ...integrityChecked.meta,
      lastModified:
        integrityChecked.meta?.lastModified ?? new Date().toISOString(),
      lastSyncedAt: newestRemote,
      pendingChanges: integrityChecked.meta?.pendingChanges,
    },
  };
}

export function markChangesSynced(
  data: AppData,
  syncedChanges: SyncChange[],
  syncedAt: string,
): AppData {
  const next: AppData = {
    ...data,
    meta: {
      ...data.meta,
      lastModified: data.meta?.lastModified ?? syncedAt,
      lastSyncedAt: syncedAt,
      pendingChanges: clearSyncedChanges(
        data.meta?.pendingChanges,
        syncedChanges,
      ),
    },
  };
  return markFullySynced(next, syncedAt);
}

/** Alinea lastSyncedAt con lastModified cuando no quedan cambios en cola. */
export function markFullySynced(
  data: AppData,
  syncedAt = new Date().toISOString(),
): AppData {
  if (hasPendingSyncChanges(data)) return data;

  const lastModified = getDataTimestamp(data);
  const aligned = lastModified > syncedAt ? lastModified : syncedAt;

  return {
    ...data,
    meta: {
      ...data.meta,
      lastModified: aligned,
      lastSyncedAt: aligned,
      pendingChanges: undefined,
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

  // Las exclusiones son monotónicas: incluso cuando una plantilla local
  // pendiente gana por timestamp, primero incorporamos los tombstones que
  // puedan viajar dentro del payload legacy de la plantilla remota.
  let monotonicLocal = local;
  for (const remote of remoteChanges) {
    if (
      remote.entityType === "recurring_occurrence_exclusion" &&
      !remote.deleted &&
      remote.payload
    ) {
      monotonicLocal = applyRecurringOccurrenceExclusionToData(
        monotonicLocal,
        remote.payload as RecurringOccurrenceExclusionSyncPayload,
      );
      continue;
    }
    if (
      remote.entityType !== "recurring_expense" ||
      remote.deleted ||
      !remote.payload ||
      typeof remote.payload !== "object"
    ) {
      continue;
    }
    const template = remote.payload as RecurringExpense;
    for (const exclusion of template.occurrenceExclusions ?? []) {
      monotonicLocal = applyRecurringOccurrenceExclusionToData(monotonicLocal, {
        templateId: remote.entityId,
        key: exclusion.key,
        excludedAt: exclusion.excludedAt,
      });
    }
  }

  const localPending = new Map(
    (monotonicLocal.meta?.pendingChanges ?? []).map((change) => [
      `${change.entityType}:${change.entityId}`,
      change,
    ]),
  );

  const toApply: SyncChange[] = [];
  for (const remote of remoteChanges) {
    if (remote.entityType === "document_retirement_batch") {
      // El lote es append-only: su merge por prefijo decide, nunca LWW.
      toApply.push(remote);
      continue;
    }
    const key = `${remote.entityType}:${remote.entityId}`;
    const pending = localPending.get(key);
    if (!pending || remote.updatedAt >= pending.updatedAt) {
      toApply.push(remote);
    }
  }

  return {
    data: applyRemoteChanges(monotonicLocal, toApply),
    applied: toApply.length,
  };
}

/**
 * Reconstruye una descarga completa sin heredar prematuramente el marcador
 * local de EMPTY_DATA. Si la nube contiene el metadato v1, applySyncChanges lo
 * repone antes de normalizar; si no, normalizeLoadedData ejecuta la migración
 * legacy y deja sus sellos en cola para devolverlos a la nube.
 */
export function rebuildCloudSnapshot(remoteChanges: SyncChange[]): {
  data: AppData;
  applied: number;
} {
  const merged = mergeRemoteOntoLocal(emptyCloudBootstrapData(), remoteChanges);
  return {
    data: normalizeImportedCloudData(merged.data),
    applied: merged.applied,
  };
}

export function normalizeImportedCloudData(raw: unknown): AppData {
  return normalizeLoadedData(raw as Partial<AppData>);
}
