import type {
  AppData,
  BusinessProfile,
  RecurringExpense,
  RecurringOccurrenceExclusionSyncPayload,
  SyncChange,
  SyncEntityType,
  TestDocumentRetirementBatchV1,
} from "../types";
import { EMPTY_DATA } from "../types";
import {
  applyRecurringOccurrenceExclusionToData,
  mergeRecurringExpenseOccurrenceExclusions,
  normalizeRecurringExpense,
} from "../recurring-expenses";
import {
  isValidTestDocumentRetirementBatch,
  mergeTestDocumentRetirementBatch,
  projectTestDocumentRetirementHistory,
  quarantineTestDocumentRetirementPayload,
  testDocumentRetirementBatchUpdatedAt,
} from "../test-document-retirement-persistence";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1,
  parseFiscalNotificationsWorkspaceForPersistenceV1,
} from "../fiscal-notifications/workspace-persistence.v1";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
  compareFiscalNotificationsWorkspaceStorageEnvelopesV2,
  encodeFiscalNotificationsWorkspaceForStorageV2,
  mergeFiscalNotificationsWorkspaceStorageEnvelopesV2,
  parseFiscalNotificationsWorkspaceStorageEnvelopeV2,
  restoreFiscalNotificationsWorkspaceFromStorageV2,
  type FiscalNotificationsWorkspaceStorageEnvelopeV2,
} from "../fiscal-notifications/workspace-storage-envelope.v2";

export type { SyncChange, SyncEntityType };

export const SNAPSHOT_INTEGRITY_METADATA_ENTITY_ID =
  "snapshot_integrity_version";

export interface SnapshotIntegrityMetadataPayload {
  snapshotIntegrityVersion: 1;
}

export function emptyCloudBootstrapData(): AppData {
  return {
    ...EMPTY_DATA,
    snapshotIntegrityVersion: undefined,
  };
}

export function snapshotIntegrityMetadataChange(
  updatedAt: string,
): SyncChange {
  return {
    entityType: "workspace_metadata",
    entityId: SNAPSHOT_INTEGRITY_METADATA_ENTITY_ID,
    deleted: false,
    payload: {
      snapshotIntegrityVersion: 1,
    } satisfies SnapshotIntegrityMetadataPayload,
    updatedAt,
  };
}

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

function exclusionPayloads(
  data: AppData,
): RecurringOccurrenceExclusionSyncPayload[] {
  return data.recurringExpenses.flatMap((sourceTemplate) => {
    const template = normalizeRecurringExpense(sourceTemplate);
    return (template.occurrenceExclusions ?? []).map((exclusion) => ({
      templateId: template.id,
      key: exclusion.key,
      excludedAt: exclusion.excludedAt,
    }));
  });
}

export function recurringOccurrenceExclusionSyncChanges(
  data: AppData,
): SyncChange[] {
  return exclusionPayloads(data).map((payload) => ({
    entityType: "recurring_occurrence_exclusion",
    entityId: payload.key,
    deleted: false,
    payload,
    updatedAt: payload.excludedAt,
  }));
}

function diffRecurringOccurrenceExclusions(
  prev: AppData,
  next: AppData,
): SyncChange[] {
  const previous = new Map(
    exclusionPayloads(prev).map((payload) => [payload.key, payload]),
  );
  return exclusionPayloads(next).flatMap((payload) => {
    const before = previous.get(payload.key);
    if (before && stableJson(before) === stableJson(payload)) return [];
    return [
      {
        entityType: "recurring_occurrence_exclusion" as const,
        entityId: payload.key,
        deleted: false,
        payload,
        updatedAt: payload.excludedAt,
      },
    ];
  });
}

export function retirementBatchChange(
  batch: TestDocumentRetirementBatchV1,
): SyncChange {
  return {
    entityType: "document_retirement_batch",
    entityId: batch.batchId,
    deleted: false,
    payload: batch,
    updatedAt: testDocumentRetirementBatchUpdatedAt(batch),
  };
}

export function testDocumentRetirementSyncChanges(data: AppData): SyncChange[] {
  return (data.testDocumentRetirementBatches ?? [])
    .filter(isValidTestDocumentRetirementBatch)
    .map(retirementBatchChange);
}

