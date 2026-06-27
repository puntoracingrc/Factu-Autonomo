import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
} from "../src/lib/document-sync-integrity";
import { POST } from "../src/app/api/document-sync/route";
import {
  resetDocumentSyncRouteLocalStateForTests,
} from "../src/lib/document-sync-integrity/route-local-state";

// PHASE2C40_SYNC_ROUTE_ABUSE_PAYLOAD_HARDENING_V1

const envKeys = [
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
] as const;
const previousEnv = new Map<string, string | undefined>();

function setEnv(key: string, value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

function enableFake() {
  setEnv(DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY, "true");
  setEnv(
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  );
  setEnv(DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY, "true");
  setEnv(
    DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
    DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
  );
}

function request(body: unknown, requestId = "SYNTHETIC_ONLY_ABUSE") {
  return new Request("http://localhost/api/document-sync", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-document-sync-source": requestId,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function serialized(response: Response): Promise<string> {
  return JSON.stringify(await response.json());
}

beforeEach(() => {
  previousEnv.clear();
  for (const key of envKeys) {
    previousEnv.set(key, process.env[key]);
    setEnv(key, undefined);
  }
  resetDocumentSyncRouteLocalStateForTests();
});

afterEach(() => {
  for (const key of envKeys) setEnv(key, previousEnv.get(key));
  resetDocumentSyncRouteLocalStateForTests();
});

describe("phase 2C.40 sync route abuse and payload hardening", () => {
  it("rechaza oversized body y nested huge object", async () => {
    enableFake();
    const oversized = await POST(request("x".repeat(9 * 1024)));
    const nested = await POST(
      request(
        { kind: "get_safe_report", a: { b: { c: { d: { e: { f: { g: { h: { i: true } } } } } } } } },
        "SYNTHETIC_ONLY_NESTED",
      ),
    );

    expect(oversized.status).toBe(400);
    expect(await serialized(oversized)).toContain("PAYLOAD_TOO_LARGE");
    expect(nested.status).toBe(400);
    expect(await serialized(nested)).toContain("UNSAFE_BODY");
  });

  it("rechaza snapshot, pdf, XML, token, secreto y marcador fiscal sin eco", async () => {
    enableFake();
    const fiscalTransportAttemptsKey = ["fiscal", "transport", "attempts"].join("_");
    const cases = [
      { ["document" + "Snapshot"]: { unsafe: "SHOULD_NOT_ECHO" } },
      { ["pdf" + "Body"]: "%PDF SHOULD_NOT_ECHO" },
      { value: "<" + "?xm" + "l SHOULD_NOT_ECHO" },
      { value: ["tok", "en"].join("") },
      { value: ["sec", "ret"].join("") },
      { [fiscalTransportAttemptsKey]: ["SHOULD_NOT_ECHO"] },
    ];

    for (const [index, body] of cases.entries()) {
      const response = await POST(request(body, `SYNTHETIC_ONLY_ABUSE_${index}`));
      const text = await serialized(response);
      expect(response.status).toBe(400);
      expect(text).not.toContain("SHOULD_NOT_ECHO");
    }
  });

  it("rechaza unknown operation, batch mayor de 25 y non-synthetic IDs", async () => {
    enableFake();
    const unknown = await POST(request({ kind: "unknown_operation" }));
    const largeBatch = await POST(
      request(
        {
          kind: "apply_batch",
          batch: Array.from({ length: 26 }, (_, index) => ({
            itemId: `SYNTHETIC_ONLY_ITEM_${index}`,
            operationKind: "create_draft",
            documentId: `SYNTHETIC_ONLY_DOC_${index}`,
            localDocumentId: `SYNTHETIC_ONLY_LOCAL_${index}`,
          })),
        },
        "SYNTHETIC_ONLY_LARGE_BATCH",
      ),
    );
    const realId = await POST(
      request(
        {
          kind: "dry_run_single",
          payload: {
            operationKind: "create_draft",
            documentId: "real-doc",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_REAL",
          },
        },
        "SYNTHETIC_ONLY_REAL_ID",
      ),
    );

    expect(unknown.status).toBe(400);
    expect(await serialized(unknown)).toContain("UNKNOWN_ROUTE_OPERATION");
    expect(largeBatch.status).toBe(400);
    expect(await serialized(largeBatch)).toContain("BATCH_TOO_LARGE");
    expect(realId.status).toBe(400);
    expect(await serialized(realId)).toContain("NON_SYNTHETIC_ROUTE_PAYLOAD");
  });
});
