import { describe, expect, it } from "vitest";
import {
  buildDisabledRouteAuthContext,
} from "../src/lib/document-sync-integrity/route-auth-context";
import {
  DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
  DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
} from "../src/lib/document-sync-integrity/route-fake-adapter";
import {
  createDocumentSyncRouteHandler,
  type DocumentSyncRouteHandlerDependencies,
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
  createDocumentSyncServerService,
  type DocumentSyncServerServiceAdapter,
} from "../src/lib/document-sync-integrity/server-sync-service";
import type {
  DocumentSyncCandidate,
} from "../src/lib/document-sync-integrity/types";

// PHASE2C54_SYNC_ROUTE_OPERATIONAL_FAILURE_INJECTION_V1

const shellEnv = {
  [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
  [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
};

function throwingAdapter(): DocumentSyncServerServiceAdapter {
  const fail = () => {
    throw new Error("SHOULD_NOT_LEAK_STACK");
  };
  return {
    plan: fail,
    apply: fail,
    getSafeState: fail,
    getConflictReport: fail,
  };
}

function dependencies(
  overrides: Partial<DocumentSyncRouteHandlerDependencies> = {},
) {
  const service = createDocumentSyncServerService({ adapter: throwingAdapter() });
  return {
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
    serviceFactory: () => service,
    requestIdFactory: () => "SYNTHETIC_ONLY_PHASE2C54_GENERATED",
    ...overrides,
  } satisfies DocumentSyncRouteHandlerDependencies;
}

function headers(requestId?: string) {
  return {
    "content-type": "application/json",
    ...(requestId ? { "x-request-id": requestId } : {}),
    "x-document-sync-source": "SYNTHETIC_ONLY_PHASE2C54_SOURCE",
  };
}

function payload(overrides: Partial<DocumentSyncCandidate> = {}) {
  return {
    operationKind: "create_draft",
    documentId: "SYNTHETIC_ONLY_PHASE2C54_DOC",
    localDocumentId: "SYNTHETIC_ONLY_PHASE2C54_LOCAL",
    payloadHash: "hash:phase2c54",
    ...overrides,
  };
}

async function post(
  overrides: Partial<DocumentSyncRouteHandlerDependencies>,
  body: unknown,
  requestId = "SYNTHETIC_ONLY_PHASE2C54_REQUEST",
) {
  const handler = createDocumentSyncRouteHandler(dependencies(overrides));
  return handler.handleDocumentSyncRouteRequest({
    method: "POST",
    headers: headers(requestId),
    readBody: () => JSON.stringify(body),
  });
}

function expectSafe(response: { body: unknown }) {
  const serialized = JSON.stringify(response.body);
  expect(serialized).not.toContain("SHOULD_NOT_LEAK_STACK");
  expect(serialized).not.toContain("hash:phase2c54");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("documentSnapshot");
}

describe("Phase 2C.54 sync route operational failure injection", () => {
  it("adapter throws queda controlado y sin stack", async () => {
    const response = await post(
      {},
      { kind: "apply_single", payload: payload() },
    );

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).toContain('"status":"rejected"');
    expectSafe(response);
  });

  it("service throws devuelve 500 seguro", async () => {
    const response = await post(
      {
        serviceFactory: () =>
          ({
            handle: async () => {
              throw new Error("SHOULD_NOT_LEAK_STACK");
            },
          }) as never,
      },
      { kind: "apply_single", payload: payload() },
    );

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).toContain("ROUTE_FAKE_EXECUTION_REJECTED");
    expectSafe(response);
  });

  it("telemetry sink throws sin romper respuesta ni filtrar payload", async () => {
    const response = await post(
      {
        telemetry: {
          record() {
            throw new Error("SHOULD_NOT_LEAK_STACK");
          },
          report() {
            throw new Error("SHOULD_NOT_LEAK_STACK");
          },
          reset() {},
        },
      },
      { kind: "apply_single", payload: payload({ documentId: "SYNTHETIC_ONLY_PHASE2C54_TELEMETRY" }) },
    );

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).toContain("reportUnavailable");
    expectSafe(response);
  });

  it("rate limiter e idempotency store throws devuelven errores controlados", async () => {
    const rateLimit = await post(
      {
        rateLimiter: {
          evaluate() {
            throw new Error("SHOULD_NOT_LEAK_STACK");
          },
          reset() {},
        },
      },
      { kind: "dry_run_single", payload: payload({ documentId: "SYNTHETIC_ONLY_PHASE2C54_RATE" }) },
    );
    const idempotency = await post(
      {
        idempotencyStore: {
          evaluate() {
            throw new Error("SHOULD_NOT_LEAK_STACK");
          },
          remember() {
            throw new Error("SHOULD_NOT_LEAK_STACK");
          },
          reset() {},
        },
      },
      { kind: "apply_single", payload: payload({ documentId: "SYNTHETIC_ONLY_PHASE2C54_IDEMPOTENCY" }) },
    );

    expect(rateLimit.status).toBe(500);
    expect(JSON.stringify(rateLimit.body)).toContain("ROUTE_RATE_LIMIT_FAILED");
    expect(idempotency.status).toBe(500);
    expect(JSON.stringify(idempotency.body)).toContain(
      "ROUTE_IDEMPOTENCY_EVALUATION_FAILED",
    );
    expectSafe(rateLimit);
    expectSafe(idempotency);
  });

  it("malformed command y requestId generator throws son seguros", async () => {
    const malformed = await post(
      {},
      { kind: "apply_single", payload: { documentId: "SYNTHETIC_ONLY_PHASE2C54_BAD" } },
    );
    const requestIdFailure = await createDocumentSyncRouteHandler(
      dependencies({
        requestIdFactory: () => {
          throw new Error("SHOULD_NOT_LEAK_STACK");
        },
      }),
    ).handleDocumentSyncRouteRequest({
      method: "POST",
      headers: headers(),
      readBody: () => JSON.stringify({ kind: "apply_single", payload: payload() }),
    });

    expect(malformed.status).toBe(500);
    expect(JSON.stringify(malformed.body)).toContain("ROUTE_FAKE_EXECUTION_REJECTED");
    expect(requestIdFailure.status).toBe(500);
    expect(JSON.stringify(requestIdFailure.body)).toContain("ROUTE_REQUEST_ID_FAILED");
    expectSafe(malformed);
    expectSafe(requestIdFailure);
  });
});