function diffTestDocumentRetirementBatches(
  previous: AppData,
  next: AppData,
): SyncChange[] {
  const previousById = new Map(
    (previous.testDocumentRetirementBatches ?? [])
      .filter(isValidTestDocumentRetirementBatch)
      .map((batch) => [batch.batchId, batch]),
  );
  return (next.testDocumentRetirementBatches ?? []).flatMap((batch) => {
    if (!isValidTestDocumentRetirementBatch(batch)) return [];
    const before = previousById.get(batch.batchId);
    if (!before) return [retirementBatchChange(batch)];
    const merged = mergeTestDocumentRetirementBatch(before, batch);
    if (!merged || merged.events.length <= before.events.length) return [];
    return [retirementBatchChange(merged)];
  });
}

interface HydratedFiscalNotificationsSyncPayloadV2 {
  readonly envelope: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>;
  readonly workspace: NonNullable<AppData["fiscalNotificationsWorkspace"]>;
}

function fiscalNotificationsWorkspaceEnvelopeChange(
  envelope: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>,
  updatedAt: string,
): SyncChange[] {
  return [
    {
      entityType: "fiscal_notifications_workspace",
      entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
      deleted: false,
      payload: envelope,
      updatedAt,
    },
  ];
}

function fiscalNotificationsWorkspaceChange(
  payload: unknown,
  updatedAt: string,
  baseEnvelope?: unknown,
): SyncChange[] {
  const envelope = encodeFiscalNotificationsWorkspaceForStorageV2(
    payload,
    baseEnvelope,
  );
  return envelope
    ? fiscalNotificationsWorkspaceEnvelopeChange(envelope, updatedAt)
    : [];
}

/**
 * A legacy sync row is never consumed directly. It crosses the explicit
 * V1 -> privacy envelope V2 -> safe in-memory V1 migration before use.
 */
function migrateLegacyFiscalNotificationsSyncPayloadV1(
  value: unknown,
): HydratedFiscalNotificationsSyncPayloadV2 | null {
  const legacy = parseFiscalNotificationsWorkspaceForPersistenceV1(value);
  if (!legacy) return null;
  const envelope = encodeFiscalNotificationsWorkspaceForStorageV2(legacy);
  if (!envelope) return null;
  const workspace = restoreFiscalNotificationsWorkspaceFromStorageV2(
    envelope,
    legacy.ownerScope,
  );
  return workspace ? { envelope, workspace } : null;
}

function hydrateFiscalNotificationsSyncChangeV2(
  change: SyncChange,
): HydratedFiscalNotificationsSyncPayloadV2 | null {
  if (change.deleted) return null;
  if (change.entityId === FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2) {
    const envelope = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
      change.payload,
    );
    if (!envelope) return null;
    const workspace = restoreFiscalNotificationsWorkspaceFromStorageV2(
      envelope,
      envelope.workspace.ownerScope,
    );
    return workspace ? { envelope, workspace } : null;
  }
  if (change.entityId === FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1) {
    return migrateLegacyFiscalNotificationsSyncPayloadV1(change.payload);
  }
  return null;
}

function normalizeFiscalNotificationsSyncChangeV2(
  change: SyncChange,
): SyncChange | null {
  const hydrated = hydrateFiscalNotificationsSyncChangeV2(change);
  if (!hydrated) return null;
  return {
    ...change,
    entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    deleted: false,
    payload: hydrated.envelope,
  };
}

function diffFiscalNotificationsWorkspace(
  previous: AppData,
  next: AppData,
  updatedAt: string,
): SyncChange[] {
  const current = encodeFiscalNotificationsWorkspaceForStorageV2(
    previous.fiscalNotificationsWorkspace,
  );
  const incoming = encodeFiscalNotificationsWorkspaceForStorageV2(
    next.fiscalNotificationsWorkspace,
    current,
  );
  if (!incoming) return [];
  if (!current) {
    return fiscalNotificationsWorkspaceEnvelopeChange(incoming, updatedAt);
  }
  return compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
    current,
    incoming,
    incoming.workspace.ownerScope,
  ) === "INCOMING_ADVANCES"
    ? fiscalNotificationsWorkspaceEnvelopeChange(incoming, updatedAt)
    : [];
}

