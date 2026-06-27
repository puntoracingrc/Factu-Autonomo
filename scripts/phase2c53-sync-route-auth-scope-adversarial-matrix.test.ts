import { describe, expect, it } from "vitest";
import {
  buildDisabledRouteAuthContext,
  rejectMissingRouteAuthContext,
} from "../src/lib/document-sync-integrity/route-auth-context";
import {
  createDocumentSyncRouteFakeService,
  DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
  DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
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

// PHASE2C53_SYNC_ROUTE_AUTH_SCOPE_ADVERSARIAL_MATRIX_V1

const shellEnv = {
  [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
  [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
};

function handler(authMode: "synthetic" | "missing" = "synthetic") {
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
      authMode === "synthetic"
        ? buildDisabledRouteAuthContext({
            ...input,
            mode: "synthetic_local_test",
            syntheticUserId: DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
            syntheticScopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
          })
        : rejectMissingRouteAuthContext(input.requestId),
    serviceFactory: () => runtime.service,
  });
}

function headers(requestId: string) {
  return {
    "content-type": "application/json",
    "x-request-id": requestId,
    "x-document-sync-source": "SYNTHETIC_ONLY_PHASE2C53_SOURCE",
  };
}

function basePayload(suffix: string) {
  return {
    operationKind: "create_draft",
    documentId: `SYNTHETIC_ONLY_PHASE2C53_DOC_${suffix}`,
    localDocumentId: `SYNTHETIC_ONLY_PHASE2C53_LOCAL_${suffix}`,
    payloadHash: `hash:phase2c53:${suffix}`,
  };
}

async function post(
  body: unknown,
  requestId: string,
  authMode: "synthetic" | "missing" = "synthetic",
) {
  return handler(authMode).handleDocumentSyncRouteRequest({
    method: "POST",
    headers: headers(requestId),
    readBody: () => JSON.stringify(body),
  });
}

async function expectRejected(body: unknown, requestId: string, code: string) {
  const response = await post(body, requestId);
  const serialized = JSON.stringify(response.body);
  expect(response.status).toBe(400);
  expect(serialized).toContain(code);
  expect(serialized).not.toContain("SYNTHETIC_ONLY_OTHER_USER");
  expect(serialized).not.toContain("SYNTHETIC_ONLY_OTHER_SCOPE");
}

describe("Phase 2C.53 sync route auth/scope adversarial matrix", () => {
  it("rechaza userId/scopeId directos en payload", async () => {
    await expectRejected(
      {
        kind: "apply_single",
        payload: {
          ...basePayload("USER"),
          payloadUserId: "SYNTHETIC_ONLY_OTHER_USER",
        },
      },
      "SYNTHETIC_ONLY_PHASE2C53_USER",
      "PAYLOAD_AUTH_REJECTED",
    );
    await expectRejected(
      {
        kind: "apply_single",
        payload: {
          ...basePayload("SCOPE"),
          payloadScopeId: "SYNTHETIC_ONLY_OTHER_SCOPE",
        },
      },
      "SYNTHETIC_ONLY_PHASE2C53_SCOPE",
      "PAYLOAD_AUTH_REJECTED",
    );
  });

  it("rechaza userId/scopeId anidados y batch con identidad ajena", async () => {
    await expectRejected(
      {
        kind: "apply_single",
        payload: {
          ...basePayload("NESTED_USER"),
          metadata: { userId: "SYNTHETIC_ONLY_OTHER_USER" },
        },
      },
      "SYNTHETIC_ONLY_PHASE2C53_NESTED_USER",
      "PAYLOAD_AUTH_REJECTED",
    );
    await expectRejected(
      {
        kind: "apply_batch",
        batch: [
          {
            itemId: "SYNTHETIC_ONLY_PHASE2C53_ITEM",
            ...basePayload("BATCH_SCOPE"),
            context: { scopeId: "SYNTHETIC_ONLY_OTHER_SCOPE" },
          },
        ],
      },
      "SYNTHETIC_ONLY_PHASE2C53_BATCH_SCOPE",
      "PAYLOAD_AUTH_REJECTED",
    );
  });

  it("rechaza auth context ausente y acepta contexto sintetico correcto", async () => {
    const missing = await post(
      { kind: "apply_single", payload: basePayload("MISSING_AUTH") },
      "SYNTHETIC_ONLY_PHASE2C53_MISSING_AUTH",
      "missing",
    );
    const accepted = await post(
      { kind: "apply_single", payload: basePayload("ACCEPTED") },
      "SYNTHETIC_ONLY_PHASE2C53_ACCEPTED",
    );

    expect(missing.status).toBe(400);
    expect(JSON.stringify(missing.body)).toContain("PAYLOAD_AUTH_REJECTED");
    expect(accepted.status).toBe(200);
    expect(JSON.stringify(accepted.body)).toContain('"status":"accepted"');
  });

  it("rechaza identificadores no sinteticos sin eco de token/cookie", async () => {
    const realId = await post(
      {
        kind: "dry_run_single",
        payload: {
          operationKind: "create_draft",
          documentId: "real-doc",
          localDocumentId: "SYNTHETIC_ONLY_PHASE2C53_LOCAL_REAL",
        },
      },
      "SYNTHETIC_ONLY_PHASE2C53_REAL_ID",
    );
    const unsafeBody = await post(
      {
        kind: "dry_run_single",
        payload: {
          ...basePayload("UNSAFE"),
          cookie: "SHOULD_NOT_ECHO",
        },
      },
      "SYNTHETIC_ONLY_PHASE2C53_COOKIE",
    );

    const serialized = JSON.stringify({ realId: realId.body, unsafeBody: unsafeBody.body });
    expect(realId.status).toBe(400);
    expect(unsafeBody.status).toBe(400);
    expect(serialized).toContain("NON_SYNTHETIC_ROUTE_PAYLOAD");
    expect(serialized).not.toContain("SHOULD_NOT_ECHO");
    expect(serialized).not.toContain("cookie");
  });
});
