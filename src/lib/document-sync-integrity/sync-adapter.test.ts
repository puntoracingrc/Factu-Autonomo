import { describe, expect, it } from "vitest";
import { createLocalStagingDocumentSyncAdapter } from "./sync-adapter";
import { createInMemoryDocumentSyncStore } from "./sync-store";
import type { DocumentSyncCandidate } from "./types";

const context = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
  requestId: "SYNTHETIC_ONLY_REQUEST",
  userIdSource: "test" as const,
};

function candidate(
  overrides: Partial<DocumentSyncCandidate> = {},
): DocumentSyncCandidate {
  return {
    operationKind: "create_draft",
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    payloadHash: "hash:create",
    requestedResponseShape: "safe_summary",
    context,
    ...overrides,
  };
}

describe("local/staging document sync adapter", () => {
  it("acepta create draft", () => {
    const adapter = createLocalStagingDocumentSyncAdapter();
    const result = adapter.apply(candidate());

    expect(result.status).toBe("accepted");
    expect(adapter.getSafeState(context).total).toBe(1);
  });

  it("acepta update draft", () => {
    const adapter = createLocalStagingDocumentSyncAdapter();
    adapter.apply(candidate());
    const result = adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:update",
      }),
    );

    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") throw new Error("expected accepted");
    expect(result.version).toBe(2);
  });

  it("update con version vieja crea conflict", () => {
    const adapter = createLocalStagingDocumentSyncAdapter();
    adapter.apply(candidate());
    adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:update",
      }),
    );
    const result = adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:old-device",
      }),
    );

    expect(result.status).toBe("conflict");
    expect(adapter.getConflictReport(context).totalConflicts).toBe(1);
  });

  it("rechaza issued, locked, canceled y legacy no borrador", () => {
    const cases = [
      { lifecycle: "issued" as const, integrityLock: "locked" as const },
      { lifecycle: "draft" as const, integrityLock: "locked" as const },
      { lifecycle: "canceled" as const },
      { statusLegacy: "enviado" },
    ];

    for (const [index, item] of cases.entries()) {
      const adapter = createLocalStagingDocumentSyncAdapter(
        createInMemoryDocumentSyncStore([
          {
            documentId: `SYNTHETIC_ONLY_DOC_${index}`,
            localDocumentId: `SYNTHETIC_ONLY_LOCAL_${index}`,
            userId: context.userId,
            scopeId: context.scopeId,
            version: 1,
            payloadHash: "hash:protected",
            lifecycle: item.lifecycle ?? "draft",
            integrityLock: item.integrityLock ?? "unlocked",
            statusLegacy: item.statusLegacy ?? "borrador",
          },
        ]),
      );
      const result = adapter.apply(
        candidate({
          operationKind: "update_draft",
          documentId: `SYNTHETIC_ONLY_DOC_${index}`,
          localDocumentId: `SYNTHETIC_ONLY_LOCAL_${index}`,
          expectedVersion: 1,
          payloadHash: "hash:update",
        }),
      );

      expect(result.status).toBe("rejected");
    }
  });

  it("rechaza cambio de hash congelado", () => {
    const adapter = createLocalStagingDocumentSyncAdapter(
      createInMemoryDocumentSyncStore([
        {
          documentId: "SYNTHETIC_ONLY_DOC_A",
          localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
          userId: context.userId,
          scopeId: context.scopeId,
          version: 1,
          payloadHash: "hash:payload",
          snapshotHash: "hash:snapshot-old",
          lifecycle: "draft",
          integrityLock: "unlocked",
          statusLegacy: "borrador",
        },
      ]),
    );

    const result = adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        snapshotHash: "hash:snapshot-new",
      }),
    );

    expect(result.status).toBe("rejected");
  });

  it("rechaza cross-user", () => {
    const adapter = createLocalStagingDocumentSyncAdapter(
      createInMemoryDocumentSyncStore([
        {
          documentId: "SYNTHETIC_ONLY_DOC_A",
          localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
          userId: "SYNTHETIC_ONLY_USER_B",
          scopeId: context.scopeId,
          version: 1,
          payloadHash: "hash:payload",
          lifecycle: "draft",
          integrityLock: "unlocked",
          statusLegacy: "borrador",
        },
      ]),
    );

    const result = adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
      }),
    );

    expect(result.status).toBe("conflict");
  });

  it("devuelve noop", () => {
    const adapter = createLocalStagingDocumentSyncAdapter();
    adapter.apply(candidate());
    const result = adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:create",
      }),
    );

    expect(result.status).toBe("noop");
  });

  it("conflict report es seguro y no filtra cuerpos", () => {
    const adapter = createLocalStagingDocumentSyncAdapter();
    const result = adapter.apply(
      candidate({
        operationKind: "update_draft",
        documentId: "SYNTHETIC_ONLY_MISSING",
        expectedVersion: 1,
      }),
    );

    expect(result.status).toBe("conflict");
    const serialized = JSON.stringify(adapter.getConflictReport(context));
    expect(serialized).not.toContain("payload completo");
    expect(serialized).not.toContain(`${["document", "Snapshot"].join("")}":`);
    expect(serialized).not.toContain(`${["pdf", "Snapshot"].join("")}":`);
  });
});
