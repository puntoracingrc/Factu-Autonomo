import {
  appDataToSyncChanges,
  isDerivedTestDocumentRetirementDocumentChange,
} from "./diff";
import { normalizeImportedCloudData } from "./incremental";
import type { SyncChange } from "./diff";
import { normalizeLoadedData } from "../storage";
import { getSupabaseClientAsync } from "../supabase/client";
import type {
  AppData,
  Document,
  TestDocumentRetirementBatchV1,
} from "../types";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1,
  fiscalNotificationsOwnerScopeForUserIdV1,
  parseFiscalNotificationsWorkspaceForPersistenceV1,
} from "../fiscal-notifications/workspace-persistence.v1";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
  compareFiscalNotificationsWorkspaceStorageEnvelopesV2,
  encodeFiscalNotificationsWorkspaceForStorageV2,
  parseFiscalNotificationsWorkspaceStorageEnvelopeV2,
  type FiscalNotificationsWorkspaceStorageEnvelopeV2,
} from "../fiscal-notifications/workspace-storage-envelope.v2";
import {
  isValidTestDocumentRetirementBatch,
  mergeTestDocumentRetirementBatch,
  testDocumentRetirementBatchUpdatedAt,
  testDocumentRetirementTenantFingerprintForUserId,
} from "../test-document-retirement-persistence";
import { stableStringifySnapshot } from "../document-integrity/snapshots";

const ENTITIES_TABLE = "sync_entities";
const LEGACY_TABLE = "user_backups";
const SYNC_PAGE_SIZE = 500;
const ALWAYS_PULL_ENTITY_TYPES = [
  "recurring_occurrence_exclusion",
  "document_retirement_batch",
  "fiscal_notifications_workspace",
] as const;

interface SyncEntityRow {
  entity_type: string;
  entity_id: string;
  payload: unknown;
  deleted: boolean;
  updated_at: string;
}

interface RetirementWritePlan {
  batch: TestDocumentRetirementBatchV1;
  previous?: SyncEntityRow;
}

interface RetirementBootstrapPlan {
  rows: Array<Record<string, unknown>>;
}

interface FiscalNotificationsWorkspaceWritePlan {
  workspace: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>;
  updatedAt: string;
  previous?: SyncEntityRow;
}

type RetirementSyncChange = SyncChange & {
  entityType: "document_retirement_batch";
  deleted: false;
  payload: TestDocumentRetirementBatchV1;
};

type FiscalNotificationsWorkspaceSyncChange = SyncChange & {
  entityType: "fiscal_notifications_workspace";
  deleted: false;
  payload: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>;
};

function fiscalWorkspaceEnvelope(
  value: unknown,
  expectedOwnerScope: string,
): Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2> | null {
  const current = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    value,
    expectedOwnerScope,
  );
  if (current) return current;
  const legacy = parseFiscalNotificationsWorkspaceForPersistenceV1(
    value,
    expectedOwnerScope,
  );
  if (!legacy) return null;
  return encodeFiscalNotificationsWorkspaceForStorageV2(legacy);
}

function rowToChange(row: SyncEntityRow): SyncChange {
  return {
    entityType: row.entity_type as SyncChange["entityType"],
    entityId: row.entity_id,
    deleted: row.deleted,
    payload: row.payload,
    updatedAt: row.updated_at,
  };
}

function fiscalRowToChange(
  row: SyncEntityRow,
  expectedOwnerScope: string,
): SyncChange {
  const envelope = fiscalWorkspaceEnvelope(row.payload, expectedOwnerScope);
  if (!envelope) {
    throw new Error("El expediente fiscal remoto no es verificable");
  }
  return {
    entityType: "fiscal_notifications_workspace",
    entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    deleted: false,
    payload: envelope,
    updatedAt: row.updated_at,
  };
}

