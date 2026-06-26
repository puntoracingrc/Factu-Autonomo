import { describe, expect, it } from "vitest";
import {
  buildDocumentSyncServerCommand,
} from "./server-sync-command";
import {
  buildDocumentSyncServerAuditEvent,
  createInMemoryDocumentSyncServerAuditSink,
} from "./server-sync-audit";

const auth = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
  requestId: "SYNTHETIC_ONLY_REQUEST_AUDIT",
  userIdSource: "test" as const,
};

function command() {
  return buildDocumentSyncServerCommand({
    kind: "apply_single",
    auth,
    payload: {
      operationKind: "create_draft",
      documentId: "SYNTHETIC_ONLY_DOC",
      localDocumentId: "SYNTHETIC_ONLY_LOCAL",
      payloadHash: "hash:create",
    },
  });
}

describe("server sync audit", () => {
  it("crea evento redacted sin persistencia", () => {
    const event = buildDocumentSyncServerAuditEvent({
      eventType: "server_sync_command_received",
      command: command(),
      details: {
        ["raw" + "Payload"]: { lines: [] },
      },
    });

    expect(event.persisted).toBe(false);
    expect(JSON.stringify(event)).not.toContain("lines");
  });

  it("sink in-memory almacena y resetea eventos", () => {
    const sink = createInMemoryDocumentSyncServerAuditSink();
    sink.write(
      buildDocumentSyncServerAuditEvent({
        eventType: "server_sync_apply_completed",
        command: command(),
        decisionStatus: "accepted",
      }),
    );

    expect(sink.list()).toHaveLength(1);
    expect(sink.list()[0].persisted).toBe(false);
    sink.reset();
    expect(sink.list()).toEqual([]);
  });
});
