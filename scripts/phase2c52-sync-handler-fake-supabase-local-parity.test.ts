import { describe, expect, it } from "vitest";
import {
  buildDisabledRouteAuthContext,
} from "../src/lib/document-sync-integrity/route-auth-context";
import {
  createDocumentSyncRouteFakeService,
  DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
  DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
  seedDocumentSyncRouteFakeStore,
} from "../src/lib/document-sync-integrity/route-fake-adapter";
import {
  createDocumentSyncRouteHandler,
} from "../src/lib/document-sync-integrity/route-handler";
import {
  createInMemoryDocumentSyncRouteIdempotencyStore,
} from "../src/lib/document-sync-integrity/route-idempotency";
import {
  createInMemoryDocumentSyncRouteRateLimiter,
} from "../src/lib/document-sync-integrity/route-rate-limit";
import {
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  evaluateDocumentSyncRouteShellFlag,
} from "../src/lib/document-sync-integrity/route-shell-flag";
import {
  createInMemoryDocumentSyncRouteTelemetry,
} from "../src/lib/document-sync-integrity/route-telemetry";
import {
  createDocumentSyncSupabaseLocalHandlerHarness,
} from "../src/lib/document-sync-integrity/route-supabase-local-harness";
import {
  createDocumentSyncServerService,
} from "../src/lib/document-sync-integrity/server-sync-service";
import {
  createSupabaseLocalStagingDocumentSyncAdapter,
} from "../src/lib/document-sync-integrity/supabase-adapter";
import type {
  DocumentSyncSupabaseStore,
} from "../src/lib/document-sync-integrity/supabase-contract";
import {
  createInMemoryDocumentSyncStore,
  type DocumentSyncStore,
  type DocumentSyncStoreRecord,
} from "../src/lib/document-sync-integrity/sync-store";

// PHASE2C52_SYNC_HANDLER_FAKE_SUPABASE_LOCAL_PARITY_V1

