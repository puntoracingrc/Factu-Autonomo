import { NextResponse } from "next/server";
import {
  buildDisabledRouteAuthContext,
} from "@/lib/document-sync-integrity/route-auth-context";
import {
  buildDocumentSyncRouteFakeCommand,
  DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
  DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
} from "@/lib/document-sync-integrity/route-fake-adapter";
import {
  buildDocumentSyncRouteDisabledResponse,
  buildDocumentSyncRouteErrorResponse,
  buildDocumentSyncRouteLocalFakeResponse,
  buildDocumentSyncRouteSafeResponse,
  parseDocumentSyncRouteEnvelope,
} from "@/lib/document-sync-integrity/route-envelope";
import {
  buildDocumentSyncRouteIdempotencyKey,
  evaluateDocumentSyncRouteIdempotency,
  normalizeDocumentSyncRouteIdempotencyKey,
  summarizeDocumentSyncRouteIdempotency,
} from "@/lib/document-sync-integrity/route-idempotency";
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
  evaluateDocumentSyncRouteRateLimit,
  normalizeDocumentSyncRouteRequestId,
  summarizeDocumentSyncRouteRateLimit,
} from "@/lib/document-sync-integrity/route-rate-limit";
import {
  evaluateDocumentSyncRouteShellFlag,
} from "@/lib/document-sync-integrity/route-shell-flag";
import {
  buildDocumentSyncRouteTelemetryReport,
  recordDocumentSyncRouteTelemetryEvent,
} from "@/lib/document-sync-integrity/route-telemetry";
import type {
  DocumentSyncServerCommandKind,
  DocumentSyncServerCommandPayload,
} from "@/lib/document-sync-integrity/server-sync-command";

// PHASE2C32_DISABLED_SYNC_ROUTE_SHELL_HTTP_V1
// PHASE2C39_SYNC_ROUTE_LOCAL_FAKE_EXECUTION_BOUNDARY_V1
// PHASE2C43_SYNC_ROUTE_METHOD_CONTENT_CACHE_CORS_HARDENING_V1
export const dynamic = "force-dynamic";

const allowedKinds = new Set<DocumentSyncServerCommandKind>([
  "dry_run_single",
  "apply_single",
  "dry_run_batch",
  "apply_batch",
  "get_safe_state",
  "get_conflict_report",
  "get_safe_report",
]);

const routeRateLimiter = getDocumentSyncRouteRateLimiter();
const routeIdempotency = getDocumentSyncRouteIdempotencyStore();
const routeTelemetry = getDocumentSyncRouteTelemetry();

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

function currentFlag() {
  return evaluateDocumentSyncRouteShellFlag(process.env);
}

function currentLocalExecutionMode() {
  return evaluateDocumentSyncLocalExecutionMode(process.env);
}

function methodNotAllowed(requestId?: string) {
  const response = buildDocumentSyncRouteErrorResponse(
    "METHOD_NOT_ALLOWED",
    requestId,
    405,
  );
  response.headers.allow = "GET, POST";
  return toNextResponse(response);
}

function sourceKeyFromRequest(request: Request): string {
  return request.headers.get("x-document-sync-source") ??
    "SYNTHETIC_ONLY_ROUTE_SOURCE";
}

function isJsonRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().split(";")[0].trim() === "application/json";
}

function parseBody(rawBody: string): unknown {
  return rawBody.trim() ? JSON.parse(rawBody) : {};
}

function objectBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeKind(value: unknown): DocumentSyncServerCommandKind | null {
  return typeof value === "string" &&
    allowedKinds.has(value as DocumentSyncServerCommandKind)
    ? (value as DocumentSyncServerCommandKind)
    : null;
}

function syntheticIdentifierKey(key: string): boolean {
  return [
    "localDocumentId",
    "documentId",
    "itemId",
    "payloadUserId",
    "payloadScopeId",
  ].includes(key);
}

function assertSyntheticIdentifiers(value: unknown, key = ""): void {
  if (
    syntheticIdentifierKey(key) &&
    typeof value === "string" &&
    !value.startsWith("SYNTHETIC_ONLY_")
  ) {
    throw new Error("NON_SYNTHETIC_ROUTE_PAYLOAD");
  }
  if (Array.isArray(value)) {
    for (const entry of value) assertSyntheticIdentifiers(entry);
    return;
  }
  if (value && typeof value === "object") {
    for (const [entryKey, entryValue] of Object.entries(value)) {
      assertSyntheticIdentifiers(entryValue, entryKey);
    }
  }
}

