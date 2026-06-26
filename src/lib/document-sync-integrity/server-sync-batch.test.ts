import { describe, expect, it } from "vitest";
import {
  buildDocumentSyncServerCommand,
  type DocumentSyncServerCommandPayload,
} from "./server-sync-command";
import {
  applyDocumentSyncBatch,
  planDocumentSyncBatch,
  summarizeDocumentSyncBatchResult,
  type DocumentSyncServerBatchAdapter,
} from "./server-sync-batch";
import { buildDocumentSyncSafeSummary } from "./sync-policy";
import type { DocumentSyncCandidate } from "./types";

const auth = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
  requestId: "SYNTHETIC_ONLY_REQUEST_BATCH",
  userIdSource: "test" as const,
};

function candidatePayload(
  localDocumentId: string,
  extra: Record<string, unknown> = {},
): DocumentSyncServerCommandPayload {
  return {
    operationKind: "update_draft",
    documentId: localDocumentId.replace("LOCAL", "DOC"),
    localDocumentId,
    expectedVersion: 1,
    payloadHash: "hash:update",
    ...extra,
  } as DocumentSyncServerCommandPayload;
}

function summary(candidate: DocumentSyncCandidate) {
  return buildDocumentSyncSafeSummary(candidate, {
    exists: true,
    documentId: candidate.documentId ?? "SYNTHETIC_ONLY_DOC",
    localDocumentId: candidate.localDocumentId,
    userId: candidate.context.userId,
    scopeId: candidate.context.scopeId,
    version: 1,
    lifecycle: "draft",
    integrityLock: "unlocked",
    statusLegacy: "borrador",
  });
}

function adapter(): DocumentSyncServerBatchAdapter {
  return {
    plan: async (candidate) => {
      if (candidate.localDocumentId.includes("CONFLICT")) {
        return {
          status: "conflict",
          dryRun: true,
          operationKind: candidate.operationKind,
          conflict: {
            documentId: candidate.documentId,
            localDocumentId: candidate.localDocumentId,
            serverDerivedUserId: candidate.context.userId,
            serverDerivedScopeId: candidate.context.scopeId,
            expectedVersion: candidate.expectedVersion,
            conflictReason: "expected_version_mismatch",
            safeSummary: summary(candidate),
          },
          safeSummary: summary(candidate),
        };
      }
      if (candidate.localDocumentId.includes("REJECT")) {
        return {
          status: "rejectedMutation",
          dryRun: true,
          operationKind: candidate.operationKind,
          rejection: { code: "PROTECTED_DOCUMENT", message: "blocked" },
          safeSummary: summary(candidate),
        };
      }
      return {
        status: "allowedMutation",
        dryRun: true,
        operationKind: candidate.operationKind,
        localDocumentId: candidate.localDocumentId,
        targetDocumentId: candidate.documentId,
        expectedVersion: candidate.expectedVersion,
        nextVersion: 2,
        safeSummary: summary(candidate),
      };
    },
    apply: async (candidate) => {
      const plan = await adapter().plan(candidate);
      if (plan.status === "conflict") {
        return {
          status: "conflict",
          decisionStatus: "conflict",
          conflict: plan.conflict,
          safeSummary: plan.safeSummary,
        };
      }
      if (plan.status === "rejectedMutation") {
        return {
          status: "rejected",
          decisionStatus: "rejected",
          reason: plan.rejection.code,
          message: plan.rejection.message,
          safeSummary: plan.safeSummary,
        };
      }
      return {
        status: "accepted",
        decisionStatus: "accepted",
        version: 2,
        safeSummary: plan.safeSummary,
      };
    },
  };
}

describe("server sync batch processing", () => {
  it("batch vacio devuelve noop controlado", async () => {
    const command = buildDocumentSyncServerCommand({
      kind: "dry_run_batch",
      auth,
      batch: [],
    });

    const result = await planDocumentSyncBatch(adapter(), command);
    expect(result.status).toBe("noop");
    expect(result.items).toEqual([]);
  });

  it("batch valido con dos drafts preserva orden", async () => {
    const command = buildDocumentSyncServerCommand({
      kind: "apply_batch",
      auth,
      batch: [
        candidatePayload("SYNTHETIC_ONLY_LOCAL_1"),
        candidatePayload("SYNTHETIC_ONLY_LOCAL_2"),
      ],
    });

    const result = await applyDocumentSyncBatch(adapter(), command);
    expect(result.status).toBe("accepted");
    expect(result.items.map((item) => item.index)).toEqual([0, 1]);
  });

  it("batch mixto accepted conflict rejected no detiene por defecto", async () => {
    const command = buildDocumentSyncServerCommand({
      kind: "apply_batch",
      auth,
      batch: [
        candidatePayload("SYNTHETIC_ONLY_LOCAL_OK"),
        candidatePayload("SYNTHETIC_ONLY_LOCAL_CONFLICT"),
        candidatePayload("SYNTHETIC_ONLY_LOCAL_REJECT"),
      ],
    });

    const result = await applyDocumentSyncBatch(adapter(), command);
    expect(result.status).toBe("rejected");
    expect(result.items.map((item) => item.status)).toEqual([
      "accepted",
      "conflict",
      "rejected",
    ]);
  });

  it("stopOnFirstError corta tras el primer conflicto", async () => {
    const command = buildDocumentSyncServerCommand({
      kind: "apply_batch",
      auth,
      batch: [
        candidatePayload("SYNTHETIC_ONLY_LOCAL_OK"),
        candidatePayload("SYNTHETIC_ONLY_LOCAL_CONFLICT"),
        candidatePayload("SYNTHETIC_ONLY_LOCAL_REJECT"),
      ],
      options: { stopOnFirstError: true },
    });

    const result = await applyDocumentSyncBatch(adapter(), command);
    expect(result.stoppedEarly).toBe(true);
    expect(result.items.map((item) => item.status)).toEqual([
      "accepted",
      "conflict",
    ]);
  });

  it("summary seguro no filtra cuerpos completos", async () => {
    const command = buildDocumentSyncServerCommand({
      kind: "dry_run_batch",
      auth,
      batch: [candidatePayload("SYNTHETIC_ONLY_LOCAL_OK")],
    });

    const result = summarizeDocumentSyncBatchResult(
      await planDocumentSyncBatch(adapter(), command),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("payload\":{");
    expect(serialized).not.toContain("document_snapshot");
  });
});
