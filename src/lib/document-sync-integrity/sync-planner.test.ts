import { describe, expect, it } from "vitest";
import { planDocumentSyncMutation } from "./sync-planner";
import type {
  DocumentSyncCandidate,
  DocumentSyncCurrentState,
} from "./types";

const context = {
  userId: "user_server_1",
  scopeId: "workspace_1",
  requestId: "req_2c_planner",
  userIdSource: "server" as const,
};

function candidate(
  overrides: Partial<DocumentSyncCandidate> = {},
): DocumentSyncCandidate {
  return {
    operationKind: "update_draft",
    localDocumentId: "local_doc_1",
    expectedVersion: 4,
    payloadHash: "hash:new",
    requestedResponseShape: "safe_summary",
    context,
    ...overrides,
  };
}

function current(
  overrides: Partial<DocumentSyncCurrentState> = {},
): DocumentSyncCurrentState {
  return {
    exists: true,
    documentId: "server_doc_1",
    localDocumentId: "local_doc_1",
    userId: context.userId,
    scopeId: context.scopeId,
    version: 4,
    payloadHash: "hash:old",
    lifecycle: "draft",
    integrityLock: "unlocked",
    statusLegacy: "borrador",
    ...overrides,
  };
}

describe("document sync mutation planner", () => {
  it("crea borrador nuevo en dry-run", () => {
    const plan = planDocumentSyncMutation(
      candidate({
        operationKind: "create_draft",
        expectedVersion: undefined,
        payloadHash: "hash:create",
      }),
      null,
    );

    expect(plan.status).toBe("allowedMutation");
    expect(plan.dryRun).toBe(true);
    if (plan.status !== "allowedMutation") throw new Error("expected allowed");
    expect(plan.nextVersion).toBe(1);
  });

  it("planifica update draft sin mutar originales", () => {
    const sourceCandidate = candidate();
    const sourceCurrent = current();
    const beforeCandidate = JSON.stringify(sourceCandidate);
    const beforeCurrent = JSON.stringify(sourceCurrent);

    const plan = planDocumentSyncMutation(sourceCandidate, sourceCurrent);

    expect(plan.status).toBe("allowedMutation");
    if (plan.status !== "allowedMutation") throw new Error("expected allowed");
    expect(plan.nextVersion).toBe(5);
    expect(JSON.stringify(sourceCandidate)).toBe(beforeCandidate);
    expect(JSON.stringify(sourceCurrent)).toBe(beforeCurrent);
  });

  it("devuelve noop si no cambia nada", () => {
    const plan = planDocumentSyncMutation(
      candidate({ payloadHash: "hash:same" }),
      current({ payloadHash: "hash:same" }),
    );

    expect(plan.status).toBe("noop");
    if (plan.status !== "noop") throw new Error("expected noop");
    expect(plan.reason).toBe("no_effective_change");
  });

  it("devuelve conflicto por version antigua", () => {
    const plan = planDocumentSyncMutation(
      candidate({ expectedVersion: 3 }),
      current({ version: 4 }),
    );

    expect(plan.status).toBe("conflict");
    if (plan.status !== "conflict") throw new Error("expected conflict");
    expect(plan.conflict.conflictReason).toBe("expected_version_mismatch");
  });

  it("rechaza emitidos", () => {
    const plan = planDocumentSyncMutation(
      candidate(),
      current({ lifecycle: "issued", integrityLock: "locked" }),
    );

    expect(plan.status).toBe("rejectedMutation");
  });

  it("rechaza locked", () => {
    const plan = planDocumentSyncMutation(
      candidate(),
      current({ integrityLock: "locked" }),
    );

    expect(plan.status).toBe("rejectedMutation");
  });

  it("rechaza cambio de hash congelado", () => {
    const plan = planDocumentSyncMutation(
      candidate({ snapshotHash: "snapshot:new" }),
      current({ snapshotHash: "snapshot:old" }),
    );

    expect(plan.status).toBe("rejectedMutation");
    if (plan.status !== "rejectedMutation") throw new Error("expected rejected");
    expect(plan.rejection.code).toBe("SNAPSHOT_HASH_CHANGE");
  });

  it("rechaza scope cruzado", () => {
    const plan = planDocumentSyncMutation(
      candidate(),
      current({ scopeId: "workspace_other" }),
    );

    expect(plan.status).toBe("rejectedMutation");
    if (plan.status !== "rejectedMutation") throw new Error("expected rejected");
    expect(plan.rejection.code).toBe("CROSS_SCOPE_MUTATION");
  });
});