function payloadFromBody(
  body: Record<string, unknown>,
): {
  kind: DocumentSyncServerCommandKind;
  payload?: DocumentSyncServerCommandPayload;
  batch?: DocumentSyncServerCommandPayload[];
  stopOnFirstError?: boolean;
} | { error: string } {
  const kind = safeKind(body.kind);
  if (!kind) return { error: "UNKNOWN_ROUTE_OPERATION" };

  if (kind === "dry_run_single" || kind === "apply_single") {
    const payload = objectBody(body.payload);
    if (!payload) return { error: "INVALID_ROUTE_PAYLOAD" };
    return { kind, payload: payload as DocumentSyncServerCommandPayload };
  }

  if (kind === "dry_run_batch" || kind === "apply_batch") {
    if (!Array.isArray(body.batch)) return { error: "INVALID_ROUTE_BATCH" };
    if (body.batch.length > 25) return { error: "BATCH_TOO_LARGE" };
    return {
      kind,
      batch: body.batch as DocumentSyncServerCommandPayload[],
      stopOnFirstError: body.stopOnFirstError === true,
    };
  }

  return { kind };
}

function maybeIdempotent(kind: DocumentSyncServerCommandKind): boolean {
  return kind === "apply_single" || kind === "apply_batch";
}

export async function GET() {
  recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
    type: currentFlag().enabled ? "route_local_shell_hit" : "route_disabled_hit",
  });
  return toNextResponse(
    buildDocumentSyncRouteDisabledResponse(
      currentFlag(),
      "SYNTHETIC_ONLY_ROUTE_GET",
    ),
  );
}

