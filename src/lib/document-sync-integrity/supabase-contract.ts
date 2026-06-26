import type {
  DocumentSyncConflict,
  DocumentSyncIntegrityLock,
  DocumentSyncLifecycle,
} from "./types";
import type {
  DocumentSyncStoreOperationResult,
  DocumentSyncStoreRecord,
  DocumentSyncStoreScope,
} from "./sync-store";

// PHASE2C13_SUPABASE_LOCAL_SYNC_CONTRACT_V1
assertServerOnlyModule();

export type DocumentSyncSupabaseSafetyMode = "local_staging_only";

export type DocumentSyncSupabaseDatabaseTarget = "local" | "staging";

export interface DocumentSyncSupabaseErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface DocumentSyncSupabaseQueryResult<T> {
  data: T;
  error: DocumentSyncSupabaseErrorLike | null;
  count?: number | null;
}

export interface DocumentSyncSupabaseFilterBuilder<T>
  extends PromiseLike<DocumentSyncSupabaseQueryResult<T[] | null>> {
  eq(column: string, value: unknown): DocumentSyncSupabaseFilterBuilder<T>;
  limit(count: number): DocumentSyncSupabaseFilterBuilder<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): DocumentSyncSupabaseFilterBuilder<T>;
  select(columns?: string): DocumentSyncSupabaseFilterBuilder<T>;
  maybeSingle(): Promise<DocumentSyncSupabaseQueryResult<T | null>>;
  single(): Promise<DocumentSyncSupabaseQueryResult<T>>;
}

export interface DocumentSyncSupabaseTableClient {
  select(
    columns?: string,
  ): DocumentSyncSupabaseFilterBuilder<Record<string, unknown>>;
  insert(
    row: Record<string, unknown> | Record<string, unknown>[],
  ): DocumentSyncSupabaseFilterBuilder<Record<string, unknown>>;
  update(
    row: Record<string, unknown>,
  ): DocumentSyncSupabaseFilterBuilder<Record<string, unknown>>;
  delete(): DocumentSyncSupabaseFilterBuilder<Record<string, unknown>>;
}

export interface DocumentSyncSupabaseClientLike {
  from(table: string): DocumentSyncSupabaseTableClient;
}

export interface DocumentSyncSupabaseAdapterOptions {
  safetyMode?: DocumentSyncSupabaseSafetyMode;
  databaseTarget?: DocumentSyncSupabaseDatabaseTarget;
  remote?: false;
  serverScope: DocumentSyncStoreScope;
  now?: () => string;
  idFactory?: (prefix: string) => string;
}

export interface ResolvedDocumentSyncSupabaseAdapterOptions {
  safetyMode: DocumentSyncSupabaseSafetyMode;
  databaseTarget: DocumentSyncSupabaseDatabaseTarget;
  remote: false;
  serverScope: DocumentSyncStoreScope;
  now: () => string;
  idFactory: (prefix: string) => string;
}

export interface DocumentSyncSupabaseStore {
  getById(
    documentId: string,
    scope: DocumentSyncStoreScope,
  ): Promise<DocumentSyncStoreRecord | null>;
  listByScope(scope: DocumentSyncStoreScope): Promise<DocumentSyncStoreRecord[]>;
  putDraft(
    record: DocumentSyncStoreRecord,
  ): Promise<DocumentSyncStoreOperationResult>;
  updateDraft(
    record: DocumentSyncStoreRecord,
    expectedVersion: number,
  ): Promise<DocumentSyncStoreOperationResult>;
  deleteDraft(
    documentId: string,
    expectedVersion: number,
    scope: DocumentSyncStoreScope,
  ): Promise<DocumentSyncStoreOperationResult>;
  recordConflict(conflict: DocumentSyncConflict): Promise<void>;
  getConflicts(scope: DocumentSyncStoreScope): Promise<DocumentSyncConflict[]>;
}