export async function pushSyncChanges(
  userId: string,
  changes: SyncChange[],
): Promise<string> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) throw new Error("La nube no está configurada");
  if (changes.length === 0) return new Date().toISOString();
  const syncedAt = new Date().toISOString();
  const expectedTenant = testDocumentRetirementTenantFingerprintForUserId(userId);
  let expectedFiscalOwner: string | null = null;
  const retirementChanges: RetirementSyncChange[] = [];
  const fiscalWorkspaceChanges: FiscalNotificationsWorkspaceSyncChange[] = [];
  for (const change of changes) {
    if (change.entityType === "document_retirement_batch") {
      if (
        change.deleted ||
        !isValidTestDocumentRetirementBatch(change.payload) ||
        change.payload.batchId !== change.entityId ||
        change.payload.tenantFingerprint !== expectedTenant
      ) {
        throw new Error("El historial local de retiro no es verificable");
      }
      retirementChanges.push(change as RetirementSyncChange);
      continue;
    }
    if (change.entityType !== "fiscal_notifications_workspace") continue;
    expectedFiscalOwner ??= fiscalNotificationsOwnerScopeForUserIdV1(userId);
    if (!expectedFiscalOwner) {
      throw new Error("La cuenta fiscal no es verificable");
    }
    const workspace =
      change.deleted ||
      (change.entityId !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 &&
        change.entityId !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2)
        ? null
        : fiscalWorkspaceEnvelope(
            change.payload,
            expectedFiscalOwner,
          );
    if (!workspace) {
      throw new Error("El expediente fiscal local no es verificable");
    }
    fiscalWorkspaceChanges.push({
      ...change,
      deleted: false,
      payload: workspace,
    } as FiscalNotificationsWorkspaceSyncChange);
  }
  if (fiscalWorkspaceChanges.length > 1) {
    throw new Error("La cola contiene más de una cabeza fiscal");
  }

  const remoteRows =
    retirementChanges.length > 0
      ? await pullRows(userId, { entityType: "document_retirement_batch" })
      : [];
  validateRetirementRows(remoteRows, expectedTenant);
  const remoteById = new Map(remoteRows.map((row) => [row.entity_id, row]));
  const plans: RetirementWritePlan[] = [];
  for (const change of retirementChanges) {
    const previous = remoteById.get(change.entityId);
    if (!previous) {
      plans.push({ batch: change.payload, previous: undefined });
      remoteById.set(change.entityId, batchToRow(change.payload));
      continue;
    }
    const merged = mergeTestDocumentRetirementBatch(
      previous.payload as TestDocumentRetirementBatchV1,
      change.payload,
    );
    if (!merged) throw new Error("El historial remoto de retiro ha divergido");
    if (
      merged.events.length >
      (previous.payload as TestDocumentRetirementBatchV1).events.length
    ) {
      plans.push({ batch: merged, previous });
      remoteById.set(change.entityId, batchToRow(merged));
    }
  }

  const remoteFiscalRows =
    fiscalWorkspaceChanges.length > 0
      ? await pullRows(userId, {
          entityType: "fiscal_notifications_workspace",
        })
      : [];
  validateFiscalNotificationsWorkspaceRows(
    remoteFiscalRows,
    expectedFiscalOwner!,
  );
  const fiscalWorkspacePlans: FiscalNotificationsWorkspaceWritePlan[] = [];
  for (const change of fiscalWorkspaceChanges) {
    const previous = remoteFiscalRows[0];
    if (!previous) {
      fiscalWorkspacePlans.push({
        workspace: change.payload,
        updatedAt: change.updatedAt || syncedAt,
      });
      continue;
    }
    const remoteWorkspace = fiscalWorkspaceEnvelope(
      previous.payload,
      expectedFiscalOwner!,
    )!;
    const comparison = compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
      remoteWorkspace,
      change.payload,
      expectedFiscalOwner!,
    );
    if (comparison === "DIVERGED") {
      throw new Error("El expediente fiscal remoto ha divergido");
    }
    if (comparison === "INCOMING_ADVANCES") {
      fiscalWorkspacePlans.push({
        workspace: change.payload,
        updatedAt:
          change.updatedAt > previous.updated_at
            ? change.updatedAt
            : syncedAt,
        previous,
      });
    }
  }

  const transitionBatches = retirementChanges.map((change) => change.payload);
  const retirementDocumentIds = new Set(
    transitionBatches.flatMap((batch) => [
      ...batch.selectedDocumentIds,
      ...batch.backlinkChanges.map((entry) => entry.documentId),
    ]),
  );
  const casTransitionBatches = plans.map((plan) => plan.batch);
  const casTransitionDocumentIds = new Set(
    casTransitionBatches.flatMap((batch) => [
      ...batch.selectedDocumentIds,
      ...batch.backlinkChanges.map((entry) => entry.documentId),
    ]),
  );
  const preparedChanges = changes.filter((change) => {
    if (
      change.entityType === "document_retirement_batch" ||
      change.entityType === "fiscal_notifications_workspace"
    ) {
      return false;
    }
    if (
      change.entityType !== "document" ||
      !retirementDocumentIds.has(change.entityId)
    ) {
      return true;
    }
    if (
      transitionBatches.some((batch) =>
        isDerivedTestDocumentRetirementDocumentChange(change, batch),
      )
    ) {
      return false;
    }
    if (casTransitionDocumentIds.has(change.entityId)) {
      throw new Error(
        "Un documento cambió durante la transición de retiro",
      );
    }
    return true;
  });
  const rows = preparedChanges.map((change) => ({
    user_id: userId,
    entity_type: change.entityType,
    entity_id: change.entityId,
    payload: change.deleted ? null : (change.payload ?? null),
    deleted: change.deleted,
    updated_at: change.updatedAt || syncedAt,
  }));

  const bootstrap = await buildRetirementBootstrapPlan(
    userId,
    plans,
    syncedAt,
  );
  await upsertRows(supabase, bootstrap.rows);

  for (const plan of plans.filter((entry) => entry.batch.status === "applied")) {
    await writeRetirementBatchCas(userId, plan, expectedTenant);
  }

  await upsertRows(supabase, rows);

  for (const plan of fiscalWorkspacePlans) {
    await writeFiscalNotificationsWorkspaceCas(
      userId,
      plan,
      expectedFiscalOwner!,
      syncedAt,
    );
  }

  for (const plan of plans.filter(
    (entry) => entry.batch.status === "rolled_back",
  )) {
    await writeRetirementBatchCas(userId, plan, expectedTenant);
  }

  return syncedAt;
}