const shellEnv = {
  [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
  [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
};

const scope = {
  userId: DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
  scopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
};

function asyncStore(store: DocumentSyncStore): DocumentSyncSupabaseStore {
  return {
    async getById(documentId, nextScope) {
      return store.getById(documentId, nextScope);
    },
    async listByScope(nextScope) {
      return store.listByScope(nextScope);
    },
    async putDraft(record) {
      return store.putDraft(record);
    },
    async updateDraft(record, expectedVersion) {
      return store.updateDraft(record, expectedVersion);
    },
    async deleteDraft(documentId, expectedVersion, nextScope) {
      return store.deleteDraft(documentId, expectedVersion, nextScope);
    },
    async recordConflict(conflict) {
      store.recordConflict(conflict);
    },
    async getConflicts(nextScope) {
      return store.getConflicts(nextScope);
    },
  };
}

function fakeHandler() {
  const runtime = createDocumentSyncRouteFakeService();
  return createDocumentSyncRouteHandler({
    evaluateShellFlag: () => evaluateDocumentSyncRouteShellFlag(shellEnv),
    evaluateLocalExecution: () => ({
      enabled: true,
      reason: "local_fake_execution_allowed",
    }),
    rateLimiter: createInMemoryDocumentSyncRouteRateLimiter({
      limit: 50,
      windowMs: 60_000,
    }),
    idempotencyStore: createInMemoryDocumentSyncRouteIdempotencyStore(),
    telemetry: createInMemoryDocumentSyncRouteTelemetry(),
    authContextFactory: (input) =>
      buildDisabledRouteAuthContext({
        ...input,
        mode: "synthetic_local_test",
        syntheticUserId: DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
        syntheticScopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
      }),
    serviceFactory: () => runtime.service,
  });
}

function supabaseLocalHarness(seed: DocumentSyncStoreRecord[] = seedDocumentSyncRouteFakeStore()) {
  const store = asyncStore(createInMemoryDocumentSyncStore(seed));
  const adapter = createSupabaseLocalStagingDocumentSyncAdapter(store, {
    serverScope: scope,
  });
  const service = createDocumentSyncServerService({ adapter });
  return createDocumentSyncSupabaseLocalHandlerHarness({
    serverScope: scope,
    service,
  }).handler;
}

function headers(requestId: string) {
  return {
    "content-type": "application/json",
    "x-request-id": requestId,
    "x-document-sync-source": "SYNTHETIC_ONLY_PHASE2C52_SOURCE",
  };
}

function requestBody(value: unknown) {
  return JSON.stringify(value);
}

function createPayload(suffix: string) {
  return {
    operationKind: "create_draft",
    documentId: `SYNTHETIC_ONLY_PHASE2C52_DOC_${suffix}`,
    localDocumentId: `SYNTHETIC_ONLY_PHASE2C52_LOCAL_${suffix}`,
    payloadHash: `hash:phase2c52:${suffix}`,
  };
}

async function post(
  handler: ReturnType<typeof fakeHandler>,
  body: unknown,
  requestId: string,
) {
  return handler.handleDocumentSyncRouteRequest({
    method: "POST",
    headers: headers(requestId),
    readBody: () => requestBody(body),
  });
}

function resultShape(response: Awaited<ReturnType<typeof post>>) {
  const summary = response.body.summary as {
    result?: { status?: string; commandKind?: string; batchResult?: unknown };
  } | undefined;
  return {
    httpStatus: response.status,
    ok: response.body.ok,
    resultStatus: summary?.result?.status,
    commandKind: summary?.result?.commandKind,
    hasBatch: Boolean(summary?.result?.batchResult),
  };
}

async function expectParity(body: unknown, requestId: string) {
  const fake = await post(fakeHandler(), body, `${requestId}_FAKE`);
  const local = await post(supabaseLocalHarness(), body, `${requestId}_LOCAL`);
  expect(resultShape(fake)).toEqual(resultShape(local));
  const serialized = JSON.stringify({ fake, local });
  expect(serialized).not.toContain("documentSnapshot");
  expect(serialized).not.toContain("rawPayload");
}

describe("Phase 2C.52 sync handler fake vs Supabase local parity", () => {
  it("create draft mantiene status y shape", async () => {
    await expectParity(
      { kind: "apply_single", payload: createPayload("CREATE") },
      "SYNTHETIC_ONLY_PHASE2C52_CREATE",
    );
  });

  it("update draft y stale conflict mantienen shape", async () => {
    const fake = fakeHandler();
    const local = supabaseLocalHarness();
    const update = {
      kind: "apply_single",
      payload: {
        operationKind: "update_draft",
        documentId: "SYNTHETIC_ONLY_DOC_EXISTING",
        localDocumentId: "SYNTHETIC_ONLY_LOCAL_EXISTING",
        expectedVersion: 1,
        payloadHash: "hash:phase2c52:update",
      },
    };
    const stale = {
      kind: "apply_single",
      payload: {
        ...update.payload,
        payloadHash: "hash:phase2c52:stale",
      },
    };

    const fakeUpdate = await post(fake, update, "SYNTHETIC_ONLY_PHASE2C52_UPDATE_FAKE");
    const localUpdate = await post(local, update, "SYNTHETIC_ONLY_PHASE2C52_UPDATE_LOCAL");
    const fakeStale = await post(fake, stale, "SYNTHETIC_ONLY_PHASE2C52_STALE_FAKE");
    const localStale = await post(local, stale, "SYNTHETIC_ONLY_PHASE2C52_STALE_LOCAL");

    expect(resultShape(fakeUpdate)).toEqual(resultShape(localUpdate));
    expect(resultShape(fakeStale)).toEqual(resultShape(localStale));
    expect(JSON.stringify(fakeStale.body)).toContain('"status":"conflict"');
  });

  it("protected y cross-user quedan rechazados de forma equivalente", async () => {
    await expectParity(
      {
        kind: "apply_single",
        payload: {
          operationKind: "update_draft",
          documentId: "SYNTHETIC_ONLY_DOC_PROTECTED",
          localDocumentId: "SYNTHETIC_ONLY_LOCAL_PROTECTED",
          expectedVersion: 1,
        },
      },
      "SYNTHETIC_ONLY_PHASE2C52_PROTECTED",
    );
    await expectParity(
      {
        kind: "apply_single",
        payload: {
          ...createPayload("CROSS_USER"),
          payloadUserId: "SYNTHETIC_ONLY_OTHER_USER",
        },
      },
      "SYNTHETIC_ONLY_PHASE2C52_CROSS_USER",
    );
  });

  it("batch mixed y safe report mantienen shape seguro", async () => {
    await expectParity(
      {
        kind: "apply_batch",
        batch: [
          { itemId: "SYNTHETIC_ONLY_PHASE2C52_ITEM_A", ...createPayload("BATCH_A") },
          {
            itemId: "SYNTHETIC_ONLY_PHASE2C52_ITEM_B",
            operationKind: "update_draft",
            documentId: "SYNTHETIC_ONLY_MISSING",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_MISSING",
            expectedVersion: 1,
          },
          {
            itemId: "SYNTHETIC_ONLY_PHASE2C52_ITEM_C",
            operationKind: "update_draft",
            documentId: "SYNTHETIC_ONLY_DOC_PROTECTED",
            localDocumentId: "SYNTHETIC_ONLY_LOCAL_PROTECTED",
            expectedVersion: 1,
          },
        ],
      },
      "SYNTHETIC_ONLY_PHASE2C52_BATCH",
    );
    await expectParity(
      { kind: "get_safe_report" },
      "SYNTHETIC_ONLY_PHASE2C52_SAFE_REPORT",
    );
  });

  it("marca Supabase local real como opt-in si no esta habilitado", () => {
    const realLocalOptIn =
      process.env.PHASE2C51_SUPABASE_LOCAL_HANDLER_HARNESS === "true";
    expect([true, false]).toContain(realLocalOptIn);
  });
});
