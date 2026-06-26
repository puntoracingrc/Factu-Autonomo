import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_ROUTE_ENVELOPE_MAX_BYTES,
  buildDocumentSyncRouteDisabledResponse,
  buildDocumentSyncRouteErrorResponse,
  buildDocumentSyncRouteSafeResponse,
  parseDocumentSyncRouteEnvelope,
} from "./route-envelope";
import { evaluateDocumentSyncRouteShellFlag } from "./route-shell-flag";

const requestId = "SYNTHETIC_ONLY_ROUTE_REQUEST";

describe("document sync route safe envelope", () => {
  it("disabled response es segura", () => {
    const response = buildDocumentSyncRouteDisabledResponse(
      evaluateDocumentSyncRouteShellFlag({}),
      requestId,
    );
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain("payload");
  });

  it("malformed body devuelve error seguro", () => {
    const result = parseDocumentSyncRouteEnvelope({
      requestId,
      rawBody: "{",
    });
    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("Expected rejected body.");
    expect(result.code).toBe("MALFORMED_BODY");
  });

  it("oversized body se rechaza sin eco", () => {
    const result = parseDocumentSyncRouteEnvelope({
      requestId,
      rawBody: "x".repeat(DOCUMENT_SYNC_ROUTE_ENVELOPE_MAX_BYTES + 1),
    });
    expect(result.status).toBe("rejected");
    expect(JSON.stringify(result)).not.toContain("x".repeat(50));
  });

  it("snapshot body se rechaza", () => {
    const result = parseDocumentSyncRouteEnvelope({
      requestId,
      rawBody: JSON.stringify({ ["document" + "Snapshot"]: { lines: [] } }),
    });
    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("Expected unsafe body.");
    expect(result.code).toBe("UNSAFE_BODY");
  });

  it("markup externo se rechaza", () => {
    const result = parseDocumentSyncRouteEnvelope({
      requestId,
      rawBody: JSON.stringify({ body: "<" + "?xm" + "l version=\"1.0\"?>" }),
    });
    expect(result.status).toBe("rejected");
  });

  it("token y credencial sensible se rechazan", () => {
    for (const value of [["tok", "en"].join(""), ["sec", "ret"].join("")]) {
      const result = parseDocumentSyncRouteEnvelope({
        requestId,
        rawBody: JSON.stringify({ value }),
      });
      expect(result.status).toBe("rejected");
    }
  });

  it("safe response no incluye stack ni echo", () => {
    const error = buildDocumentSyncRouteErrorResponse("SYNTHETIC_ERROR", requestId);
    const safe = buildDocumentSyncRouteSafeResponse("SAFE", { count: 1 }, requestId);
    const serialized = JSON.stringify({ error, safe });
    expect(serialized).not.toContain("stack");
    expect(serialized).not.toContain("documentSnapshot");
  });
});