function validateFiscalNotificationsWorkspaceRows(
  rows: readonly SyncEntityRow[],
  expectedOwnerScope: string,
): void {
  if (rows.length > 1) {
    throw new Error("La nube contiene más de una cabeza fiscal");
  }
  for (const row of rows) {
    if (
      row.entity_type !== "fiscal_notifications_workspace" ||
      (row.entity_id !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 &&
        row.entity_id !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2) ||
      row.deleted ||
      !fiscalWorkspaceEnvelope(
        row.payload,
        expectedOwnerScope,
      )
    ) {
      throw new Error("El expediente fiscal remoto no es verificable");
    }
  }
}

function fiscalNotificationsWorkspaceRow(
  userId: string,
  plan: FiscalNotificationsWorkspaceWritePlan,
): RowForWrite {
  return {
    user_id: userId,
    entity_type: "fiscal_notifications_workspace",
    entity_id: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    payload: plan.workspace,
    deleted: false,
    updated_at: plan.updatedAt,
  };
}

type RowForWrite = Record<string, unknown> & {
  user_id: string;
  entity_type: string;
  entity_id: string;
  payload: unknown;
  deleted: boolean;
  updated_at: string;
};

function fiscalNotificationsWorkspaceReadbackMatches(
  row: SyncEntityRow,
  plan: FiscalNotificationsWorkspaceWritePlan,
  expectedOwnerScope: string,
): boolean {
  const parsed = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    row.payload,
    expectedOwnerScope,
  );
  return Boolean(
    row.entity_type === "fiscal_notifications_workspace" &&
      row.entity_id === FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2 &&
      !row.deleted &&
      row.updated_at === plan.updatedAt &&
      parsed &&
      stableStringifySnapshot(parsed) ===
        stableStringifySnapshot(plan.workspace),
  );
}

