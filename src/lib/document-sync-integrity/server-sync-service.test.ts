import { describe, expect, it } from "vitest";
import { createLocalStagingDocumentSyncAdapter } from "./sync-adapter";
import { createInMemoryDocumentSyncStore } from "./sync-store";
import {
  buildDocumentSyncServerCommand,
} from "./server-sync-command";
import { createDocumentSyncServerService } from "./server-sync-service";
import {
  createInMemoryDocumentSyncServerAuditSink,
} from "./server-sync-audit";

const auth = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
  requestId: "SYNTHETIC_ONLY_REQUEST_SERVICE",
  userIdSource: "test" as const,
};

function service() {
  const adapter = createLocalStagingDocumentSyncAdapter(
    createInMemoryDocumentSyncStore([
      {
        documentId: "SYNTHETIC_ONLY_DOC_EXISTING",
        localDocumentId: "SYNTHETIC_ONLY_LOCAL_EXISTING",
        userId: auth.userId,
        scopeId: auth.scopeId,
        version: 1,
        payloadHash: "hash:create",
        lifecycle: "draft",
        integrityLock: "unlocked",
        statusLegacy: "borrador",
      },
    ]),
  );
  const auditSink = createInMemoryDocumentSyncServerAuditSink();
  return {
    adapter,
    auditSink,
    service: createDocumentSyncServerService({ adapter, auditSink }),
  };
}

function command(kind: "dry_run_single" | "apply_single", extra = {}) {
  return buildDocumentSyncServerCommand({
    kind,
    auth,
    payload: {
      operationKind: "create_draft",
      documentId: "SYNTHETIC_ONLY_DOC_NEW",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_NEW",
      payloadHash: "hash:create",
      ...extra,
    },
  });
}

describe("document sync server service", () => {
  it("dryRunSingle planifica y no muta", async () => {
    const subject = service();
    const result = await subject.service.dryRunSingle(command("dry_run_single"));

    expect(result.status).toBe("accepted");
    expect(subject.adapter.getSafeState(auth).total).toBe(1);
  });

  it("applySingle aplica mediante adapter", async () => {
    const subject = service();
    const result = await subject.service.applySingle(command("apply_single"));

    expect(result.status).toBe("accepted");
    expect(subject.adapter.getSafeState(auth).total).toBe(2);
  });

  it("getSafeState devuelve estado seguro", async () => {
    const subject = service();
    const result = await subject.service.getSafeState(
      buildDocumentSyncServerCommand({ kind: "get_safe_state", auth }),
    );

    expect(result.status).toBe("accepted");
    expect(JSON.stringify(result)).not.toContain("payload\":{");
  });

  it("conflictReport y safeReport son seguros", async () => {
    const subject = service();
    await subject.service.applySingle(
      command("apply_single", {
        operationKind: "update_draft",
        documentId: "SYNTHETIC_ONLY_DOC_EXISTING",
        localDocumentId: "SYNTHETIC_ONLY_LOCAL_EXISTING",
        expectedVersion: 999,
        payloadHash: "hash:stale",
      }),
    );

    const conflictReport = await subject.service.getConflictReport(
      buildDocumentSyncServerCommand({ kind: "get_conflict_report", auth }),
    );
    const safeReport = await subject.service.getSafeReport(
      buildDocumentSyncServerCommand({ kind: "get_safe_report", auth }),
    );

    expect(conflictReport.status).toBe("accepted");
    expect(safeReport.status).toBe("accepted");
    expect(JSON.stringify({ conflictReport, safeReport })).not.toContain("payload\":{");
  });

  it("rejected si command invalido", async () => {
    const subject = service();
    const invalid = buildDocumentSyncServerCommand({
      kind: "apply_single",
      auth,
      payload: {
        operationKind: "create_draft",
        documentId: "SYNTHETIC_ONLY_DOC_BAD",
        localDocumentId: "SYNTHETIC_ONLY_LOCAL_BAD",
      },
    });
    invalid.candidates[0].candidate.context.userId = "SYNTHETIC_ONLY_OTHER";

    const result = await subject.service.handle(invalid);
    expect(result.status).toBe("rejected");
  });

  it("audita sin leaks", async () => {
    const subject = service();
    await subject.service.handle(command("apply_single"));

    const serialized = JSON.stringify(subject.auditSink.list());
    expect(subject.auditSink.list().length).toBeGreaterThanOrEqual(2);
    expect(serialized).not.toContain("payload\":{");
    expect(serialized).not.toContain("document_snapshot");
  });
});