export function isDerivedTestDocumentRetirementDocumentChange(
  change: SyncChange,
  batch: TestDocumentRetirementBatchV1,
): boolean {
  if (change.entityType !== "document") return false;
  if (batch.status === "applied") {
    if (batch.selectedDocumentIds.includes(change.entityId)) {
      return change.deleted;
    }
    const backlink = batch.backlinkChanges.find(
      (entry) => entry.documentId === change.entityId,
    );
    return Boolean(
      backlink &&
        !change.deleted &&
        stableJson(change.payload) === stableJson(backlink.after),
    );
  }
  const retired = batch.retiredDocuments.find(
    (entry) => entry.document.id === change.entityId,
  );
  if (retired) {
    return !change.deleted && stableJson(change.payload) === stableJson(retired.document);
  }
  const backlink = batch.backlinkChanges.find(
    (entry) => entry.documentId === change.entityId,
  );
  return Boolean(
    backlink &&
      !change.deleted &&
      stableJson(change.payload) === stableJson(backlink.before),
  );
}

function suppressDerivedRetirementDocumentChanges(
  changes: SyncChange[],
  retirementChanges: readonly SyncChange[],
): SyncChange[] {
  const batches = retirementChanges.flatMap((change) =>
    change.entityType === "document_retirement_batch" &&
    !change.deleted &&
    isValidTestDocumentRetirementBatch(change.payload)
      ? [change.payload]
      : [],
  );
  if (batches.length === 0) return changes;
  return changes.filter(
    (change) =>
      !batches.some((batch) =>
        isDerivedTestDocumentRetirementDocumentChange(change, batch),
      ),
  );
}

export function diffAppData(prev: AppData, next: AppData): SyncChange[] {
  const timestamp = now();
  const retirementChanges = diffTestDocumentRetirementBatches(prev, next);
  const documentChanges = suppressDerivedRetirementDocumentChanges(
    diffById("document", prev.documents, next.documents, timestamp),
    retirementChanges,
  );
  const changes: SyncChange[] = [
    ...documentChanges,
    ...diffById("customer", prev.customers, next.customers, timestamp),
    ...diffById("expense", prev.expenses, next.expenses, timestamp),
    ...diffById(
      "recurring_expense",
      prev.recurringExpenses,
      next.recurringExpenses,
      timestamp,
    ),
    ...diffRecurringOccurrenceExclusions(prev, next),
    ...diffById("user_reminder", prev.userReminders, next.userReminders, timestamp),
    ...diffById("supplier", prev.suppliers, next.suppliers, timestamp),
    ...diffById("product", prev.products, next.products, timestamp),
    ...retirementChanges,
    ...diffFiscalNotificationsWorkspace(prev, next, timestamp),
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

  if (
    prev.snapshotIntegrityVersion !== 1 &&
    next.snapshotIntegrityVersion === 1
  ) {
    changes.push(snapshotIntegrityMetadataChange(timestamp));
  }

  return changes;
}

export function mergePendingChanges(
  existing: SyncChange[] | undefined,
  incoming: SyncChange[],
): SyncChange[] {
  const retirementChanges = [...(existing ?? []), ...incoming].filter(
    (change) => change.entityType === "document_retirement_batch",
  );
  const safeExisting = suppressDerivedRetirementDocumentChanges(
    existing ?? [],
    retirementChanges,
  );
  const safeIncoming = suppressDerivedRetirementDocumentChanges(
    incoming,
    retirementChanges,
  );
  const map = new Map<string, SyncChange>();
  for (const change of safeExisting) {
    if (
      change.entityType === "document_retirement_batch" &&
      (change.deleted ||
        !isValidTestDocumentRetirementBatch(change.payload) ||
        change.payload.batchId !== change.entityId)
    ) {
      continue;
    }
    if (change.entityType === "fiscal_notifications_workspace") {
      const normalized = normalizeFiscalNotificationsSyncChangeV2(change);
      if (!normalized) continue;
      map.set(
        `fiscal_notifications_workspace:${FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2}`,
        normalized,
      );
      continue;
    }
    map.set(`${change.entityType}:${change.entityId}`, change);
  }
  for (const change of safeIncoming) {
    if (change.entityType === "fiscal_notifications_workspace") {
      const normalized = normalizeFiscalNotificationsSyncChangeV2(change);
      if (!normalized) continue;
      const incomingEnvelope =
        parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
          normalized.payload,
        );
      if (!incomingEnvelope) continue;
      const key =
        `fiscal_notifications_workspace:${FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2}`;
      const current = map.get(key);
      if (!current) {
        map.set(key, normalized);
        continue;
      }
      const currentEnvelope =
        parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
          current.payload,
          incomingEnvelope.workspace.ownerScope,
        );
      if (!currentEnvelope) continue;
      const comparison =
        compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
          currentEnvelope,
          incomingEnvelope,
          incomingEnvelope.workspace.ownerScope,
        );
      if (comparison === "INCOMING_ADVANCES") {
        map.set(key, normalized);
      }
      continue;
    }
    const key = `${change.entityType}:${change.entityId}`;
    if (change.entityType !== "document_retirement_batch") {
      map.set(key, change);
      continue;
    }
    if (
      change.deleted ||
      !isValidTestDocumentRetirementBatch(change.payload) ||
      change.payload.batchId !== change.entityId
    ) {
      continue;
    }
    const current = map.get(key);
    if (!current || !isValidTestDocumentRetirementBatch(current.payload)) {
      map.set(key, retirementBatchChange(change.payload));
      continue;
    }
    const merged = mergeTestDocumentRetirementBatch(
      current.payload,
      change.payload,
    );
    if (merged) map.set(key, retirementBatchChange(merged));
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
    ...recurringOccurrenceExclusionSyncChanges(data),
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
    ...testDocumentRetirementSyncChanges(data),
    ...fiscalNotificationsWorkspaceChange(
      data.fiscalNotificationsWorkspace,
      timestamp,
    ),
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
    ...(data.snapshotIntegrityVersion === 1
      ? [snapshotIntegrityMetadataChange(timestamp)]
      : []),
  ];
}