async function writeFiscalNotificationsWorkspaceCas(
  userId: string,
  initialPlan: FiscalNotificationsWorkspaceWritePlan,
  expectedOwnerScope: string,
  syncedAt: string,
): Promise<void> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) throw new Error("La nube no está configurada");
  let plan = initialPlan;
  if (!plan.previous) {
    const row = fiscalNotificationsWorkspaceRow(userId, plan);
    const inserted = await supabase
      .from(ENTITIES_TABLE)
      .insert(row)
      .select("entity_type, entity_id, payload, deleted, updated_at");
    if (
      !inserted.error &&
      inserted.data?.length === 1 &&
      fiscalNotificationsWorkspaceReadbackMatches(
        inserted.data[0] as SyncEntityRow,
        plan,
        expectedOwnerScope,
      )
    ) {
      return;
    }

    const currentRows = await pullRows(userId, {
      entityType: "fiscal_notifications_workspace",
    });
    validateFiscalNotificationsWorkspaceRows(currentRows, expectedOwnerScope);
    const current = currentRows[0];
    if (!current) {
      throw inserted.error ?? new Error("No se confirmó el expediente fiscal");
    }
    const currentWorkspace = fiscalWorkspaceEnvelope(
      current.payload,
      expectedOwnerScope,
    )!;
    const comparison = compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
      currentWorkspace,
      plan.workspace,
      expectedOwnerScope,
    );
    if (comparison === "EQUAL" || comparison === "CURRENT_ADVANCES") return;
    if (comparison !== "INCOMING_ADVANCES") {
      throw new Error("El expediente fiscal remoto ha divergido");
    }
    plan = {
      ...plan,
      updatedAt: plan.updatedAt > current.updated_at ? plan.updatedAt : syncedAt,
      previous: current,
    };
  }

  const previous = plan.previous;
  if (!previous) return;
  const row = fiscalNotificationsWorkspaceRow(userId, plan);
  const updated = await supabase
    .from(ENTITIES_TABLE)
    .update(row)
    .eq("user_id", userId)
    .eq("entity_type", "fiscal_notifications_workspace")
    .eq("entity_id", previous.entity_id)
    .eq("deleted", false)
    .eq("updated_at", previous.updated_at)
    .select("entity_type, entity_id, payload, deleted, updated_at");
  if (updated.error) throw updated.error;
  if (
    updated.data?.length !== 1 ||
    !fiscalNotificationsWorkspaceReadbackMatches(
      updated.data[0] as SyncEntityRow,
      plan,
      expectedOwnerScope,
    )
  ) {
    throw new Error("El expediente fiscal remoto cambió antes de confirmar");
  }
}

async function upsertRows(
  supabase: Awaited<ReturnType<typeof getSupabaseClientAsync>>,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  if (!supabase) throw new Error("La nube no está configurada");
  for (let index = 0; index < rows.length; index += SYNC_PAGE_SIZE) {
    const chunk = rows.slice(index, index + SYNC_PAGE_SIZE);
    const { error } = await supabase.from(ENTITIES_TABLE).upsert(chunk, {
      onConflict: "user_id,entity_type,entity_id",
    });
    if (error) throw error;
  }
}

function retirementBaseDocuments(
  plans: readonly RetirementWritePlan[],
): Map<string, Document> {
  const documents = new Map<string, Document>();
  const add = (document: Document) => {
    const current = documents.get(document.id);
    if (
      current &&
      stableStringifySnapshot(current) !== stableStringifySnapshot(document)
    ) {
      throw new Error("La base documental del retiro ha divergido");
    }
    documents.set(document.id, document);
  };
  for (const plan of plans) {
    for (const retired of plan.batch.retiredDocuments) add(retired.document);
    for (const backlink of plan.batch.backlinkChanges) add(backlink.before);
  }
  return documents;
}

async function buildRetirementBootstrapPlan(
  userId: string,
  plans: readonly RetirementWritePlan[],
  syncedAt: string,
): Promise<RetirementBootstrapPlan> {
  if (plans.length === 0) return { rows: [] };
  const expected = retirementBaseDocuments(plans);
  if (expected.size === 0) return { rows: [] };
  const remoteRows = await pullRows(userId, { entityType: "document" });
  const remoteById = new Map(remoteRows.map((row) => [row.entity_id, row]));
  const rows: Array<Record<string, unknown>> = [];
  for (const document of expected.values()) {
    const remote = remoteById.get(document.id);
    if (!remote) {
      rows.push({
        entity_type: "document",
        entity_id: document.id,
        payload: document,
        deleted: false,
        updated_at: syncedAt,
      });
      continue;
    }
    if (
      remote.deleted ||
      stableStringifySnapshot(remote.payload) !==
        stableStringifySnapshot(document)
    ) {
      throw new Error("La base documental remota cambió antes de confirmar");
    }
  }
  return {
    rows: rows.map((row) => ({ user_id: userId, ...row })),
  };
}

