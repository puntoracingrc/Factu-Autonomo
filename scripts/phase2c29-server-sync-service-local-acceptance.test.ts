import { describe, expect, it } from "vitest";
import {
  buildDocumentSyncServerCommand,
  createDocumentSyncServerService,
  createInMemoryDocumentSyncServerAuditSink,
  createInMemoryDocumentSyncStore,
  createLocalStagingDocumentSyncAdapter,
} from "../src/lib/document-sync-integrity";

// PHASE2C29_SERVER_SYNC_SERVICE_LOCAL_ACCEPTANCE_V1

const enabled = process.env.PHASE2C29_SERVER_SYNC_SERVICE_LOCAL_ACCEPTANCE !== "false";
const describeLocal = enabled ? describe : describe.skip;

const auth = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
  requestId: "SYNTHETIC_ONLY_REQUEST_ACCEPTANCE",
  userIdSource: "test" as const,
};

const acceptanceMode = "in_memory_local_staging";

function initialRecords() {
  return [
    {
      documentId: "SYNTHETIC_ONLY_DOC_ISSUED",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_ISSUED",
      userId: auth.userId,
      scopeId: auth.scopeId,
      version: 1,
      payloadHash: "hash:issued",
      lifecycle: "issued" as const,
      integrityLock: "locked" as const,
      statusLegacy: "enviado",
    },
    {
      documentId: "SYNTHETIC_ONLY_DOC_LOCKED",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_LOCKED",
      userId: auth.userId,
      scopeId: auth.scopeId,
      version: 1,
      payloadHash: "hash:locked",
      lifecycle: "draft" as const,
      integrityLock: "locked" as const,
      statusLegacy: "borrador",
    },
    {
      documentId: "SYNTHETIC_ONLY_DOC_CANCELED",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_CANCELED",
      userId: auth.userId,
      scopeId: auth.scopeId,
      version: 1,
      payloadHash: "hash:canceled",
      lifecycle: "canceled" as const,
      integrityLock: "locked" as const,
      statusLegacy: "cancelado",
    },
    {
      documentId: "SYNTHETIC_ONLY_DOC_LEGACY",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_LEGACY",
      userId: auth.userId,
      scopeId: auth.scopeId,
      version: 1,
      payloadHash: "hash:legacy",
      lifecycle: "draft" as const,
      integrityLock: "unlocked" as const,
      statusLegacy: "enviado",
    },
  ];
}

function makeSubject() {
  const adapter = createLocalStagingDocumentSyncAdapter(
    createInMemoryDocumentSyncStore(initialRecords()),
  );
  const auditSink = createInMemoryDocumentSyncServerAuditSink();
  const service = createDocumentSyncServerService({ adapter, auditSink });
  return { adapter, auditSink, service };
}

function singleCommand(
  kind: "dry_run_single" | "apply_single",
  overrides: Record<string, unknown> = {},
) {
  return buildDocumentSyncServerCommand({
    kind,
    auth,
    payload: {
      operationKind: "create_draft",
      documentId: "SYNTHETIC_ONLY_DOC_CREATED",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_CREATED",
      payloadHash: "hash:create",
      ...overrides,
    },
  });
}

describeLocal("Phase 2C.29 server sync service local acceptance", () => {
  it("runs full server-only service acceptance in in-memory local staging mode", async () => {
    const subject = makeSubject();

    const dryRun = await subject.service.handle(
      singleCommand("dry_run_single", {
        documentId: "SYNTHETIC_ONLY_DOC_DRY_RUN",
        localDocumentId: "SYNTHETIC_ONLY_LOCAL_DRY_RUN",
      }),
    );
    expect(dryRun.status).toBe("accepted");
    expect(subject.adapter.getSafeState(auth).total).toBe(initialRecords().length);

    const created = await subject.service.handle(singleCommand("apply_single"));
    expect(created.status).toBe("accepted");

    const updated = await subject.service.handle(
      singleCommand("apply_single", {
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:update",
      }),
    );
    expect(updated.status).toBe("accepted");

    const stale = await subject.service.handle(
      singleCommand("apply_single", {
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:stale",
      }),
    );
    expect(stale.status).toBe("conflict");

    const batch = await subject.service.handle(
      buildDocumentSyncServerCommand({
        kind: "apply_batch",
        auth,
        batch: [
          {
            operationKind: "create_draft",
            documentId: "SYNTHETIC_ONLY_DOC_BATCH_OK",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_BATCH_OK",
            payloadHash: "hash:batch-ok",
          },
          {
            operationKind: "update_draft",
            documentId: "SYNTHETIC_ONLY_DOC_CREATED",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_CREATED",
            expectedVersion: 1,
            payloadHash: "hash:batch-conflict",
          },
          {
            operationKind: "update_draft",
            documentId: "SYNTHETIC_ONLY_DOC_ISSUED",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_ISSUED",
            expectedVersion: 1,
            payloadHash: "hash:batch-reject",
          },
        ],
      }),
    );
    expect(batch.status).toBe("batch_completed");
    expect(JSON.stringify(batch)).toContain("\"conflict\":1");
    expect(JSON.stringify(batch)).toContain("\"rejected\":1");

    for (const protectedDocument of [
      ["SYNTHETIC_ONLY_DOC_ISSUED", "SYNTHETIC_ONLY_LOCAL_ISSUED"],
      ["SYNTHETIC_ONLY_DOC_LOCKED", "SYNTHETIC_ONLY_LOCAL_LOCKED"],
      ["SYNTHETIC_ONLY_DOC_CANCELED", "SYNTHETIC_ONLY_LOCAL_CANCELED"],
      ["SYNTHETIC_ONLY_DOC_LEGACY", "SYNTHETIC_ONLY_LOCAL_LEGACY"],
    ] as const) {
      const result = await subject.service.handle(
        singleCommand("apply_single", {
          operationKind: "update_draft",
          documentId: protectedDocument[0],
          localDocumentId: protectedDocument[1],
          expectedVersion: 1,
          payloadHash: "hash:protected",
        }),
      );
      expect(result.status).toBe("rejected");
    }

    const crossUser = buildDocumentSyncServerCommand({
      kind: "apply_single",
      auth,
      payload: {
        operationKind: "update_draft",
        documentId: "SYNTHETIC_ONLY_DOC_CREATED",
        localDocumentId: "SYNTHETIC_ONLY_LOCAL_CREATED",
        expectedVersion: 2,
        payloadHash: "hash:cross",
      },
    });
    crossUser.candidates[0].candidate.context.userId = "SYNTHETIC_ONLY_OTHER_USER";
    expect((await subject.service.handle(crossUser)).status).toBe("rejected");

    const safeReport = await subject.service.handle(
      buildDocumentSyncServerCommand({ kind: "get_safe_report", auth }),
    );
    const serialized = JSON.stringify({
      mode: acceptanceMode,
      safeReport,
      audit: subject.auditSink.list(),
    });

    expect(safeReport.status).toBe("accepted");
    expect(serialized).not.toContain("document_snapshot");
    expect(serialized).not.toContain("pdf_snapshot");
    expect(serialized).not.toContain("payload\":{");
    expect(serialized).not.toContain("<" + "?xm" + "l");
  });
});
