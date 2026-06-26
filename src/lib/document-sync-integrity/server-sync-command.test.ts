import { describe, expect, it } from "vitest";
import {
  buildDocumentSyncServerCommand,
  DOCUMENT_SYNC_SERVER_COMMAND_MAX_BATCH_SIZE,
  summarizeDocumentSyncServerCommand,
  type DocumentSyncServerCommandPayload,
} from "./server-sync-command";

const auth = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
  requestId: "SYNTHETIC_ONLY_REQUEST_A",
  userIdSource: "test" as const,
};

function payload(
  overrides: Record<string, unknown> = {},
): DocumentSyncServerCommandPayload {
  return {
    operationKind: "create_draft",
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    payloadHash: "hash:create",
    ...overrides,
  } as DocumentSyncServerCommandPayload;
}

describe("server sync command contract", () => {
  it("crea dry_run_single valido con auth server-derived", () => {
    const command = buildDocumentSyncServerCommand({
      kind: "dry_run_single",
      auth,
      payload: payload(),
    });

    expect(command.kind).toBe("dry_run_single");
    expect(command.candidate?.context.userId).toBe(auth.userId);
    expect(command.candidate?.context.scopeId).toBe(auth.scopeId);
    expect(command.candidate?.requestedResponseShape).toBe("safe_summary");
  });

  it("crea apply_single valido", () => {
    const command = buildDocumentSyncServerCommand({
      kind: "apply_single",
      auth,
      payload: payload({ operationKind: "update_draft", expectedVersion: 1 }),
    });

    expect(command.candidate?.operationKind).toBe("update_draft");
    expect(command.candidate?.expectedVersion).toBe(1);
  });

  it("crea dry_run_batch valido y respeta limite", () => {
    const command = buildDocumentSyncServerCommand({
      kind: "dry_run_batch",
      auth,
      batch: [payload({ localDocumentId: "SYNTHETIC_ONLY_LOCAL_1" })],
    });

    expect(command.candidates).toHaveLength(1);
    expect(command.options.maxBatchSize).toBe(DOCUMENT_SYNC_SERVER_COMMAND_MAX_BATCH_SIZE);
  });

  it("rechaza batch demasiado grande", () => {
    expect(() =>
      buildDocumentSyncServerCommand({
        kind: "apply_batch",
        auth,
        batch: Array.from({ length: DOCUMENT_SYNC_SERVER_COMMAND_MAX_BATCH_SIZE + 1 }, (_, index) =>
          payload({ localDocumentId: `SYNTHETIC_ONLY_LOCAL_${index}` }),
        ),
      }),
    ).toThrow(/limite/i);
  });

  it("rechaza userId en payload distinto al auth context", () => {
    expect(() =>
      buildDocumentSyncServerCommand({
        kind: "apply_single",
        auth,
        payload: payload({ payloadUserId: "SYNTHETIC_ONLY_OTHER_USER" }),
      }),
    ).toThrow(/usuario/i);
  });

  it("rechaza scope en payload distinto al auth context", () => {
    expect(() =>
      buildDocumentSyncServerCommand({
        kind: "apply_single",
        auth,
        payload: payload({ payloadScopeId: "SYNTHETIC_ONLY_OTHER_SCOPE" }),
      }),
    ).toThrow(/scope/i);
  });

  it("rechaza snapshot completo", () => {
    expect(() =>
      buildDocumentSyncServerCommand({
        kind: "apply_single",
        auth,
        payload: payload({ ["document" + "Snapshot"]: { lines: [] } }),
      }),
    ).toThrow(/contenido/i);
  });

  it("rechaza pdf body y markup externo", () => {
    expect(() =>
      buildDocumentSyncServerCommand({
        kind: "apply_single",
        auth,
        payload: payload({ pdfBody: "%P" + "DF raw" }),
      }),
    ).toThrow(/contenido|texto/i);

    expect(() =>
      buildDocumentSyncServerCommand({
        kind: "apply_single",
        auth,
        payload: payload({ markup: "<" + "?xm" + "l version=\"1.0\"?>" }),
      }),
    ).toThrow(/contenido|texto/i);
  });

  it("rechaza credenciales sensibles", () => {
    expect(() =>
      buildDocumentSyncServerCommand({
        kind: "apply_single",
        auth,
        payload: payload({ access: "tok" + "en-value" }),
      }),
    ).toThrow(/sensible|texto/i);
  });

  it("safe summary no contiene payload completo", () => {
    const command = buildDocumentSyncServerCommand({
      kind: "apply_single",
      auth,
      payload: payload({ payloadHash: "hash:safe" }),
    });
    const serialized = JSON.stringify(summarizeDocumentSyncServerCommand(command));

    expect(serialized).toContain("payloadHashCount");
    expect(serialized).not.toContain("payload\":{");
    expect(serialized).not.toContain("lines");
  });
});