function batchToRow(batch: TestDocumentRetirementBatchV1): SyncEntityRow {
  return {
    entity_type: "document_retirement_batch",
    entity_id: batch.batchId,
    payload: batch,
    deleted: false,
    updated_at: testDocumentRetirementBatchUpdatedAt(batch),
  };
}

function validateRetirementRows(
  rows: readonly SyncEntityRow[],
  expectedTenant: string,
): void {
  for (const row of rows) {
    if (row.entity_type !== "document_retirement_batch") continue;
    if (
      row.deleted ||
      !isValidTestDocumentRetirementBatch(row.payload) ||
      row.payload.batchId !== row.entity_id ||
      row.payload.tenantFingerprint !== expectedTenant
    ) {
      throw new Error("El historial remoto de retiro no es verificable");
    }
  }
}

function retirementReadbackMatches(
  row: SyncEntityRow,
  batch: TestDocumentRetirementBatchV1,
): boolean {
  return (
    row.entity_type === "document_retirement_batch" &&
    row.entity_id === batch.batchId &&
    row.deleted === false &&
    row.updated_at === testDocumentRetirementBatchUpdatedAt(batch) &&
    isValidTestDocumentRetirementBatch(row.payload) &&
    row.payload.tenantFingerprint === batch.tenantFingerprint &&
    stableStringifySnapshot(row.payload) === stableStringifySnapshot(batch)
  );
}

async function writeRetirementBatchCas(
  userId: string,
  initialPlan: RetirementWritePlan,
  expectedTenant: string,
): Promise<void> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) throw new Error("La nube no está configurada");
  let plan = initialPlan;
  if (!plan.previous) {
    const row = { user_id: userId, ...batchToRow(plan.batch) };
    const inserted = await supabase
      .from(ENTITIES_TABLE)
      .insert(row)
      .select("entity_type, entity_id, payload, deleted, updated_at");
    if (
      !inserted.error &&
      inserted.data?.length === 1 &&
      retirementReadbackMatches(inserted.data[0] as SyncEntityRow, plan.batch)
    ) {
      return;
    }

    const currentRows = await pullRows(userId, {
      entityType: "document_retirement_batch",
    });
    validateRetirementRows(currentRows, expectedTenant);
    const current = currentRows.find(
      (entry) => entry.entity_id === plan.batch.batchId,
    );
    if (!current) {
      throw inserted.error ?? new Error("No se confirmó el lote de retiro");
    }
    const merged = mergeTestDocumentRetirementBatch(
      current.payload as TestDocumentRetirementBatchV1,
      plan.batch,
    );
    if (!merged) throw new Error("El historial remoto de retiro ha divergido");
    if (
      merged.events.length <=
      (current.payload as TestDocumentRetirementBatchV1).events.length
    ) {
      return;
    }
    plan = { batch: merged, previous: current };
  }

  const previous = plan.previous;
  if (!previous) return;
  const previousBatch = previous.payload as TestDocumentRetirementBatchV1;
  const row = { user_id: userId, ...batchToRow(plan.batch) };
  const updated = await supabase
    .from(ENTITIES_TABLE)
    .update(row)
    .eq("user_id", userId)
    .eq("entity_type", "document_retirement_batch")
    .eq("entity_id", plan.batch.batchId)
    .eq("deleted", false)
    .eq("updated_at", previous.updated_at)
    // El timestamp es la cabeza del último evento. Los dos campos JSON
    // pequeños evitan enviar el lote completo (que contiene snapshots/PDF) en
    // la URL de PostgREST y endurecen la precondición de estado/plan.
    .eq("payload->>planFingerprint", previousBatch.planFingerprint)
    .eq("payload->>status", previousBatch.status)
    .select("entity_type, entity_id, payload, deleted, updated_at");
  if (updated.error) throw updated.error;
  if (
    updated.data?.length !== 1 ||
    !retirementReadbackMatches(updated.data[0] as SyncEntityRow, plan.batch)
  ) {
    throw new Error("El historial remoto de retiro cambió antes de confirmar");
  }
}

