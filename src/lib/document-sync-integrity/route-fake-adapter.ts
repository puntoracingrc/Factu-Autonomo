import {
  buildDocumentSyncServerCommand,
  type DocumentSyncServerAuthContext,
  type DocumentSyncServerCommandInput,
} from "./server-sync-command";
import {
  createInMemoryDocumentSyncServerAuditSink,
  type InMemoryDocumentSyncServerAuditSink,
} from "./server-sync-audit";
import {
  createDocumentSyncServerService,
  type DocumentSyncServerService,
} from "./server-sync-service";
import { createLocalStagingDocumentSyncAdapter } from "./sync-adapter";
import {
  createInMemoryDocumentSyncStore,
  type DocumentSyncStoreRecord,
} from "./sync-store";
import type { LocalStagingDocumentSyncAdapter } from "./sync-adapter";

// PHASE2C38_SYNC_ROUTE_FAKE_ADAPTER_FACTORY_V1
assertServerOnlyModule();

export const DOCUMENT_SYNC_ROUTE_FAKE_USER_ID = "SYNTHETIC_ONLY_ROUTE_USER";
export const DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID = "SYNTHETIC_ONLY_ROUTE_SCOPE";

export interface DocumentSyncRouteFakeRuntime {
  adapter: LocalStagingDocumentSyncAdapter;
  service: DocumentSyncServerService;
  auditSink: InMemoryDocumentSyncServerAuditSink;
  auth: DocumentSyncServerAuthContext;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El factory fake de document sync route solo puede cargarse en servidor.",
    );
  }
}

function isSynthetic(value: string | undefined | null): boolean {
  return typeof value === "string" && value.startsWith("SYNTHETIC_ONLY_");
}

function assertSyntheticRecord(record: DocumentSyncStoreRecord): void {
  const identifiers = [
    record.documentId,
    record.localDocumentId,
    record.userId,
    record.scopeId,
  ];
  if (!identifiers.every((value) => value === undefined || isSynthetic(value))) {
    throw new Error("Fake route adapter only accepts SYNTHETIC_ONLY_* records.");
  }
}

export function seedDocumentSyncRouteFakeStore(): DocumentSyncStoreRecord[] {
  const records: DocumentSyncStoreRecord[] = [
    {
      documentId: "SYNTHETIC_ONLY_DOC_EXISTING",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_EXISTING",
      userId: DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
      scopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
      version: 1,
      payloadHash: "hash:existing:v1",
      lifecycle: "draft",
      integrityLock: "unlocked",
      statusLegacy: "borrador",
    },
    {
      documentId: "SYNTHETIC_ONLY_DOC_PROTECTED",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_PROTECTED",
      userId: DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
      scopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
      version: 1,
      payloadHash: "hash:protected:v1",
      lifecycle: "issued",
      integrityLock: "locked",
      statusLegacy: "emitida",
    },
    {
      documentId: "SYNTHETIC_ONLY_DOC_CROSS_USER",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_CROSS_USER",
      userId: "SYNTHETIC_ONLY_OTHER_USER",
      scopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
      version: 1,
      payloadHash: "hash:cross-user:v1",
      lifecycle: "draft",
      integrityLock: "unlocked",
      statusLegacy: "borrador",
    },
  ];

  for (const record of records) assertSyntheticRecord(record);
  return records.map((record) => ({ ...record }));
}

export function createDocumentSyncRouteFakeAdapter(
  initialRecords: DocumentSyncStoreRecord[] = seedDocumentSyncRouteFakeStore(),
): LocalStagingDocumentSyncAdapter {
  for (const record of initialRecords) assertSyntheticRecord(record);
  return createLocalStagingDocumentSyncAdapter(
    createInMemoryDocumentSyncStore(initialRecords),
  );
}

export function createDocumentSyncRouteFakeService(
  adapter: LocalStagingDocumentSyncAdapter = createDocumentSyncRouteFakeAdapter(),
): DocumentSyncRouteFakeRuntime {
  const auditSink = createInMemoryDocumentSyncServerAuditSink();
  const auth: DocumentSyncServerAuthContext = {
    userId: DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
    scopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
    userIdSource: "test",
  };
  return {
    adapter,
    auditSink,
    auth,
    service: createDocumentSyncServerService({ adapter, auditSink }),
  };
}

export function buildDocumentSyncRouteFakeCommand(
  input: Omit<DocumentSyncServerCommandInput, "auth"> & {
    auth?: DocumentSyncServerAuthContext;
  },
  fallbackAuth: DocumentSyncServerAuthContext,
) {
  return buildDocumentSyncServerCommand({
    ...input,
    auth: input.auth ?? fallbackAuth,
  });
}