export interface DocumentSyncSupabaseRow {
  id: string;
  user_id: string;
  scope_id?: string | null;
  local_document_id: string;
  version: number;
  document_lifecycle: DocumentSyncLifecycle;
  integrity_lock: DocumentSyncIntegrityLock;
  status_legacy?: string | null;
  payload_hash?: string | null;
  snapshot_hash?: string | null;
  pdf_content_hash?: string | null;
  numserie?: string | null;
  document_series?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DocumentSyncSupabaseVersionRow {
  id: string;
  server_document_id: string;
  user_id: string;
  scope_id?: string | null;
  version: number;
  change_type: "create" | "update" | "delete" | "sync";
  payload_before_hash?: string | null;
  payload_after_hash?: string | null;
  changed_fields: string[];
  actor_type: "sync";
  actor_id?: string | null;
  created_at: string;
}

export interface DocumentSyncSupabaseConflictRow {
  id: string;
  user_id: string;
  scope_id?: string | null;
  server_document_id?: string | null;
  local_document_id: string;
  conflict_type:
    | "version"
    | "snapshot"
    | "delete"
    | "numbering"
    | "integrity_lock"
    | "payload"
    | "unknown";
  incoming_payload_hash?: string | null;
  server_payload_hash?: string | null;
  local_version?: number | null;
  remote_version?: number | null;
  expected_version?: number | null;
  resolution_status: "open" | "ignored" | "resolved";
  created_at: string;
  resolved_at?: string | null;
}

export class DocumentSyncSupabaseSafetyError extends Error {
  readonly code:
    | "INVALID_SUPABASE_SYNC_CLIENT"
    | "INVALID_SUPABASE_SYNC_MODE"
    | "MISSING_SERVER_SCOPE"
    | "PRODUCTION_SUPABASE_REJECTED"
    | "REMOTE_SUPABASE_REJECTED"
    | "CROSS_SCOPE_SUPABASE_SYNC";

  constructor(code: DocumentSyncSupabaseSafetyError["code"], message: string) {
    super(message);
    this.name = "DocumentSyncSupabaseSafetyError";
    this.code = code;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El contrato Supabase local/staging de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultIdFactory(prefix: string): string {
  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, "_");
  return `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function assertDocumentSyncSupabaseClientLike(
  client: unknown,
): asserts client is DocumentSyncSupabaseClientLike {
  if (
    !client ||
    typeof client !== "object" ||
    typeof (client as { from?: unknown }).from !== "function"
  ) {
    throw new DocumentSyncSupabaseSafetyError(
      "INVALID_SUPABASE_SYNC_CLIENT",
      "El adaptador Supabase de sincronizacion documental requiere cliente inyectado.",
    );
  }
}

export function resolveDocumentSyncSupabaseAdapterOptions(
  options: DocumentSyncSupabaseAdapterOptions,
): ResolvedDocumentSyncSupabaseAdapterOptions {
  const safetyMode = options.safetyMode ?? "local_staging_only";
  const databaseTarget = options.databaseTarget ?? "local";
  const remote = options.remote ?? false;

  if (safetyMode !== "local_staging_only") {
    throw new DocumentSyncSupabaseSafetyError(
      "INVALID_SUPABASE_SYNC_MODE",
      "Solo se permite el modo local_staging_only.",
    );
  }

  if ((databaseTarget as string) === "production") {
    throw new DocumentSyncSupabaseSafetyError(
      "PRODUCTION_SUPABASE_REJECTED",
      "El adaptador de sincronizacion documental rechaza produccion.",
    );
  }

  if (remote !== false) {
    throw new DocumentSyncSupabaseSafetyError(
      "REMOTE_SUPABASE_REJECTED",
      "El adaptador de sincronizacion documental rechaza conexiones remotas.",
    );
  }

  if (!isNonEmptyString(options.serverScope?.userId)) {
    throw new DocumentSyncSupabaseSafetyError(
      "MISSING_SERVER_SCOPE",
      "El usuario derivado por servidor es obligatorio.",
    );
  }

  return {
    safetyMode,
    databaseTarget,
    remote: false,
    serverScope: { ...options.serverScope },
    now: options.now ?? defaultNow,
    idFactory: options.idFactory ?? defaultIdFactory,
  };
}

export function assertDocumentSyncSupabaseScope(
  expected: DocumentSyncStoreScope,
  actual: DocumentSyncStoreScope,
): void {
  if (
    expected.userId !== actual.userId ||
    (expected.scopeId ?? undefined) !== (actual.scopeId ?? undefined)
  ) {
    throw new DocumentSyncSupabaseSafetyError(
      "CROSS_SCOPE_SUPABASE_SYNC",
      "La operacion de sincronizacion no coincide con el scope derivado por servidor.",
    );
  }
}
