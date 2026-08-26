import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1,
  fiscalNotificationsOwnerScopeForUserIdV1,
  parseFiscalNotificationsWorkspaceForPersistenceV1,
} from "./workspace-persistence.v1";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
  compareFiscalNotificationsWorkspaceStorageEnvelopesV2,
  encodeFiscalNotificationsWorkspaceForStorageV2,
  isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2,
  parseFiscalNotificationsWorkspaceStorageEnvelopeV2,
  type FiscalNotificationsWorkspaceStorageEnvelopeV2,
} from "./workspace-storage-envelope.v2";
import { fiscalWorkspaceDivergedSyncError } from "@/lib/cloud/sync-errors";
import type { SyncChange } from "@/lib/cloud/diff";

const TABLE = "workspace_auxiliary_entities";
const ENTITY_TYPE = "fiscal_notifications_workspace";
const MAX_CAS_ATTEMPTS = 3;

interface WorkspaceRow {
  entity_type: string;
  entity_id: string;
  payload: unknown;
  deleted: boolean;
  updated_at: string;
}

type WorkspaceChange = SyncChange & {
  entityType: typeof ENTITY_TYPE;
  deleted: false;
  payload: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>;
};

interface WorkspaceWritePlan {
  workspace: Readonly<FiscalNotificationsWorkspaceStorageEnvelopeV2>;
  updatedAt: string;
  previous?: WorkspaceRow;
}

function timestampMilliseconds(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestampsReferToSameInstant(left: string, right: string): boolean {
  const leftMilliseconds = timestampMilliseconds(left);
  const rightMilliseconds = timestampMilliseconds(right);
  return (
    leftMilliseconds !== null &&
    rightMilliseconds !== null &&
    leftMilliseconds === rightMilliseconds
  );
}

function nextWorkspaceUpdatedAt(
  current: string,
  preferred: string,
  fallback: string,
): string {
  const currentMilliseconds = timestampMilliseconds(current);
  const preferredMilliseconds = timestampMilliseconds(preferred);
  if (
    preferredMilliseconds !== null &&
    (currentMilliseconds === null ||
      preferredMilliseconds > currentMilliseconds)
  ) {
    return new Date(preferredMilliseconds).toISOString();
  }

  const fallbackMilliseconds = timestampMilliseconds(fallback);
  return new Date(
    Math.max(
      Date.now(),
      fallbackMilliseconds ?? 0,
      currentMilliseconds === null ? 0 : currentMilliseconds + 1,
    ),
  ).toISOString();
}

function workspaceEnvelope(
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
  return legacy ? encodeFiscalNotificationsWorkspaceForStorageV2(legacy) : null;
}

function validateRows(
  rows: readonly WorkspaceRow[],
  expectedOwnerScope: string,
): void {
  if (rows.length > 1) {
    throw new Error("La nube contiene mas de una cabeza fiscal");
  }
  for (const row of rows) {
    if (
      row.entity_type !== ENTITY_TYPE ||
      (row.entity_id !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 &&
        row.entity_id !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2) ||
      row.deleted ||
      !workspaceEnvelope(row.payload, expectedOwnerScope)
    ) {
      throw new Error("El expediente fiscal remoto no es verificable");
    }
  }
}

function canReplaceUnverifiableHead(
  rows: readonly WorkspaceRow[],
  changes: readonly WorkspaceChange[],
  expectedOwnerScope: string,
): boolean {
  if (rows.length !== 1 || changes.length !== 1) return false;
  const row = rows[0]!;
  const change = changes[0]!;
  if (
    row.entity_type !== ENTITY_TYPE ||
    (row.entity_id !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 &&
      row.entity_id !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2) ||
    row.deleted ||
    workspaceEnvelope(row.payload, expectedOwnerScope) !== null
  ) {
    return false;
  }
  const parsed = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    change.payload,
    expectedOwnerScope,
  );
  return Boolean(
    parsed?.transition?.kind === "USER_CONFIRMED_EMPTY_RESTART_V1" &&
      isFiscalNotificationsWorkspaceStorageEnvelopeEmptyV2(parsed),
  );
}

async function pullRows(userId: string): Promise<WorkspaceRow[]> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select("entity_type, entity_id, payload, deleted, updated_at")
    .eq("user_id", userId)
    .eq("entity_type", ENTITY_TYPE)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkspaceRow[];
}

function rowMatches(
  row: WorkspaceRow,
  plan: WorkspaceWritePlan,
  expectedOwnerScope: string,
): boolean {
  const parsed = parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
    row.payload,
    expectedOwnerScope,
  );
  return Boolean(
    row.entity_type === ENTITY_TYPE &&
      row.entity_id === FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2 &&
      !row.deleted &&
      timestampsReferToSameInstant(row.updated_at, plan.updatedAt) &&
      parsed &&
      stableStringifySnapshot(parsed) ===
        stableStringifySnapshot(plan.workspace),
  );
}

function rowForWrite(userId: string, plan: WorkspaceWritePlan) {
  return {
    user_id: userId,
    entity_type: ENTITY_TYPE,
    entity_id: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    payload: plan.workspace,
    deleted: false,
    updated_at: plan.updatedAt,
  };
}

