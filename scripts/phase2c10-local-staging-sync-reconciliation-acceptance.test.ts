import { describe, expect, it } from "vitest";
import {
  buildDocumentSyncSafeReport,
  createInMemoryDocumentSyncStore,
  createLocalStagingDocumentSyncAdapter,
  type DocumentSyncCandidate,
  type DocumentSyncStoreRecord,
} from "../src/lib/document-sync-integrity";

const scope = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
};

function candidate(
  overrides: Partial<DocumentSyncCandidate> = {},
): DocumentSyncCandidate {
  return {
    operationKind: "update_draft",
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    expectedVersion: 1,
    payloadHash: "hash:device",
    requestedResponseShape: "safe_summary",
    context: {
      ...scope,
      requestId: "SYNTHETIC_ONLY_REQUEST",
      userIdSource: "test",
    },
    ...overrides,
  };
}

function record(
  overrides: Partial<DocumentSyncStoreRecord> = {},
): DocumentSyncStoreRecord {
  return {
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    userId: scope.userId,
    scopeId: scope.scopeId,
    version: 1,
    payloadHash: "hash:initial",
    lifecycle: "draft",
    integrityLock: "unlocked",
    statusLegacy: "borrador",
    ...overrides,
  };
}

describe("PHASE2C10_LOCAL_STAGING_SYNC_RECONCILIATION_ACCEPTANCE_V1", () => {
  it("reconcilia borrador sintetico entre dispositivos y detecta version antigua", () => {
    const adapter = createLocalStagingDocumentSyncAdapter();

    const deviceACreate = adapter.apply(
      candidate({
        operationKind: "create_draft",
        expectedVersion: undefined,
        payloadHash: "hash:device-a-create",
      }),
    );
    expect(deviceACreate.status).toBe("accepted");

    const deviceBUpdate = adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:device-b-update",
      }),
    );
    expect(deviceBUpdate.status).toBe("accepted");

    const staleDeviceAUpdate = adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:device-a-stale",
      }),
    );
    expect(staleDeviceAUpdate.status).toBe("conflict");
  });

  it("bloquea issued, locked y legacy no borrador", () => {
    const protectedRecords: DocumentSyncStoreRecord[] = [
      record({ documentId: "SYNTHETIC_ONLY_ISSUED", lifecycle: "issued" }),
      record({
        documentId: "SYNTHETIC_ONLY_LOCKED",
        lifecycle: "draft",
        integrityLock: "locked",
      }),
      record({
        documentId: "SYNTHETIC_ONLY_LEGACY",
        lifecycle: "draft",
        statusLegacy: "enviado",
      }),
    ];

    for (const item of protectedRecords) {
      const adapter = createLocalStagingDocumentSyncAdapter(
        createInMemoryDocumentSyncStore([item]),
      );
      const result = adapter.apply(
        candidate({
          documentId: item.documentId,
          localDocumentId: item.localDocumentId,
          expectedVersion: 1,
          payloadHash: "hash:attempt",
        }),
      );

      expect(result.status).toBe("rejected");
    }
  });

  it("bloquea canceled", () => {
    const adapter = createLocalStagingDocumentSyncAdapter(
      createInMemoryDocumentSyncStore([record({ lifecycle: "canceled" })]),
    );

    expect(adapter.apply(candidate({ payloadHash: "hash:attempt" })).status).toBe(
      "rejected",
    );
  });

  it("rechaza cambios de hashes congelados y numeracion", () => {
    const cases = [
      {
        current: record({ snapshotHash: "hash:snapshot-old" }),
        incoming: candidate({ snapshotHash: "hash:snapshot-new" }),
      },
      {
        current: record({ pdfSnapshotHash: "hash:pdf-old" }),
        incoming: candidate({ pdfSnapshotHash: "hash:pdf-new" }),
      },
      {
        current: record({ documentNumber: "F-2026-0001" }),
        incoming: candidate({ documentNumber: "F-2026-0002" }),
      },
    ];

    for (const item of cases) {
      const adapter = createLocalStagingDocumentSyncAdapter(
        createInMemoryDocumentSyncStore([item.current]),
      );
      const result = adapter.apply(item.incoming);

      expect(result.status).toBe("rejected");
    }
  });

  it("rechaza cross-user y cross-scope desde payload no confiable", () => {
    const adapter = createLocalStagingDocumentSyncAdapter(
      createInMemoryDocumentSyncStore([record()]),
    );

    expect(
      adapter.apply(
        candidate({
          payloadUserId: "SYNTHETIC_ONLY_USER_B",
          payloadHash: "hash:user-cross",
        }),
      ).status,
    ).toBe("rejected");
    expect(
      adapter.apply(
        candidate({
          payloadScopeId: "SYNTHETIC_ONLY_SCOPE_B",
          payloadHash: "hash:scope-cross",
        }),
      ).status,
    ).toBe("rejected");
  });

  it("conflict report y safe report no contienen cuerpos completos", () => {
    const adapter = createLocalStagingDocumentSyncAdapter();
    adapter.apply(
      candidate({
        operationKind: "update_draft",
        documentId: "SYNTHETIC_ONLY_MISSING",
        localDocumentId: "SYNTHETIC_ONLY_MISSING_LOCAL",
      }),
    );
    const report = buildDocumentSyncSafeReport(adapter, scope);
    const serialized = JSON.stringify({
      conflicts: adapter.getConflictReport(scope),
      report,
    });

    expect(serialized).not.toContain("payload completo");
    expect(serialized).not.toContain(`${["document", "Snapshot"].join("")}":`);
    expect(serialized).not.toContain(`${["pdf", "Snapshot"].join("")}":`);
  });

  it("runtime local/staging no usa Supabase, red ni fs", () => {
    const runtime = `${createLocalStagingDocumentSyncAdapter.toString()}
${createInMemoryDocumentSyncStore.toString()}
${buildDocumentSyncSafeReport.toString()}`;

    expect(runtime).not.toContain(["@", "supabase"].join(""));
    expect(runtime).not.toContain(["fe", "tch"].join(""));
    expect(runtime).not.toContain(["ax", "ios"].join(""));
    expect(runtime).not.toContain(["node:", "fs"].join(""));
  });
});
