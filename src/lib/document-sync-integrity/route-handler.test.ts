import { describe, expect, it } from "vitest";
import {
  buildDisabledRouteAuthContext,
} from "./route-auth-context";
import {
  createDocumentSyncRouteFakeService,
  DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
  DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
} from "./route-fake-adapter";
import {
  createDocumentSyncRouteHandler,
  summarizeDocumentSyncRouteHandlerResult,
  type DocumentSyncRouteHandlerDependencies,
} from "./route-handler";
import {
  createInMemoryDocumentSyncRouteIdempotencyStore,
} from "./route-idempotency";
import {
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
  evaluateDocumentSyncLocalExecutionMode,
} from "./route-local-execution-contract";
import {
  createInMemoryDocumentSyncRouteRateLimiter,
} from "./route-rate-limit";
import {
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  evaluateDocumentSyncRouteShellFlag,
} from "./route-shell-flag";
import {
  createInMemoryDocumentSyncRouteTelemetry,
} from "./route-telemetry";

// PHASE2C50_SYNC_ROUTE_HANDLER_DEPENDENCY_BOUNDARY_V1

const enabledEnv = {
  [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
  [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  [DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY]: "true",
  [DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY]:
    DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
};

function dependencies(
  overrides: Partial<DocumentSyncRouteHandlerDependencies> = {},
) {
  const runtime = createDocumentSyncRouteFakeService();
  return {
    evaluateShellFlag: () => evaluateDocumentSyncRouteShellFlag(enabledEnv),
    evaluateLocalExecution: () => evaluateDocumentSyncLocalExecutionMode(enabledEnv),
    rateLimiter: createInMemoryDocumentSyncRouteRateLimiter({
      limit: 20,
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
    requestIdFactory: () => "SYNTHETIC_ONLY_GENERATED_HANDLER_REQUEST",
    ...overrides,
  } satisfies DocumentSyncRouteHandlerDependencies;
}

function headers(extra: Record<string, string> = {}) {
  return {
    "content-type": "application/json",
    "x-request-id": "SYNTHETIC_ONLY_HANDLER_REQUEST",
    "x-document-sync-source": "SYNTHETIC_ONLY_HANDLER_SOURCE",
    ...extra,
  };
}

function body(suffix: string) {
  return JSON.stringify({
    kind: "apply_single",
    payload: {
      operationKind: "create_draft",
      documentId: `SYNTHETIC_ONLY_HANDLER_DOC_${suffix}`,
      localDocumentId: `SYNTHETIC_ONLY_HANDLER_LOCAL_${suffix}`,
      payloadHash: `hash:${suffix}`,
    },
  });
}

describe("document sync route private handler dependency boundary", () => {
  it("mantiene disabled default sin leer body ni crear servicio", async () => {
    let bodyRead = false;
    let serviceCreated = false;
    const handler = createDocumentSyncRouteHandler(
      dependencies({
        evaluateShellFlag: () => evaluateDocumentSyncRouteShellFlag({}),
        serviceFactory: () => {
          serviceCreated = true;
          return createDocumentSyncRouteFakeService().service;
        },
      }),
    );

    const response = await handler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: headers(),
      readBody: () => {
        bodyRead = true;
        return body("DISABLED");
      },
    });

    expect(response.status).toBe(404);
    expect(bodyRead).toBe(false);
    expect(serviceCreated).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain("HANDLER_DOC_DISABLED");
  });

  it("ejecuta local fake success con dependencias inyectadas", async () => {
    const handler = createDocumentSyncRouteHandler(dependencies());
    const response = await handler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: headers(),
      readBody: () => body("SUCCESS"),
    });

    expect(response.status).toBe(200);
    expect(summarizeDocumentSyncRouteHandlerResult(response)).toMatchObject({
      ok: true,
      code: "route_fake_execution_completed",
      routeShell: "local_fake_execution",
    });
    expect(JSON.stringify(response.body)).not.toContain("documentSnapshot");
  });

  it("rechaza dependencias ausentes en creacion", () => {
    expect(() =>
      createDocumentSyncRouteHandler({} as DocumentSyncRouteHandlerDependencies),
    ).toThrow("missing dependency");
  });

  it("rechaza user/scope desde payload sin eco", async () => {
    const handler = createDocumentSyncRouteHandler(dependencies());
    const response = await handler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: headers(),
      readBody: () =>
        JSON.stringify({
          kind: "apply_single",
          payload: {
            operationKind: "create_draft",
            documentId: "SYNTHETIC_ONLY_HANDLER_DOC_AUTH",
            localDocumentId: "SYNTHETIC_ONLY_HANDLER_LOCAL_AUTH",
            payloadUserId: "SYNTHETIC_ONLY_OTHER_USER",
          },
        }),
    });

    const serialized = JSON.stringify(response.body);
    expect(response.status).toBe(400);
    expect(serialized).toContain("PAYLOAD_AUTH_REJECTED");
    expect(serialized).not.toContain("SYNTHETIC_ONLY_OTHER_USER");
  });

  it("controla fallo de servicio sin stack ni payload", async () => {
    const handler = createDocumentSyncRouteHandler(
      dependencies({
        serviceFactory: () => {
          throw new Error("SHOULD_NOT_LEAK_STACK");
        },
      }),
    );
    const response = await handler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: headers(),
      readBody: () => body("SERVICE_THROW"),
    });

    const serialized = JSON.stringify(response.body);
    expect(response.status).toBe(500);
    expect(serialized).toContain("ROUTE_FAKE_EXECUTION_REJECTED");
    expect(serialized).not.toContain("SHOULD_NOT_LEAK_STACK");
    expect(serialized).not.toContain("HANDLER_DOC_SERVICE_THROW");
  });
});
