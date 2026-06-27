import { NextResponse } from "next/server";
import {
  buildDisabledRouteAuthContext,
} from "@/lib/document-sync-integrity/route-auth-context";
import {
  DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
  DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
} from "@/lib/document-sync-integrity/route-fake-adapter";
import {
  createDocumentSyncRouteHandler,
} from "@/lib/document-sync-integrity/route-handler";
import {
  getDocumentSyncRouteFakeRuntime,
  getDocumentSyncRouteIdempotencyStore,
  getDocumentSyncRouteRateLimiter,
  getDocumentSyncRouteTelemetry,
} from "@/lib/document-sync-integrity/route-local-state";
import {
  evaluateDocumentSyncLocalExecutionMode,
} from "@/lib/document-sync-integrity/route-local-execution-contract";
import {
  evaluateDocumentSyncRouteShellFlag,
} from "@/lib/document-sync-integrity/route-shell-flag";

// PHASE2C32_DISABLED_SYNC_ROUTE_SHELL_HTTP_V1
// PHASE2C39_SYNC_ROUTE_LOCAL_FAKE_EXECUTION_BOUNDARY_V1
// PHASE2C43_SYNC_ROUTE_METHOD_CONTENT_CACHE_CORS_HARDENING_V1
// PHASE2C50_SYNC_ROUTE_HANDLER_DEPENDENCY_BOUNDARY_V1
export const dynamic = "force-dynamic";

const routeHandler = createDocumentSyncRouteHandler({
  evaluateShellFlag: () => evaluateDocumentSyncRouteShellFlag(process.env),
  evaluateLocalExecution: () => evaluateDocumentSyncLocalExecutionMode(process.env),
  rateLimiter: getDocumentSyncRouteRateLimiter(),
  idempotencyStore: getDocumentSyncRouteIdempotencyStore(),
  telemetry: getDocumentSyncRouteTelemetry(),
  authContextFactory: (input) =>
    buildDisabledRouteAuthContext({
      ...input,
      mode: "synthetic_local_test",
      syntheticUserId: DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
      syntheticScopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
    }),
  serviceFactory: () => getDocumentSyncRouteFakeRuntime().service,
});

function toNextResponse(response: {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}) {
  return NextResponse.json(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET() {
  return toNextResponse(
    await routeHandler.handleDocumentSyncRouteRequest({
      method: "GET",
    }),
  );
}

export async function POST(request: Request) {
  return toNextResponse(
    await routeHandler.handleDocumentSyncRouteRequest({
      method: "POST",
      headers: request.headers,
      readBody: () => request.text(),
    }),
  );
}

export async function PUT() {
  return toNextResponse(
    await routeHandler.handleDocumentSyncRouteRequest({ method: "PUT" }),
  );
}

export async function PATCH() {
  return toNextResponse(
    await routeHandler.handleDocumentSyncRouteRequest({ method: "PATCH" }),
  );
}

export async function DELETE() {
  return toNextResponse(
    await routeHandler.handleDocumentSyncRouteRequest({ method: "DELETE" }),
  );
}

export async function OPTIONS() {
  return toNextResponse(
    await routeHandler.handleDocumentSyncRouteRequest({ method: "OPTIONS" }),
  );
}
