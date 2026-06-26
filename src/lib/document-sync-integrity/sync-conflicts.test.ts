import { describe, expect, it } from "vitest";
import {
  buildDocumentSyncConflict,
  compareDocumentSyncVersions,
  isExpectedVersionSatisfied,
} from "./sync-conflicts";
import { buildDocumentSyncSafeSummary } from "./sync-policy";
import type {
  DocumentSyncCandidate,
  DocumentSyncCurrentState,
} from "./types";

const candidate: DocumentSyncCandidate = {
  operationKind: "update_draft",
  localDocumentId: "local_doc_1",
  expectedVersion: 7,
  candidateVersion: 6,
  payloadHash: "hash:local",
  requestedResponseShape: "safe_summary",
  context: {
    userId: "user_server_1",
    scopeId: "workspace_1",
    requestId: "req_2c_conflict",
    userIdSource: "server",
  },
};

const current: DocumentSyncCurrentState = {
  exists: true,
  documentId: "server_doc_1",
  localDocumentId: "local_doc_1",
  userId: "user_server_1",
  scopeId: "workspace_1",
  version: 8,
  payloadHash: "hash:remote",
  lifecycle: "draft",
  integrityLock: "unlocked",
  statusLegacy: "borrador",
};

describe("document sync conflict versioning", () => {
  it("valida expectedVersion match", () => {
    expect(isExpectedVersionSatisfied(8, 8)).toBe(true);
  });

  it("detecta expectedVersion mismatch", () => {
    expect(isExpectedVersionSatisfied(7, 8)).toBe(false);
  });

  it("detecta remote ahead", () => {
    expect(
      compareDocumentSyncVersions({ localVersion: 4, remoteVersion: 5 }),
    ).toBe("remote_ahead");
  });

  it("detecta local ahead", () => {
    expect(
      compareDocumentSyncVersions({ localVersion: 6, remoteVersion: 5 }),
    ).toBe("local_ahead");
  });

  it("detecta same version", () => {
    expect(
      compareDocumentSyncVersions({ localVersion: 5, remoteVersion: 5 }),
    ).toBe("same_version");
  });

  it("genera conflicto solo con campos seguros", () => {
    const conflict = buildDocumentSyncConflict({
      candidate,
      currentState: current,
      conflictReason: "expected_version_mismatch",
      safeSummary: buildDocumentSyncSafeSummary(candidate, current, [
        "version_conflict",
      ]),
    });

    expect(conflict).toMatchObject({
      documentId: "server_doc_1",
      localDocumentId: "local_doc_1",
      serverDerivedUserId: "user_server_1",
      localVersion: 6,
      remoteVersion: 8,
      expectedVersion: 7,
      conflictReason: "expected_version_mismatch",
    });
  });

  it("no filtra cuerpos congelados", () => {
    const conflict = buildDocumentSyncConflict({
      candidate,
      currentState: current,
      conflictReason: "expected_version_mismatch",
      safeSummary: buildDocumentSyncSafeSummary(candidate, current),
    });
    const serialized = JSON.stringify(conflict);

    expect(serialized).not.toContain("cliente completo");
    expect(serialized).not.toContain(`${["document", "Snapshot"].join("")}":`);
    expect(serialized).not.toContain(`${["pdf", "Snapshot"].join("")}":`);
  });
});
