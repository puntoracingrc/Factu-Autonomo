import { describe, expect, it } from "vitest";
import {
  assertSafeDocumentSyncServerJson,
  redactDocumentSyncServerError,
  serializeDocumentSyncServerResult,
} from "./server-sync-response";
import type { DocumentSyncServerCommandResult } from "./server-sync-command";

const base: DocumentSyncServerCommandResult = {
  commandKind: "apply_single",
  requestId: "SYNTHETIC_ONLY_REQUEST",
  serverDerivedUserId: "SYNTHETIC_ONLY_USER",
  status: "accepted",
  safeSummary: {
    operationKind: "create_draft",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL",
    serverDerivedUserId: "SYNTHETIC_ONLY_USER",
    requestId: "SYNTHETIC_ONLY_REQUEST",
    payloadHashPresent: true,
    snapshotHashPresent: false,
    pdfSnapshotHashPresent: false,
    riskFlags: [],
  },
};

describe("server sync safe serializer", () => {
  it("serializa accepted seguro", () => {
    const safe = serializeDocumentSyncServerResult(base);
    expect(safe.status).toBe("accepted");
    expect(() => assertSafeDocumentSyncServerJson(safe)).not.toThrow();
  });

  it("serializa conflict seguro", () => {
    const safe = serializeDocumentSyncServerResult({
      ...base,
      status: "conflict",
      conflict: {
        conflictReason: "expected_version_mismatch",
        ["document" + "Snapshot"]: { lines: [] },
      },
    });
    const serialized = JSON.stringify(safe);
    expect(serialized).toContain("[redacted]");
    expect(serialized).not.toContain("lines");
  });

  it("serializa rejected seguro", () => {
    const safe = serializeDocumentSyncServerResult({
      ...base,
      status: "rejected",
      error: { code: "INVALID_COMMAND_PAYLOAD", message: "blocked" },
    });
    expect(safe.status).toBe("rejected");
    expect(JSON.stringify(safe)).not.toContain("stack");
  });

  it("redacta errores sin stack", () => {
    const error = new Error("raw " + "tok" + "en value");
    const redacted = redactDocumentSyncServerError(error);
    expect(redacted.code).toBe("Error");
    expect(redacted.message).not.toContain("tok" + "en");
  });

  it("JSON.stringify no filtra contenido prohibido", () => {
    const safe = serializeDocumentSyncServerResult({
      ...base,
      safeReport: {
        ["raw" + "Payload"]: {
          customer: "full body",
        },
        doc: "%P" + "DF",
      },
    });
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("full body");
    expect(serialized).not.toContain("%P" + "DF");
  });
});
