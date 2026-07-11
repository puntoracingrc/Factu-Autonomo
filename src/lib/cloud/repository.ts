import { appDataToSyncChanges } from "./diff";
import { normalizeImportedCloudData } from "./incremental";
import type { SyncChange } from "./diff";
import { normalizeLoadedData } from "../storage";
import { getSupabaseClientAsync } from "../supabase/client";
import type { AppData } from "../types";

const ENTITIES_TABLE = "sync_entities";
const LEGACY_TABLE = "user_backups";
const SYNC_PAGE_SIZE = 500;
const MONOTONIC_EXCLUSION_TYPE = "recurring_occurrence_exclusion";

interface SyncEntityRow {
  entity_type: string;
  entity_id: string;
  payload: unknown;
  deleted: boolean;
  updated_at: string;
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

export async function pushSyncChanges(
  userId: string,
  changes: SyncChange[],
): Promise<string> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) throw new Error("La nube no está configurada");
  if (changes.length === 0) return new Date().toISOString();

  const syncedAt = new Date().toISOString();
  const rows = changes.map((change) => ({
    user_id: userId,
    entity_type: change.entityType,
    entity_id: change.entityId,
    payload: change.deleted ? null : (change.payload ?? null),
    deleted: change.deleted,
    updated_at: change.updatedAt || syncedAt,
  }));

  for (let index = 0; index < rows.length; index += SYNC_PAGE_SIZE) {
    const chunk = rows.slice(index, index + SYNC_PAGE_SIZE);
    const { error } = await supabase.from(ENTITIES_TABLE).upsert(chunk, {
      onConflict: "user_id,entity_type,entity_id",
    });
    if (error) throw error;
  }

  return syncedAt;
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
  if (!since) return incremental.map(rowToChange);

  // Estas filas son tombstones monotónicos. Se descargan siempre, aunque sean
  // anteriores al watermark incremental, para que un escritor obsoleto no las
  // pierda al adelantar su lastSyncedAt tras subir otros cambios.
  const exclusions = await pullRows(userId, {
    entityType: MONOTONIC_EXCLUSION_TYPE,
  });
  const byEntity = new Map<string, SyncEntityRow>();
  for (const row of [...incremental, ...exclusions]) {
    byEntity.set(`${row.entity_type}:${row.entity_id}`, row);
  }
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
