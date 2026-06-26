import { DocumentSyncPolicyError } from "./errors";
import { buildDocumentSyncConflict } from "./sync-conflicts";
import { buildDocumentSyncSafeSummary } from "./sync-policy";
import type {
  DocumentSyncStoreOperationResult,
  DocumentSyncStoreRecord,
  DocumentSyncStoreScope,
} from "./sync-store";
import type {
  DocumentSyncCandidate,
  DocumentSyncConflict,
  DocumentSyncCurrentState,
} from "./types";
import {
  assertDocumentSyncSupabaseClientLike,
  assertDocumentSyncSupabaseScope,
  resolveDocumentSyncSupabaseAdapterOptions,
  type DocumentSyncSupabaseAdapterOptions,
  type DocumentSyncSupabaseClientLike,
  type DocumentSyncSupabaseErrorLike,
  type DocumentSyncSupabaseFilterBuilder,
  type DocumentSyncSupabaseStore,
} from "./supabase-contract";
import {
  DOCUMENT_SYNC_SUPABASE_CONFLICT_COLUMNS,
  DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS,
  mapDocumentSyncRecordToSupabaseInsert,
  mapDocumentSyncRecordToSupabaseUpdate,
  mapSupabaseConflictRowToSyncConflict,
  mapSupabaseDocumentRowToStoreRecord,
  mapSyncConflictToSupabaseConflictInsert,
} from "./supabase-mapping";

// PHASE2C15_SUPABASE_INJECTED_SYNC_STORE_V1
assertServerOnlyModule();

export class DocumentSyncSupabaseStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(operation: string, error: DocumentSyncSupabaseErrorLike) {
    super(`Error controlado en store Supabase de sincronizacion: ${operation}.`);
    this.name = "DocumentSyncSupabaseStoreError";
    this.operation = operation;
    this.causeCode = error.code;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El store Supabase local/staging de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function assertNoDbError(
  operation: string,
  error: DocumentSyncSupabaseErrorLike | null,
): asserts error is null {
  if (error) throw new DocumentSyncSupabaseStoreError(operation, error);
}

function scopeFromRecord(record: DocumentSyncStoreRecord): DocumentSyncStoreScope {
  return {
    userId: record.userId,
    scopeId: record.scopeId,
  };
}

function applyScopeFilters<T>(
  builder: DocumentSyncSupabaseFilterBuilder<T>,
  scope: DocumentSyncStoreScope,
): DocumentSyncSupabaseFilterBuilder<T> {
  const scoped = builder.eq("user_id", scope.userId);
  return scope.scopeId ? scoped.eq("scope_id", scope.scopeId) : scoped;
}

function isProtected(record: DocumentSyncStoreRecord): boolean {
  return (
    record.lifecycle !== "draft" ||
    record.integrityLock === "locked" ||
    Boolean(record.statusLegacy && record.statusLegacy !== "borrador")
  );
}

function toCurrentState(record: DocumentSyncStoreRecord): DocumentSyncCurrentState {
  return {
    exists: true,
    documentId: record.documentId,
    localDocumentId: record.localDocumentId,
    userId: record.userId,
    scopeId: record.scopeId,
    version: record.version,
    payloadHash: record.payloadHash,
    snapshotHash: record.snapshotHash,
    pdfSnapshotHash: record.pdfSnapshotHash,
    documentNumber: record.documentNumber,
    documentSeries: record.documentSeries,
    lifecycle: record.lifecycle,
    integrityLock: record.integrityLock,
    statusLegacy: record.statusLegacy,
    updatedAt: record.updatedAt,
  };
}

function candidateFromRecord(
  operationKind: DocumentSyncCandidate["operationKind"],
  record: DocumentSyncStoreRecord,
  expectedVersion?: number,
): DocumentSyncCandidate {
  return {
    operationKind,
    documentId: record.documentId,
    localDocumentId: record.localDocumentId,
    expectedVersion,
    candidateVersion: record.version,
    payloadHash: record.payloadHash,
    snapshotHash: record.snapshotHash,
    pdfSnapshotHash: record.pdfSnapshotHash,
    documentNumber: record.documentNumber,
    documentSeries: record.documentSeries,
    lifecycle: record.lifecycle,
    integrityLock: record.integrityLock,
    statusLegacy: record.statusLegacy,
    updatedAt: record.updatedAt,
    requestedResponseShape: "safe_summary",
    context: {
      userId: record.userId,
      scopeId: record.scopeId,
      userIdSource: "server",
    },
  };
}

function rejected(
  code: ConstructorParameters<typeof DocumentSyncPolicyError>[0],
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState | null,
): DocumentSyncStoreOperationResult {
  const error = new DocumentSyncPolicyError(code);
  return {
    status: "rejected",
    error,
    safeSummary: buildDocumentSyncSafeSummary(
      candidate,
      currentState,
      error.riskFlags,
    ),
  };
}

function conflict(
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState | null,
): DocumentSyncStoreOperationResult {
  const safeSummary = buildDocumentSyncSafeSummary(candidate, currentState, [
    "version_conflict",
  ]);
  return {
    status: "conflict",
    conflict: buildDocumentSyncConflict({
      candidate,
      currentState,
      conflictReason: currentState
        ? "expected_version_mismatch"
        : "document_not_found",
      safeSummary,
    }),
    safeSummary,
  };
}

function accepted(
  record: DocumentSyncStoreRecord,
  candidate: DocumentSyncCandidate,
): DocumentSyncStoreOperationResult {
  return {
    status: "accepted",
    record,
    safeSummary: buildDocumentSyncSafeSummary(candidate, toCurrentState(record)),
  };
}

function assertIntegerVersion(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

export function createSupabaseDocumentSyncStore(
  client: DocumentSyncSupabaseClientLike,
  options: DocumentSyncSupabaseAdapterOptions,
): DocumentSyncSupabaseStore {
  assertDocumentSyncSupabaseClientLike(client);
  const resolved = resolveDocumentSyncSupabaseAdapterOptions(options);

  function assertScope(scope: DocumentSyncStoreScope): void {
    assertDocumentSyncSupabaseScope(resolved.serverScope, scope);
  }

  function assertRecordScope(record: DocumentSyncStoreRecord): void {
    assertScope(scopeFromRecord(record));
  }

  async function selectById(
    documentId: string,
    scope: DocumentSyncStoreScope,
  ): Promise<DocumentSyncStoreRecord | null> {
    assertScope(scope);
    const { data, error } = await applyScopeFilters(
      client
        .from("server_documents")
        .select(DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS)
        .eq("id", documentId),
      scope,
    ).maybeSingle();

    assertNoDbError("get_by_id", error);
    return data ? mapSupabaseDocumentRowToStoreRecord(data) : null;
  }

  async function insertVersion(
    record: DocumentSyncStoreRecord,
    changeType: "create" | "update" | "delete",
    previous?: DocumentSyncStoreRecord | null,
  ): Promise<void> {
    const now = resolved.now();
    const versionRow = {
      id: resolved.idFactory("sync_version"),
      server_document_id: record.documentId,
      user_id: record.userId,
      scope_id: record.scopeId ?? null,
      version: record.version,
      change_type: changeType,
      payload_before_hash: previous?.payloadHash ?? null,
      payload_after_hash: changeType === "delete" ? null : record.payloadHash ?? null,
      changed_fields: ["sync_integrity_safe_fields"],
      actor_type: "sync",
      actor_id: null,
      created_at: now,
    };
    const { error } = await client
      .from("server_document_versions")
      .insert(versionRow)
      .select("id")
      .maybeSingle();

    assertNoDbError("insert_version", error);
  }

  return {
    async getById(documentId, scope) {
      return selectById(documentId, scope);
    },

    async listByScope(scope) {
      assertScope(scope);
      const { data, error } = await applyScopeFilters(
        client
          .from("server_documents")
          .select(DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS),
        scope,
      ).order("id", { ascending: true });

      assertNoDbError("list_by_scope", error);
      return (data ?? []).map(mapSupabaseDocumentRowToStoreRecord);
    },

    async putDraft(record) {
      assertRecordScope(record);
      const candidate = candidateFromRecord("create_draft", record);
      if (isProtected(record)) return rejected("PROTECTED_DOCUMENT", candidate, null);

      const now = resolved.now();
      const insertRecord = {
        ...record,
        version: Math.max(1, record.version || 1),
        updatedAt: record.updatedAt ?? now,
      };
      const { data, error } = await client
        .from("server_documents")
        .insert(mapDocumentSyncRecordToSupabaseInsert(insertRecord, now))
        .select(DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS)
        .single();

      assertNoDbError("put_draft", error);
      const stored = mapSupabaseDocumentRowToStoreRecord(data);
      await insertVersion(stored, "create");
      return accepted(stored, candidate);
    },

    async updateDraft(record, expectedVersion) {
      assertRecordScope(record);
      const candidate = candidateFromRecord(
        "update_draft",
        record,
        expectedVersion,
      );
      const current = await selectById(record.documentId, scopeFromRecord(record));
      if (!current) return conflict(candidate, null);
      const currentState = toCurrentState(current);

      if (isProtected(current)) {
        return rejected("PROTECTED_DOCUMENT", candidate, currentState);
      }
      if (!assertIntegerVersion(expectedVersion) || current.version !== expectedVersion) {
        return conflict(candidate, currentState);
      }

      const nextRecord: DocumentSyncStoreRecord = {
        ...record,
        documentId: current.documentId,
        localDocumentId: current.localDocumentId,
        userId: current.userId,
        scopeId: current.scopeId,
        version: current.version + 1,
        updatedAt: record.updatedAt ?? resolved.now(),
      };
      const { data, error } = await applyScopeFilters(
        client
          .from("server_documents")
          .update(
            mapDocumentSyncRecordToSupabaseUpdate(
              nextRecord,
              nextRecord.updatedAt ?? resolved.now(),
            ),
          )
          .eq("id", current.documentId)
          .eq("version", expectedVersion),
        scopeFromRecord(current),
      )
        .select(DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS)
        .maybeSingle();

      assertNoDbError("update_draft", error);
      if (!data) return conflict(candidate, currentState);
      const stored = mapSupabaseDocumentRowToStoreRecord(data);
      await insertVersion(stored, "update", current);
      return accepted(stored, candidate);
    },

    async deleteDraft(documentId, expectedVersion, scope) {
      assertScope(scope);
      const current = await selectById(documentId, scope);
      const candidate = candidateFromRecord(
        "delete_draft",
        current ?? {
          documentId,
          localDocumentId: documentId,
          userId: scope.userId,
          scopeId: scope.scopeId,
          version: expectedVersion,
          lifecycle: "draft",
          integrityLock: "unlocked",
          statusLegacy: "borrador",
        },
        expectedVersion,
      );

      if (!current) return conflict(candidate, null);
      const currentState = toCurrentState(current);
      if (isProtected(current)) {
        return rejected("PROTECTED_DOCUMENT", candidate, currentState);
      }
      if (!assertIntegerVersion(expectedVersion) || current.version !== expectedVersion) {
        return conflict(candidate, currentState);
      }

      const { error } = await applyScopeFilters(
        client
          .from("server_documents")
          .delete()
          .eq("id", documentId)
          .eq("version", expectedVersion),
        scope,
      )
        .select("id")
        .maybeSingle();

      assertNoDbError("delete_draft", error);
      await insertVersion(current, "delete", current);
      return {
        status: "deleted",
        documentId: current.documentId,
        localDocumentId: current.localDocumentId,
        safeSummary: buildDocumentSyncSafeSummary(candidate, currentState),
      };
    },

    async recordConflict(newConflict: DocumentSyncConflict) {
      const scope = {
        userId: newConflict.serverDerivedUserId,
        scopeId: newConflict.serverDerivedScopeId,
      };
      assertScope(scope);
      const { error } = await client
        .from("document_conflicts")
        .insert(
          mapSyncConflictToSupabaseConflictInsert(newConflict, {
            id: resolved.idFactory("sync_conflict"),
            createdAt: resolved.now(),
          }),
        )
        .select("id")
        .maybeSingle();

      assertNoDbError("record_conflict", error);
    },

    async getConflicts(scope) {
      assertScope(scope);
      const { data, error } = await applyScopeFilters(
        client
          .from("document_conflicts")
          .select(DOCUMENT_SYNC_SUPABASE_CONFLICT_COLUMNS),
        scope,
      ).order("created_at", { ascending: true });

      assertNoDbError("get_conflicts", error);
      return (data ?? []).map(mapSupabaseConflictRowToSyncConflict);
    },
  };
}