export async function POST(request: Request) {
  const flag = currentFlag();
  if (!flag.enabled) {
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_disabled_hit",
    });
    return toNextResponse(
      buildDocumentSyncRouteDisabledResponse(
        flag,
        "SYNTHETIC_ONLY_ROUTE_POST_DISABLED",
      ),
    );
  }

  if (!isJsonRequest(request)) {
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_payload_rejected",
      reason: "UNSUPPORTED_CONTENT_TYPE",
    });
    return toNextResponse(
      buildDocumentSyncRouteErrorResponse(
        "UNSUPPORTED_CONTENT_TYPE",
        "SYNTHETIC_ONLY_ROUTE_POST_CONTENT_TYPE",
        415,
      ),
    );
  }

  const requestIdResult = normalizeDocumentSyncRouteRequestId(
    request.headers.get("x-request-id"),
  );
  if (requestIdResult.status === "rejected") {
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_payload_rejected",
      reason: requestIdResult.code,
    });
    return toNextResponse(
      buildDocumentSyncRouteErrorResponse(
        requestIdResult.code,
        "SYNTHETIC_ONLY_ROUTE_UNSAFE_REQUEST_ID",
        400,
      ),
    );
  }

  const rawBody = await request.text();
  const envelope = parseDocumentSyncRouteEnvelope({
    method: "POST",
    rawBody,
    requestId: requestIdResult.requestId,
  });

  if (envelope.status === "rejected") {
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_payload_rejected",
      requestId: envelope.requestId,
      reason: envelope.code,
    });
    return toNextResponse(
      buildDocumentSyncRouteErrorResponse(envelope.code, envelope.requestId, 400),
    );
  }

  const localExecution = currentLocalExecutionMode();
  if (!localExecution.enabled) {
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_local_shell_hit",
      requestId: envelope.requestId,
      reason: localExecution.reason,
    });
    return toNextResponse(
      buildDocumentSyncRouteSafeResponse(
        "route_shell_enabled_but_operations_disabled",
        envelope.safeSummary,
        envelope.requestId,
      ),
    );
  }

  const rateLimit = evaluateDocumentSyncRouteRateLimit(
    routeRateLimiter,
    sourceKeyFromRequest(request),
  );
  if (rateLimit.status === "rate_limited") {
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_rate_limited",
      requestId: envelope.requestId,
      status: "rate_limited",
    });
    return toNextResponse(
      buildDocumentSyncRouteLocalFakeResponse(
        "ROUTE_RATE_LIMITED",
        { rateLimit: summarizeDocumentSyncRouteRateLimit(rateLimit) },
        envelope.requestId,
        429,
      ),
    );
  }

  let parsed: unknown;
  try {
    parsed = parseBody(rawBody);
    assertSyntheticIdentifiers(parsed);
  } catch (error) {
    const code =
      error instanceof Error && error.message === "NON_SYNTHETIC_ROUTE_PAYLOAD"
        ? "NON_SYNTHETIC_ROUTE_PAYLOAD"
        : "MALFORMED_BODY";
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_payload_rejected",
      requestId: envelope.requestId,
      reason: code,
    });
    return toNextResponse(
      buildDocumentSyncRouteErrorResponse(code, envelope.requestId, 400),
    );
  }

  const parsedBody = objectBody(parsed);
  if (!parsedBody) {
    return toNextResponse(
      buildDocumentSyncRouteErrorResponse(
        "INVALID_ROUTE_PAYLOAD",
        envelope.requestId,
        400,
      ),
    );
  }

  const commandInput = payloadFromBody(parsedBody);
  if ("error" in commandInput) {
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_fake_execution_rejected",
      requestId: envelope.requestId,
      reason: commandInput.error,
    });
    return toNextResponse(
      buildDocumentSyncRouteErrorResponse(commandInput.error, envelope.requestId, 400),
    );
  }

  const idempotencyHeader = request.headers.get("x-idempotency-key");
  if (idempotencyHeader) {
    const normalizedKey = normalizeDocumentSyncRouteIdempotencyKey(idempotencyHeader);
    if (normalizedKey.status === "rejected") {
      recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
        type: "route_fake_execution_rejected",
        requestId: envelope.requestId,
        reason: normalizedKey.code,
      });
      return toNextResponse(
        buildDocumentSyncRouteErrorResponse(
          normalizedKey.code ?? "UNSAFE_IDEMPOTENCY_KEY",
          envelope.requestId,
          400,
        ),
      );
    }
  }

  const authContext = buildDisabledRouteAuthContext({
    mode: "synthetic_local_test",
    requestId: envelope.requestId,
    syntheticUserId: DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
    syntheticScopeId: DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
    payload: parsed,
  });
  if (authContext.status !== "synthetic_local_context") {
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_fake_execution_rejected",
      requestId: envelope.requestId,
      reason: authContext.safeSummary.reason,
    });
    return toNextResponse(
      buildDocumentSyncRouteErrorResponse(
        "PAYLOAD_AUTH_REJECTED",
        envelope.requestId,
        400,
      ),
    );
  }

  const idempotencyKey = maybeIdempotent(commandInput.kind)
    ? buildDocumentSyncRouteIdempotencyKey({
        requestId: envelope.requestId,
        operationKind: commandInput.kind,
        headerKey: idempotencyHeader,
      })
    : undefined;
  if (idempotencyKey) {
    const idempotency = evaluateDocumentSyncRouteIdempotency(
      routeIdempotency,
      idempotencyKey,
      { commandKind: commandInput.kind, requestId: envelope.requestId },
    );
    if (idempotency.status === "replay") {
      recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
        type: "route_replay_detected",
        requestId: envelope.requestId,
        operationKind: commandInput.kind,
        status: "replay",
      });
      return toNextResponse(
        buildDocumentSyncRouteLocalFakeResponse(
          "route_fake_execution_replay",
          {
            idempotency: summarizeDocumentSyncRouteIdempotency(idempotency),
            telemetry: buildDocumentSyncRouteTelemetryReport(routeTelemetry),
          },
          envelope.requestId,
          200,
        ),
      );
    }
    if (idempotency.status === "rejected") {
      return toNextResponse(
        buildDocumentSyncRouteErrorResponse(
          idempotency.code ?? "UNSAFE_IDEMPOTENCY_KEY",
          envelope.requestId,
          400,
        ),
      );
    }
  }

  recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
    type: "route_fake_execution_attempted",
    requestId: envelope.requestId,
    operationKind: commandInput.kind,
  });

  try {
    const runtime = getDocumentSyncRouteFakeRuntime();
    const command = buildDocumentSyncRouteFakeCommand(
      {
        kind: commandInput.kind,
        payload: commandInput.payload,
        batch: commandInput.batch,
        options: {
          maxBatchSize: 25,
          stopOnFirstError: commandInput.stopOnFirstError,
          requestIdFactory: () => envelope.requestId,
        },
      },
      {
        ...authContext.auth,
        requestId: envelope.requestId,
      },
    );
    const result = await runtime.service.handle(command);
    if (idempotencyKey) routeIdempotency.remember(idempotencyKey, result.safeSummary);
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type:
        result.status === "accepted" || result.status === "batch_completed"
          ? "route_fake_execution_accepted"
          : "route_fake_execution_rejected",
      requestId: envelope.requestId,
      operationKind: commandInput.kind,
      status: result.status,
    });
    return toNextResponse(
      buildDocumentSyncRouteLocalFakeResponse(
        "route_fake_execution_completed",
        {
          result,
          rateLimit: summarizeDocumentSyncRouteRateLimit(rateLimit),
          telemetry: buildDocumentSyncRouteTelemetryReport(routeTelemetry),
        },
        envelope.requestId,
        200,
      ),
    );
  } catch {
    recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
      type: "route_fake_execution_rejected",
      requestId: envelope.requestId,
      operationKind: commandInput.kind,
      reason: "ROUTE_FAKE_EXECUTION_REJECTED",
    });
    return toNextResponse(
      buildDocumentSyncRouteErrorResponse(
        "ROUTE_FAKE_EXECUTION_REJECTED",
        envelope.requestId,
        400,
      ),
    );
  }
}

export async function PUT() {
  recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
    type: "route_method_rejected",
    reason: "PUT",
  });
  return methodNotAllowed("SYNTHETIC_ONLY_ROUTE_PUT");
}

export async function PATCH() {
  recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
    type: "route_method_rejected",
    reason: "PATCH",
  });
  return methodNotAllowed("SYNTHETIC_ONLY_ROUTE_PATCH");
}

export async function DELETE() {
  recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
    type: "route_method_rejected",
    reason: "DELETE",
  });
  return methodNotAllowed("SYNTHETIC_ONLY_ROUTE_DELETE");
}

export async function OPTIONS() {
  recordDocumentSyncRouteTelemetryEvent(routeTelemetry, {
    type: "route_method_rejected",
    reason: "OPTIONS",
  });
  return methodNotAllowed("SYNTHETIC_ONLY_ROUTE_OPTIONS");
}
