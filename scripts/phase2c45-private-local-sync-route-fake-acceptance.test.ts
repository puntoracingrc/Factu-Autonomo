import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
} from "../src/lib/document-sync-integrity";
import { GET, POST } from "../src/app/api/document-sync/route";
import {
  resetDocumentSyncRouteLocalStateForTests,
} from "../src/lib/document-sync-integrity/route-local-state";

// PHASE2C45_PRIVATE_LOCAL_SYNC_ROUTE_FAKE_ACCEPTANCE_V1

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

function enableShellOnly() {
  setEnv(DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY, "true");
  setEnv(
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  );
}

function enableFake() {
  enableShellOnly();
  setEnv(DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY, "true");
  setEnv(
    DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
    DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
  );
}

function request(body: unknown, requestId: string) {
  return new Request("http://localhost/api/document-sync", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-document-sync-source": requestId,
    },
    body: JSON.stringify(body),
  });
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function createPayload(suffix: string) {
  return {
    operationKind: "create_draft",
    documentId: `SYNTHETIC_ONLY_DOC_${suffix}`,
    localDocumentId: `SYNTHETIC_ONLY_LOCAL_${suffix}`,
    payloadHash: `hash:${suffix}`,
  };
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

describe("phase 2C.45 private local sync route fake acceptance", () => {
  it("default disabled y shell sin fake disabled", async () => {
    expect((await GET()).status).toBe(404);
    enableShellOnly();
    const response = await POST(
      request({ kind: "dry_run_single", payload: createPayload("SHELL_ONLY") }, "SYNTHETIC_ONLY_SHELL"),
    );
    expect(response.status).toBe(501);
  });

  it("local fake dry_run_single y apply_single accepted", async () => {
    enableFake();
    const dryRun = await POST(
      request({ kind: "dry_run_single", payload: createPayload("DRY") }, "SYNTHETIC_ONLY_DRY"),
    );
    const apply = await POST(
      request({ kind: "apply_single", payload: createPayload("APPLY") }, "SYNTHETIC_ONLY_APPLY"),
    );

    expect(dryRun.status).toBe(200);
    expect(apply.status).toBe(200);
    expect(JSON.stringify(await json(apply))).toContain("route_fake_execution_completed");
  });

  it("update accepted y stale version conflict", async () => {
    enableFake();
    const first = await POST(
      request(
        {
          kind: "apply_single",
          payload: {
            operationKind: "update_draft",
            documentId: "SYNTHETIC_ONLY_DOC_EXISTING",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_EXISTING",
            expectedVersion: 1,
            payloadHash: "hash:update:v2",
          },
        },
        "SYNTHETIC_ONLY_UPDATE_1",
      ),
    );
    const stale = await POST(
      request(
        {
          kind: "apply_single",
          payload: {
            operationKind: "update_draft",
            documentId: "SYNTHETIC_ONLY_DOC_EXISTING",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_EXISTING",
            expectedVersion: 1,
            payloadHash: "hash:update:stale",
          },
        },
        "SYNTHETIC_ONLY_UPDATE_STALE",
      ),
    );

    expect(first.status).toBe(200);
    expect(JSON.stringify(await json(first))).toContain('"status":"accepted"');
    expect(JSON.stringify(await json(stale))).toContain('"status":"conflict"');
  });

  it("batch reporta accepted/conflict/rejected de forma segura", async () => {
    enableFake();
    const response = await POST(
      request(
        {
          kind: "apply_batch",
          batch: [
            { itemId: "SYNTHETIC_ONLY_ITEM_A", ...createPayload("BATCH_A") },
            {
              itemId: "SYNTHETIC_ONLY_ITEM_B",
              operationKind: "update_draft",
              documentId: "SYNTHETIC_ONLY_MISSING",
              localDocumentId: "SYNTHETIC_ONLY_LOCAL_MISSING",
              expectedVersion: 1,
            },
            {
              itemId: "SYNTHETIC_ONLY_ITEM_C",
              operationKind: "update_draft",
              documentId: "SYNTHETIC_ONLY_DOC_PROTECTED",
              localDocumentId: "SYNTHETIC_ONLY_LOCAL_PROTECTED",
              expectedVersion: 1,
            },
          ],
        },
        "SYNTHETIC_ONLY_BATCH",
      ),
    );
    const text = JSON.stringify(await json(response));

    expect(response.status).toBe(200);
    expect(text).toContain("batch_completed");
    expect(text).not.toContain("documentSnapshot");
  });

  it("protected, cross-user y non-synthetic id quedan rejected", async () => {
    enableFake();
    const protectedResponse = await POST(
      request(
        {
          kind: "apply_single",
          payload: {
            operationKind: "update_draft",
            documentId: "SYNTHETIC_ONLY_DOC_PROTECTED",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_PROTECTED",
            expectedVersion: 1,
          },
        },
        "SYNTHETIC_ONLY_PROTECTED",
      ),
    );
    const crossUser = await POST(
      request(
        {
          kind: "apply_single",
          payload: {
            ...createPayload("CROSS_USER"),
            payloadUserId: "SYNTHETIC_ONLY_OTHER_USER",
          },
        },
        "SYNTHETIC_ONLY_CROSS_USER",
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
        "SYNTHETIC_ONLY_NON_SYNTHETIC",
      ),
    );

    expect(JSON.stringify(await json(protectedResponse))).toContain('"status":"rejected"');
    expect(crossUser.status).toBe(400);
    expect(realId.status).toBe(400);
  });

  it("safe report no usa Supabase ni datos reales", async () => {
    enableFake();
    const response = await POST(
      request({ kind: "get_safe_report" }, "SYNTHETIC_ONLY_SAFE_REPORT"),
    );
    const text = JSON.stringify(await json(response));

    expect(response.status).toBe(200);
    expect(text).toContain("safeReport");
    expect(text).not.toContain("@supabase");
    expect(text).not.toContain("fiscal_records");
    expect(text).not.toContain("<" + "?xm");
  });
});
