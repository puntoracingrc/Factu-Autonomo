import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DocumentSyncPolicyError } from "./errors";
import { evaluateDocumentSyncPolicy } from "./sync-policy";
import type {
  DocumentSyncCandidate,
  DocumentSyncCurrentState,
} from "./types";

const context = {
  userId: "user_server_1",
  scopeId: "workspace_1",
  requestId: "req_2c_policy",
  userIdSource: "server" as const,
};

function candidate(
  overrides: Partial<DocumentSyncCandidate> = {},
): DocumentSyncCandidate {
  return {
    operationKind: "update_draft",
    localDocumentId: "local_doc_1",
    expectedVersion: 3,
    payloadHash: "hash:draft-next",
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
    version: 3,
    payloadHash: "hash:draft-current",
    lifecycle: "draft",
    integrityLock: "unlocked",
    statusLegacy: "borrador",
    documentNumber: "BORRADOR",
    ...overrides,
  };
}

function serialized(value: unknown): string {
  return JSON.stringify(value);
}

describe("document sync integrity policy", () => {
  it("acepta create_draft sintetico", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate({
        operationKind: "create_draft",
        expectedVersion: undefined,
        payloadHash: "hash:new-draft",
      }),
      null,
    );

    expect(decision.status).toBe("accepted");
    expect(decision.safeSummary.localDocumentId).toBe("local_doc_1");
    expect(decision.safeSummary.serverDerivedUserId).toBe(context.userId);
  });

  it("acepta update_draft con expectedVersion correcto", () => {
    const decision = evaluateDocumentSyncPolicy(candidate(), current());

    expect(decision.status).toBe("accepted");
    expect(decision.safeSummary.currentVersion).toBe(3);
    expect(decision.safeSummary.expectedVersion).toBe(3);
  });

  it("rechaza update_draft sin expectedVersion", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate({ expectedVersion: undefined }),
      current(),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error).toBeInstanceOf(DocumentSyncPolicyError);
    expect(decision.error.code).toBe("MISSING_EXPECTED_VERSION");
    expect(decision.riskFlags).toContain("missing_expected_version");
  });

  it("rechaza documento emitido", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate(),
      current({ lifecycle: "issued", integrityLock: "locked" }),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error.code).toBe("PROTECTED_DOCUMENT");
  });

  it("rechaza documento locked", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate(),
      current({ integrityLock: "locked" }),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error.code).toBe("LOCKED_DOCUMENT");
  });

  it("rechaza documento canceled", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate(),
      current({ lifecycle: "canceled" }),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error.code).toBe("CANCELED_DOCUMENT");
  });

  it("rechaza legacy no borrador", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate(),
      current({ statusLegacy: "enviado" }),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error.code).toBe("LEGACY_NON_DRAFT");
  });

  it("rechaza cambio de snapshotHash", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate({ snapshotHash: "snapshot:new" }),
      current({ snapshotHash: "snapshot:current" }),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error.code).toBe("SNAPSHOT_HASH_CHANGE");
  });

  it("rechaza cambio de pdfSnapshotHash", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate({ pdfSnapshotHash: "pdf:new" }),
      current({ pdfSnapshotHash: "pdf:current" }),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error.code).toBe("PDF_SNAPSHOT_HASH_CHANGE");
  });

  it("rechaza cambio de numeracion emitida conservada", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate({ documentNumber: "F-2026-0002" }),
      current({ documentNumber: "F-2026-0001" }),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error.code).toBe("EMITTED_NUMBERING_CHANGE");
  });

  it("rechaza userId distinto", () => {
    const decision = evaluateDocumentSyncPolicy(candidate(), current({ userId: "user_other" }));

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error.code).toBe("CROSS_USER_MUTATION");
  });

  it("ignora identidad del payload y rechaza si contradice al servidor", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate({ payloadUserId: "user_other" }),
      current(),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.riskFlags).toContain("payload_identity_ignored");
    expect(decision.error.code).toBe("CROSS_USER_MUTATION");
  });

  it("devuelve errores tipados", () => {
    const decision = evaluateDocumentSyncPolicy(
      candidate({ requestedResponseShape: "select_all" }),
      current(),
    );

    expect(decision.status).toBe("rejected");
    if (decision.status !== "rejected") throw new Error("expected rejection");
    expect(decision.error).toBeInstanceOf(DocumentSyncPolicyError);
    expect(decision.error.code).toBe("UNSAFE_RESPONSE_SHAPE");
  });

  it("safeSummary no contiene cuerpos completos", () => {
    const decision = evaluateDocumentSyncPolicy(candidate(), current());
    const body = serialized(decision.safeSummary);

    expect(body).not.toContain("linea secreta");
    expect(body).not.toContain(`${["document", "Snapshot"].join("")}":`);
    expect(body).not.toContain(`${["pdf", "Snapshot"].join("")}":`);
  });

  it("no importa cliente remoto ni red en runtime", () => {
    const root = path.resolve(__dirname);
    const files = fs
      .readdirSync(root)
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));
    const body = files
      .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
      .join("\n");

    expect(body).not.toContain(["@", "supabase"].join(""));
    expect(body).not.toContain(["fe", "tch"].join(""));
    expect(body).not.toContain("axios");
    expect(body).not.toContain(["node:", "http"].join(""));
    expect(body).not.toContain(["node:", "https"].join(""));
  });
});
