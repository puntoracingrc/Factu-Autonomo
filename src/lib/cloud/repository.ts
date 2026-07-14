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

type RetirementSyncChange = SyncChange & {
  entityType: "document_retirement_batch";
  deleted: false;
  payload: TestDocumentRetirementBatchV1;
};

function rowToChange(row: SyncEntityRow): SyncChange {
  return {
    entityType: row.entity_type as SyncChange["entityType"],
    entityId: row.entity_id,
    deleted: row.deleted,
    payload: row.payload,
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
  const retirementChanges: RetirementSyncChange[] = [];
  for (const change of changes) {
    if (change.entityType !== "document_retirement_batch") continue;
    if (
      change.deleted ||
      !isValidTestDocumentRetirementBatch(change.payload) ||
      change.payload.batchId !== change.entityId ||
      change.payload.tenantFingerprint !== expectedTenant
    ) {
      throw new Error("El historial local de retiro no es verificable");
    }
    retirementChanges.push(change as RetirementSyncChange);
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
    if (change.entityType === "document_retirement_batch") return false;
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

  for (const plan of plans.filter(
    (entry) => entry.batch.status === "rolled_back",
  )) {
    await writeRetirementBatchCas(userId, plan, expectedTenant);
  }

  return syncedAt;
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
    return incremental.map(rowToChange);
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
  return [...byEntity.values()].map(rowToChange);
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
