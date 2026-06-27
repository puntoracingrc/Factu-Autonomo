import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
  DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
  buildDocumentSyncRouteFakeCommand,
  createDocumentSyncRouteFakeService,
} from "./route-fake-adapter";
import type { DocumentSyncServerCommandPayload } from "./server-sync-command";

// PHASE2C38_SYNC_ROUTE_FAKE_ADAPTER_FACTORY_V1

const auth = {
  userId: DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
  scopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
  requestId: "SYNTHETIC_ONLY_FAKE_ADAPTER_TEST",
  userIdSource: "test" as const,
};

function payload(
  overrides: Partial<DocumentSyncServerCommandPayload> = {},
): DocumentSyncServerCommandPayload {
  return {
    operationKind: "create_draft" as const,
    documentId: "SYNTHETIC_ONLY_DOC_NEW",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_NEW",
    payloadHash: "hash:new",
    ...overrides,
  };
}

describe("document sync route fake adapter factory", () => {
  it("crea servicio fake y acepta create/update sintetico", async () => {
    const runtime = createDocumentSyncRouteFakeService();
    const create = await runtime.service.handle(
      buildDocumentSyncRouteFakeCommand(
        { kind: "apply_single", payload: payload() },
        auth,
      ),
    );
    const update = await runtime.service.handle(
      buildDocumentSyncRouteFakeCommand(
        {
          kind: "apply_single",
          payload: payload({
            operationKind: "update_draft",
            expectedVersion: 1,
            payloadHash: "hash:update",
          }),
        },
        auth,
      ),
    );

    expect(create.status).toBe("accepted");
    expect(update.status).toBe("accepted");
  });

  it("rechaza protected y cross-user sin filtrar cuerpos", async () => {
    const runtime = createDocumentSyncRouteFakeService();
    const protectedResult = await runtime.service.handle(
      buildDocumentSyncRouteFakeCommand(
        {
          kind: "apply_single",
          payload: payload({
            operationKind: "update_draft",
            documentId: "SYNTHETIC_ONLY_DOC_PROTECTED",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_PROTECTED",
            expectedVersion: 1,
          }),
        },
        auth,
      ),
    );
    const crossUserResult = await runtime.service.handle(
      buildDocumentSyncRouteFakeCommand(
        {
          kind: "apply_single",
          payload: payload({
            operationKind: "update_draft",
            documentId: "SYNTHETIC_ONLY_DOC_CROSS_USER",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_CROSS_USER",
            expectedVersion: 1,
          }),
        },
        auth,
      ),
    );
    const serialized = JSON.stringify({ protectedResult, crossUserResult });

    expect(protectedResult.status).toBe("rejected");
    expect(crossUserResult.status).toBe("conflict");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("@supabase");
  });

  it("safe report es seguro", async () => {
    const runtime = createDocumentSyncRouteFakeService();
    const report = await runtime.service.handle(
      buildDocumentSyncRouteFakeCommand({ kind: "get_safe_report" }, auth),
    );

    expect(report.status).toBe("accepted");
    expect(JSON.stringify(report)).not.toContain("payload completo");
  });
});