async function writeCas(
  userId: string,
  initialPlan: WorkspaceWritePlan,
  expectedOwnerScope: string,
  syncedAt: string,
): Promise<void> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) throw new Error("La nube no esta configurada");
  let plan = initialPlan;

  if (!plan.previous) {
    const inserted = await supabase
      .from(TABLE)
      .insert(rowForWrite(userId, plan))
      .select("entity_type, entity_id, payload, deleted, updated_at");
    if (
      !inserted.error &&
      inserted.data?.length === 1 &&
      rowMatches(inserted.data[0] as WorkspaceRow, plan, expectedOwnerScope)
    ) {
      return;
    }

    const currentRows = await pullRows(userId);
    validateRows(currentRows, expectedOwnerScope);
    const current = currentRows[0];
    if (!current) {
      throw inserted.error ?? new Error("No se confirmo el expediente fiscal");
    }
    const currentWorkspace = workspaceEnvelope(
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
      throw fiscalWorkspaceDivergedSyncError();
    }
    plan = {
      ...plan,
      updatedAt: nextWorkspaceUpdatedAt(
        current.updated_at,
        plan.updatedAt,
        syncedAt,
      ),
      previous: current,
    };
  }

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
    const previous = plan.previous;
    if (!previous) return;
    const updated = await supabase
      .from(TABLE)
      .update(rowForWrite(userId, plan))
      .eq("user_id", userId)
      .eq("entity_type", ENTITY_TYPE)
      .eq("entity_id", previous.entity_id)
      .eq("deleted", false)
      .eq("updated_at", previous.updated_at)
      .select("entity_type, entity_id, payload, deleted, updated_at");
    if (updated.error) throw updated.error;
    if (
      updated.data?.length === 1 &&
      rowMatches(updated.data[0] as WorkspaceRow, plan, expectedOwnerScope)
    ) {
      return;
    }

    const currentRows = await pullRows(userId);
    validateRows(currentRows, expectedOwnerScope);
    const current = currentRows[0];
    if (!current) {
      throw new Error("El expediente fiscal remoto desaparecio al confirmar");
    }
    const currentWorkspace = workspaceEnvelope(
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
      throw fiscalWorkspaceDivergedSyncError();
    }
    if (attempt === MAX_CAS_ATTEMPTS - 1) {
      throw new Error(
        "El expediente fiscal remoto volvio a cambiar antes de confirmar",
      );
    }
    plan = {
      ...plan,
      updatedAt: nextWorkspaceUpdatedAt(
        current.updated_at,
        plan.updatedAt,
        syncedAt,
      ),
      previous: current,
    };
  }
}

export async function pushFiscalNotificationsWorkspaceChanges(
  userId: string,
  changes: readonly SyncChange[],
): Promise<string> {
  const expectedOwnerScope = fiscalNotificationsOwnerScopeForUserIdV1(userId);
  if (!expectedOwnerScope) {
    throw new Error("La cuenta fiscal no es verificable");
  }
  const syncedAt = new Date().toISOString();
  const workspaceChanges: WorkspaceChange[] = [];

  for (const change of changes) {
    if (change.entityType !== ENTITY_TYPE) continue;
    const workspace =
      !change.deleted &&
      (change.entityId === FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 ||
        change.entityId === FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2)
        ? workspaceEnvelope(change.payload, expectedOwnerScope)
        : null;
    if (!workspace) {
      throw new Error("El expediente fiscal local no es verificable");
    }
    workspaceChanges.push({
      ...change,
      deleted: false,
      payload: workspace,
    } as WorkspaceChange);
  }
  if (workspaceChanges.length === 0) return syncedAt;
  if (workspaceChanges.length > 1) {
    throw new Error("La cola contiene mas de una cabeza fiscal");
  }

  const remoteRows = await pullRows(userId);
  const mayReplace = canReplaceUnverifiableHead(
    remoteRows,
    workspaceChanges,
    expectedOwnerScope,
  );
  if (!mayReplace) validateRows(remoteRows, expectedOwnerScope);

  const change = workspaceChanges[0]!;
  const previous = remoteRows[0];
  if (!previous) {
    await writeCas(
      userId,
      { workspace: change.payload, updatedAt: change.updatedAt || syncedAt },
      expectedOwnerScope,
      syncedAt,
    );
    return syncedAt;
  }

  const remoteWorkspace = workspaceEnvelope(
    previous.payload,
    expectedOwnerScope,
  );
  if (!remoteWorkspace) {
    if (!mayReplace) {
      throw new Error("El expediente fiscal remoto no es verificable");
    }
    await writeCas(
      userId,
      {
        workspace: change.payload,
        updatedAt: nextWorkspaceUpdatedAt(
          previous.updated_at,
          change.updatedAt,
          syncedAt,
        ),
        previous,
      },
      expectedOwnerScope,
      syncedAt,
    );
    return syncedAt;
  }

  const comparison = compareFiscalNotificationsWorkspaceStorageEnvelopesV2(
    remoteWorkspace,
    change.payload,
    expectedOwnerScope,
  );
  if (comparison === "DIVERGED") throw fiscalWorkspaceDivergedSyncError();
  if (comparison === "INCOMING_ADVANCES") {
    await writeCas(
      userId,
      {
        workspace: change.payload,
        updatedAt: nextWorkspaceUpdatedAt(
          previous.updated_at,
          change.updatedAt,
          syncedAt,
        ),
        previous,
      },
      expectedOwnerScope,
      syncedAt,
    );
  }
  return syncedAt;
}

export async function pullFiscalNotificationsWorkspaceChanges(
  userId: string,
): Promise<SyncChange[]> {
  const rows = await pullRows(userId);
  if (rows.length === 0) return [];
  const expectedOwnerScope = fiscalNotificationsOwnerScopeForUserIdV1(userId);
  if (!expectedOwnerScope) {
    throw new Error("La cuenta fiscal no es verificable");
  }
  validateRows(rows, expectedOwnerScope);
  const row = rows[0]!;
  return [
    {
      entityType: ENTITY_TYPE,
      entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
      deleted: false,
      payload: workspaceEnvelope(row.payload, expectedOwnerScope)!,
      updatedAt: row.updated_at,
    },
  ];
}