async function pullRows(
  userId: string,
  options: { since?: string; entityType?: string } = {},
): Promise<SyncEntityRow[]> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return [];

  const rows: SyncEntityRow[] = [];

  for (let page = 0; ; page += 1) {
    const from = page * SYNC_PAGE_SIZE;
    const to = from + SYNC_PAGE_SIZE - 1;
    let query = supabase
      .from(ENTITIES_TABLE)
      .select("entity_type, entity_id, payload, deleted, updated_at")
      .eq("user_id", userId);

    if (options.entityType) {
      query = query.eq("entity_type", options.entityType);
    }

    query = query.order("updated_at", { ascending: true }).range(from, to);

    if (options.since) {
      query = query.gt("updated_at", options.since);
    }

    const { data, error } = await query;
    if (error) throw error;

    const pageRows = (data ?? []) as SyncEntityRow[];
    rows.push(...pageRows);
    if (pageRows.length < SYNC_PAGE_SIZE) break;
  }

  return rows;
}

export async function pullSyncChanges(
  userId: string,
  since?: string,
): Promise<SyncChange[]> {
  const incremental = await pullRows(userId, { since });
  const expectedTenant = testDocumentRetirementTenantFingerprintForUserId(userId);
  if (!since) {
    validateRetirementRows(incremental, expectedTenant);
    const fiscalRows = incremental.filter(
      (row) => row.entity_type === "fiscal_notifications_workspace",
    );
    let expectedFiscalOwner: string | null = null;
    if (fiscalRows.length > 0) {
      expectedFiscalOwner = fiscalNotificationsOwnerScopeForUserIdV1(userId);
      if (!expectedFiscalOwner) {
        throw new Error("La cuenta fiscal no es verificable");
      }
      validateFiscalNotificationsWorkspaceRows(
        fiscalRows,
        expectedFiscalOwner,
      );
    }
    return incremental.map((row) =>
      row.entity_type === "fiscal_notifications_workspace"
        ? fiscalRowToChange(row, expectedFiscalOwner!)
        : rowToChange(row),
    );
  }

  // Exclusiones y lotes de retiro son contratos monotónicos. Se descargan
  // siempre, aunque sean anteriores al watermark incremental, para que un
  // escritor obsoleto no los pierda al adelantar su lastSyncedAt.
  const monotonicRows = (
    await Promise.all(
      ALWAYS_PULL_ENTITY_TYPES.map((entityType) =>
        pullRows(userId, { entityType }),
      ),
    )
  ).flat();
  const byEntity = new Map<string, SyncEntityRow>();
  for (const row of [...incremental, ...monotonicRows]) {
    byEntity.set(`${row.entity_type}:${row.entity_id}`, row);
  }
  validateRetirementRows([...byEntity.values()], expectedTenant);
  const fiscalRows = [...byEntity.values()].filter(
    (row) => row.entity_type === "fiscal_notifications_workspace",
  );
  let expectedFiscalOwner: string | null = null;
  if (fiscalRows.length > 0) {
    expectedFiscalOwner = fiscalNotificationsOwnerScopeForUserIdV1(userId);
    if (!expectedFiscalOwner) {
      throw new Error("La cuenta fiscal no es verificable");
    }
    validateFiscalNotificationsWorkspaceRows(
      fiscalRows,
      expectedFiscalOwner,
    );
  }
  return [...byEntity.values()].map((row) =>
    row.entity_type === "fiscal_notifications_workspace"
      ? fiscalRowToChange(row, expectedFiscalOwner!)
      : rowToChange(row),
  );
}

/** Migra una copia completa antigua a entidades incrementales */
export async function migrateLegacyBackupToEntities(
  userId: string,
  data: AppData,
): Promise<void> {
  const changes = appDataToSyncChanges(data);
  await pushSyncChanges(userId, changes);
}

export async function fetchLegacyCloudBackup(
  userId: string,
): Promise<{ data: AppData; updated_at: string } | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(LEGACY_TABLE)
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    data: normalizeLoadedData(data.data as Partial<AppData>),
    updated_at: data.updated_at as string,
  };
}

export async function countSyncEntities(userId: string): Promise<number> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from(ENTITIES_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export { normalizeImportedCloudData };