export function applySyncChanges(
  data: AppData,
  remoteChanges: SyncChange[],
): AppData {
  const sorted = [...remoteChanges].sort((a, b) => {
    const aIsExclusion =
      a.entityType === "recurring_occurrence_exclusion" && !a.deleted;
    const bIsExclusion =
      b.entityType === "recurring_occurrence_exclusion" && !b.deleted;
    if (aIsExclusion !== bIsExclusion) return aIsExclusion ? 1 : -1;
    return a.updatedAt.localeCompare(b.updatedAt);
  });

  const retirementChanges = sorted.filter(
    (change) => change.entityType === "document_retirement_batch",
  );
  let historyCandidate: AppData = { ...data };

  // El lote y sus documentos forman una sola transición lógica. Primero se
  // valida y fusiona todo el historial append-only; ante un sobre inválido o
  // divergente no se aplica ningún cambio remoto de la misma descarga.
  for (const change of retirementChanges) {
    if (
      change.deleted ||
      !isValidTestDocumentRetirementBatch(change.payload) ||
      change.payload.batchId !== change.entityId
    ) {
      return quarantineTestDocumentRetirementPayload(data, change);
    }
    const before = historyCandidate.testDocumentRetirementBatches ?? [];
    const existing = before.find((batch) => batch.batchId === change.entityId);
    if (existing && !mergeTestDocumentRetirementBatch(existing, change.payload)) {
      return quarantineTestDocumentRetirementPayload(data, change);
    }
    historyCandidate = applyOneChange(historyCandidate, change);
  }

  let next = historyCandidate;
  for (const change of sorted) {
    if (change.entityType === "document_retirement_batch") continue;
    next = applyOneChange(next, change);
  }

  const projected = projectTestDocumentRetirementHistory(next);
  if (projected.status === "blocked") {
    return quarantineTestDocumentRetirementPayload(data, {
      reason: projected.reason,
      batchId: projected.batchId,
      retirementChanges,
    });
  }
  return projected.data;
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
      if (change.deleted) {
        return {
          ...data,
          recurringExpenses: applyListChange(data.recurringExpenses, change),
        };
      }
      if (!change.payload || typeof change.payload !== "object") return data;
      const incomingTemplate = change.payload as RecurringExpense;
      if (incomingTemplate.id !== change.entityId) return data;
      const currentTemplate = data.recurringExpenses.find(
        (entry) => entry.id === change.entityId,
      );
      const mergedTemplate = currentTemplate
        ? mergeRecurringExpenseOccurrenceExclusions(
            currentTemplate,
            incomingTemplate,
          )
        : normalizeRecurringExpense(incomingTemplate);
      return {
        ...data,
        recurringExpenses: applyListChange(data.recurringExpenses, {
          ...change,
          payload: mergedTemplate,
        }),
      };
    case "recurring_occurrence_exclusion":
      if (change.deleted || !change.payload) return data;
      return applyRecurringOccurrenceExclusionToData(
        data,
        change.payload as RecurringOccurrenceExclusionSyncPayload,
      );
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
    case "document_retirement_batch": {
      if (
        change.deleted ||
        !isValidTestDocumentRetirementBatch(change.payload) ||
        change.payload.batchId !== change.entityId
      ) {
        return data;
      }
      const batches = data.testDocumentRetirementBatches ?? [];
      const existingIndex = batches.findIndex(
        (batch) => batch.batchId === change.entityId,
      );
      if (existingIndex === -1) {
        return {
          ...data,
          testDocumentRetirementBatches: [...batches, change.payload],
        };
      }
      const merged = mergeTestDocumentRetirementBatch(
        batches[existingIndex]!,
        change.payload,
      );
      if (!merged) return data;
      const nextBatches = [...batches];
      nextBatches[existingIndex] = merged;
      return { ...data, testDocumentRetirementBatches: nextBatches };
    }
    case "fiscal_notifications_workspace": {
      const incoming = hydrateFiscalNotificationsSyncChangeV2(change);
      if (!incoming) return data;
      const current = data.fiscalNotificationsWorkspace;
      if (!current) {
        return { ...data, fiscalNotificationsWorkspace: incoming.workspace };
      }
      const currentEnvelope =
        encodeFiscalNotificationsWorkspaceForStorageV2(current);
      if (!currentEnvelope) return data;
      const comparison =
        compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
          currentEnvelope,
          incoming.envelope,
          current.ownerScope,
        );
      if (comparison !== "INCOMING_ADVANCES") return data;
      const mergedEnvelope =
        mergeFiscalNotificationsWorkspaceStorageEnvelopesV2(
          currentEnvelope,
          incoming.envelope,
          current.ownerScope,
        );
      if (!mergedEnvelope) return data;
      const merged = restoreFiscalNotificationsWorkspaceFromStorageV2(
        mergedEnvelope,
        current.ownerScope,
      );
      return merged
        ? { ...data, fiscalNotificationsWorkspace: merged }
        : data;
    }
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
    case "workspace_metadata": {
      if (change.entityId !== SNAPSHOT_INTEGRITY_METADATA_ENTITY_ID) {
        return data;
      }
      if (change.deleted) {
        return {
          ...data,
          snapshotIntegrityVersion: 1,
        };
      }
      if (
        !change.payload ||
        typeof change.payload !== "object" ||
        (change.payload as Partial<SnapshotIntegrityMetadataPayload>)
          .snapshotIntegrityVersion !== 1
      ) {
        return data;
      }
      return {
        ...data,
        snapshotIntegrityVersion: 1,
      };
    }
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
  const syncedByKey = new Map<string, SyncChange>();
  for (const change of synced) {
    if (change.entityType !== "fiscal_notifications_workspace") {
      syncedByKey.set(`${change.entityType}:${change.entityId}`, change);
      continue;
    }
    const normalized = normalizeFiscalNotificationsSyncChangeV2(change);
    if (normalized) {
      syncedByKey.set(
        `fiscal_notifications_workspace:${FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2}`,
        normalized,
      );
    }
  }
  return (pending ?? []).flatMap((change) => {
    if (change.entityType !== "fiscal_notifications_workspace") {
      const syncedChange = syncedByKey.get(
        `${change.entityType}:${change.entityId}`,
      );
      return syncedChange ? [] : [change];
    }
    const normalized = normalizeFiscalNotificationsSyncChangeV2(change);
    if (!normalized) return [];
    const pendingEnvelope =
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(normalized.payload);
    if (!pendingEnvelope) return [];
    const syncedChange = syncedByKey.get(
      `fiscal_notifications_workspace:${FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2}`,
    );
    if (!syncedChange) return [normalized];
    const syncedEnvelope =
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        syncedChange.payload,
        pendingEnvelope.workspace.ownerScope,
      );
    if (!syncedEnvelope) return [normalized];
    const comparison =
      compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
        syncedEnvelope,
        pendingEnvelope,
        pendingEnvelope.workspace.ownerScope,
      );
    return comparison === "INCOMING_ADVANCES" || comparison === "DIVERGED"
      ? [normalized]
      : [];
  });
}
