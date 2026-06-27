import type {
  DocumentSyncRouteAuthContextInput,
  DocumentSyncRouteAuthContextResult,
} from "./route-auth-context";
import {
  buildDocumentSyncRouteDisabledResponse,
  buildDocumentSyncRouteErrorResponse,
  buildDocumentSyncRouteLocalFakeResponse,
  buildDocumentSyncRouteSafeResponse,
  parseDocumentSyncRouteEnvelope,
  type DocumentSyncRouteSafeResponse,
} from "./route-envelope";
import {
  buildDocumentSyncRouteIdempotencyKey,
  evaluateDocumentSyncRouteIdempotency,
  normalizeDocumentSyncRouteIdempotencyKey,
  summarizeDocumentSyncRouteIdempotency,
  type InMemoryDocumentSyncRouteIdempotencyStore,
} from "./route-idempotency";
import {
  evaluateDocumentSyncRouteRateLimit,
  normalizeDocumentSyncRouteRequestId,
  summarizeDocumentSyncRouteRateLimit,
  type InMemoryDocumentSyncRouteRateLimiter,
} from "./route-rate-limit";
import type {
  DocumentSyncRouteShellFlagEvaluation,
} from "./route-shell-flag";
import {
  buildDocumentSyncRouteTelemetryReport,
  recordDocumentSyncRouteTelemetryEvent,
  type DocumentSyncRouteTelemetryEvent,
  type InMemoryDocumentSyncRouteTelemetry,
} from "./route-telemetry";
import {
  buildDocumentSyncServerCommand,
  type DocumentSyncServerAuthContext,
  type DocumentSyncServerCommandKind,
  type DocumentSyncServerCommandPayload,
} from "./server-sync-command";
import type { DocumentSyncServerService } from "./server-sync-service";

// PHASE2C50_SYNC_ROUTE_HANDLER_DEPENDENCY_BOUNDARY_V1
assertServerOnlyModule();

type HeaderGetter = { get(name: string): string | null };
type HeaderRecord = Record<string, string | undefined>;

export interface DocumentSyncRouteHandlerLocalExecutionEvaluation {
  enabled: boolean;
  reason: string;
}

export interface DocumentSyncRouteHandlerDependencies {
  evaluateShellFlag: () => DocumentSyncRouteShellFlagEvaluation;
  evaluateLocalExecution: () => DocumentSyncRouteHandlerLocalExecutionEvaluation;
  rateLimiter: InMemoryDocumentSyncRouteRateLimiter;
  idempotencyStore: InMemoryDocumentSyncRouteIdempotencyStore;
  telemetry: InMemoryDocumentSyncRouteTelemetry;
  authContextFactory: (
    input: DocumentSyncRouteAuthContextInput,
  ) => DocumentSyncRouteAuthContextResult;
  serviceFactory: () => DocumentSyncServerService;
  requestIdFactory?: () => string;
}

export interface DocumentSyncRouteHandlerOptions {
  completionCode?: string;
  rejectedCode?: string;
}

export interface DocumentSyncRouteHandlerRequestInput {
  method: string;
  headers?: HeaderGetter | HeaderRecord;
  readBody?: () => Promise<string> | string;
}

export interface DocumentSyncRouteHandlerResultSummary {
  status: number;
  ok: boolean;
  code: string;
  routeShell: string;
  requestId?: string;
}

export interface DocumentSyncRouteHandler {
  handleDocumentSyncRouteRequest(
    input: DocumentSyncRouteHandlerRequestInput,
  ): Promise<DocumentSyncRouteSafeResponse>;
}

const allowedKinds = new Set<DocumentSyncServerCommandKind>([
  "dry_run_single",
  "apply_single",
  "dry_run_batch",
  "apply_batch",
  "get_safe_state",
  "get_conflict_report",
  "get_safe_report",
]);

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("El handler privado de document sync solo puede cargarse en servidor.");
  }
}

function assertDependency(condition: unknown, label: string): void {
  if (!condition) {
    throw new Error(`Document sync route handler missing dependency: ${label}.`);
  }
}

function assertDependencies(
  dependencies: DocumentSyncRouteHandlerDependencies,
): void {
  assertDependency(typeof dependencies.evaluateShellFlag === "function", "evaluateShellFlag");
  assertDependency(typeof dependencies.evaluateLocalExecution === "function", "evaluateLocalExecution");
  assertDependency(dependencies.rateLimiter, "rateLimiter");
  assertDependency(dependencies.idempotencyStore, "idempotencyStore");
  assertDependency(dependencies.telemetry, "telemetry");
  assertDependency(typeof dependencies.authContextFactory === "function", "authContextFactory");
  assertDependency(typeof dependencies.serviceFactory === "function", "serviceFactory");
}

function headerValue(
  headers: DocumentSyncRouteHandlerRequestInput["headers"],
  name: string,
): string | null {
  if (!headers) return null;
  if ("get" in headers && typeof headers.get === "function") {
    return headers.get(name);
  }
  const record = headers as HeaderRecord;
  return record[name] ?? record[name.toLowerCase()] ?? null;
}

function methodNotAllowed(requestId?: string): DocumentSyncRouteSafeResponse {
  const response = buildDocumentSyncRouteErrorResponse(
    "METHOD_NOT_ALLOWED",
    requestId,
    405,
  );
  response.headers.allow = "GET, POST";
  return response;
}

function sourceKeyFromHeaders(
  headers: DocumentSyncRouteHandlerRequestInput["headers"],
): string {
  return headerValue(headers, "x-document-sync-source") ??
    "SYNTHETIC_ONLY_ROUTE_SOURCE";
}

function isJsonRequest(headers: DocumentSyncRouteHandlerRequestInput["headers"]): boolean {
  const contentType = headerValue(headers, "content-type") ?? "";
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

function safeDependencyFailure(
  code: string,
  requestId?: string,
): DocumentSyncRouteSafeResponse {
  return buildDocumentSyncRouteErrorResponse(code, requestId, 500);
}

function safeRecordTelemetry(
  telemetry: InMemoryDocumentSyncRouteTelemetry,
  event: Omit<DocumentSyncRouteTelemetryEvent, "occurredAt" | "persisted">,
): void {
  try {
    recordDocumentSyncRouteTelemetryEvent(telemetry, event);
  } catch {
    // Telemetry is in-memory evidence only; failures must not leak or crash the handler.
  }
}

function safeTelemetryReport(telemetry: InMemoryDocumentSyncRouteTelemetry) {
  try {
    return buildDocumentSyncRouteTelemetryReport(telemetry);
  } catch {
    return {
      total: 0,
      byType: {},
      latest: [],
      persisted: false,
      reportUnavailable: true,
    };
  }
}

function normalizeRequestId(
  dependencies: DocumentSyncRouteHandlerDependencies,
  header: string | null,
): { status: "accepted"; requestId: string } | { status: "rejected"; code: string } {
  if (header) return normalizeDocumentSyncRouteRequestId(header);
  if (dependencies.requestIdFactory) {
    try {
      return normalizeDocumentSyncRouteRequestId(dependencies.requestIdFactory());
    } catch {
      return { status: "rejected", code: "ROUTE_REQUEST_ID_FAILED" };
    }
  }
  return normalizeDocumentSyncRouteRequestId(undefined);
}

async function readBodySafely(
  input: DocumentSyncRouteHandlerRequestInput,
  requestId: string,
): Promise<{ status: "accepted"; rawBody: string } | DocumentSyncRouteSafeResponse> {
  if (!input.readBody) return { status: "accepted", rawBody: "" };
  try {
    return { status: "accepted", rawBody: await input.readBody() };
  } catch {
    return safeDependencyFailure("ROUTE_BODY_READ_FAILED", requestId);
  }
}

function authForPayload(
  dependencies: DocumentSyncRouteHandlerDependencies,
  input: DocumentSyncRouteAuthContextInput,
): DocumentSyncRouteAuthContextResult | DocumentSyncRouteSafeResponse {
  try {
    return dependencies.authContextFactory(input);
  } catch {
    return safeDependencyFailure("ROUTE_AUTH_CONTEXT_FAILED", input.requestId);
  }
}

function commandAuth(
  auth: DocumentSyncServerAuthContext,
  requestId: string,
): DocumentSyncServerAuthContext {
  return {
    ...auth,
    requestId,
  };
}

export function createDocumentSyncRouteHandler(
  dependencies: DocumentSyncRouteHandlerDependencies,
  options: DocumentSyncRouteHandlerOptions = {},
): DocumentSyncRouteHandler {
  assertDependencies(dependencies);

  const completionCode = options.completionCode ?? "route_fake_execution_completed";
  const rejectedCode = options.rejectedCode ?? "ROUTE_FAKE_EXECUTION_REJECTED";

  async function handleGet(): Promise<DocumentSyncRouteSafeResponse> {
    let flag: DocumentSyncRouteShellFlagEvaluation;
    try {
      flag = dependencies.evaluateShellFlag();
    } catch {
      return safeDependencyFailure(
        "ROUTE_FLAG_EVALUATION_FAILED",
        "SYNTHETIC_ONLY_ROUTE_GET",
      );
    }
    safeRecordTelemetry(dependencies.telemetry, {
      type: flag.enabled ? "route_local_shell_hit" : "route_disabled_hit",
    });
    return buildDocumentSyncRouteDisabledResponse(
      flag,
      "SYNTHETIC_ONLY_ROUTE_GET",
    );
  }

  async function handlePost(
    input: DocumentSyncRouteHandlerRequestInput,
  ): Promise<DocumentSyncRouteSafeResponse> {
    let flag: DocumentSyncRouteShellFlagEvaluation;
    try {
      flag = dependencies.evaluateShellFlag();
    } catch {
      return safeDependencyFailure(
        "ROUTE_FLAG_EVALUATION_FAILED",
        "SYNTHETIC_ONLY_ROUTE_POST",
      );
    }

    if (!flag.enabled) {
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_disabled_hit",
      });
      return buildDocumentSyncRouteDisabledResponse(
        flag,
        "SYNTHETIC_ONLY_ROUTE_POST_DISABLED",
      );
    }

    if (!isJsonRequest(input.headers)) {
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_payload_rejected",
        reason: "UNSUPPORTED_CONTENT_TYPE",
      });
      return buildDocumentSyncRouteErrorResponse(
        "UNSUPPORTED_CONTENT_TYPE",
        "SYNTHETIC_ONLY_ROUTE_POST_CONTENT_TYPE",
        415,
      );
    }

    const requestIdResult = normalizeRequestId(
      dependencies,
      headerValue(input.headers, "x-request-id"),
    );
    if (requestIdResult.status === "rejected") {
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_payload_rejected",
        reason: requestIdResult.code,
      });
      return buildDocumentSyncRouteErrorResponse(
        requestIdResult.code,
        "SYNTHETIC_ONLY_ROUTE_UNSAFE_REQUEST_ID",
        requestIdResult.code === "ROUTE_REQUEST_ID_FAILED" ? 500 : 400,
      );
    }

    const bodyResult = await readBodySafely(input, requestIdResult.requestId);
    if ("body" in bodyResult) return bodyResult;

    const envelope = parseDocumentSyncRouteEnvelope({
      method: "POST",
      rawBody: bodyResult.rawBody,
      requestId: requestIdResult.requestId,
    });

    if (envelope.status === "rejected") {
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_payload_rejected",
        requestId: envelope.requestId,
        reason: envelope.code,
      });
      return buildDocumentSyncRouteErrorResponse(envelope.code, envelope.requestId, 400);
    }

    let localExecution: DocumentSyncRouteHandlerLocalExecutionEvaluation;
    try {
      localExecution = dependencies.evaluateLocalExecution();
    } catch {
      return safeDependencyFailure(
        "ROUTE_LOCAL_EXECUTION_EVALUATION_FAILED",
        envelope.requestId,
      );
    }
    if (!localExecution.enabled) {
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_local_shell_hit",
        requestId: envelope.requestId,
        reason: localExecution.reason,
      });
      return buildDocumentSyncRouteSafeResponse(
        "route_shell_enabled_but_operations_disabled",
        envelope.safeSummary,
        envelope.requestId,
      );
    }

    let rateLimit: ReturnType<typeof evaluateDocumentSyncRouteRateLimit>;
    try {
      rateLimit = evaluateDocumentSyncRouteRateLimit(
        dependencies.rateLimiter,
        sourceKeyFromHeaders(input.headers),
      );
    } catch {
      return safeDependencyFailure("ROUTE_RATE_LIMIT_FAILED", envelope.requestId);
    }
    if (rateLimit.status === "rate_limited") {
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_rate_limited",
        requestId: envelope.requestId,
        status: "rate_limited",
      });
      return buildDocumentSyncRouteLocalFakeResponse(
        "ROUTE_RATE_LIMITED",
        { rateLimit: summarizeDocumentSyncRouteRateLimit(rateLimit) },
        envelope.requestId,
        429,
      );
    }

    let parsed: unknown;
    try {
      parsed = parseBody(bodyResult.rawBody);
      assertSyntheticIdentifiers(parsed);
    } catch (error) {
      const code =
        error instanceof Error && error.message === "NON_SYNTHETIC_ROUTE_PAYLOAD"
          ? "NON_SYNTHETIC_ROUTE_PAYLOAD"
          : "MALFORMED_BODY";
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_payload_rejected",
        requestId: envelope.requestId,
        reason: code,
      });
      return buildDocumentSyncRouteErrorResponse(code, envelope.requestId, 400);
    }

    const parsedBody = objectBody(parsed);
    if (!parsedBody) {
      return buildDocumentSyncRouteErrorResponse(
        "INVALID_ROUTE_PAYLOAD",
        envelope.requestId,
        400,
      );
    }

    const commandInput = payloadFromBody(parsedBody);
    if ("error" in commandInput) {
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_fake_execution_rejected",
        requestId: envelope.requestId,
        reason: commandInput.error,
      });
      return buildDocumentSyncRouteErrorResponse(
        commandInput.error,
        envelope.requestId,
        400,
      );
    }

    const idempotencyHeader = headerValue(input.headers, "x-idempotency-key");
    if (idempotencyHeader) {
      const normalizedKey = normalizeDocumentSyncRouteIdempotencyKey(idempotencyHeader);
      if (normalizedKey.status === "rejected") {
        safeRecordTelemetry(dependencies.telemetry, {
          type: "route_fake_execution_rejected",
          requestId: envelope.requestId,
          reason: normalizedKey.code,
        });
        return buildDocumentSyncRouteErrorResponse(
          normalizedKey.code ?? "UNSAFE_IDEMPOTENCY_KEY",
          envelope.requestId,
          400,
        );
      }
    }

    const authContext = authForPayload(dependencies, {
      mode: "synthetic_local_test",
      requestId: envelope.requestId,
      payload: parsed,
    });
    if ("body" in authContext) return authContext;
    if (authContext.status !== "synthetic_local_context") {
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_fake_execution_rejected",
        requestId: envelope.requestId,
        reason: authContext.safeSummary.reason,
      });
      return buildDocumentSyncRouteErrorResponse(
        "PAYLOAD_AUTH_REJECTED",
        envelope.requestId,
        400,
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
      let idempotency: ReturnType<typeof evaluateDocumentSyncRouteIdempotency>;
      try {
        idempotency = evaluateDocumentSyncRouteIdempotency(
          dependencies.idempotencyStore,
          idempotencyKey,
          { commandKind: commandInput.kind, requestId: envelope.requestId },
        );
      } catch {
        return safeDependencyFailure(
          "ROUTE_IDEMPOTENCY_EVALUATION_FAILED",
          envelope.requestId,
        );
      }
      if (idempotency.status === "replay") {
        safeRecordTelemetry(dependencies.telemetry, {
          type: "route_replay_detected",
          requestId: envelope.requestId,
          operationKind: commandInput.kind,
          status: "replay",
        });
        return buildDocumentSyncRouteLocalFakeResponse(
          "route_fake_execution_replay",
          {
            idempotency: summarizeDocumentSyncRouteIdempotency(idempotency),
            telemetry: safeTelemetryReport(dependencies.telemetry),
          },
          envelope.requestId,
          200,
        );
      }
      if (idempotency.status === "rejected") {
        return buildDocumentSyncRouteErrorResponse(
          idempotency.code ?? "UNSAFE_IDEMPOTENCY_KEY",
          envelope.requestId,
          400,
        );
      }
    }

    safeRecordTelemetry(dependencies.telemetry, {
      type: "route_fake_execution_attempted",
      requestId: envelope.requestId,
      operationKind: commandInput.kind,
    });

    try {
      const service = dependencies.serviceFactory();
      const command = buildDocumentSyncServerCommand({
        kind: commandInput.kind,
        auth: commandAuth(authContext.auth, envelope.requestId),
        payload: commandInput.payload,
        batch: commandInput.batch,
        options: {
          maxBatchSize: 25,
          stopOnFirstError: commandInput.stopOnFirstError,
          requestIdFactory: () => envelope.requestId,
        },
      });
      const result = await service.handle(command);
      if (idempotencyKey) {
        try {
          dependencies.idempotencyStore.remember(idempotencyKey, result.safeSummary);
        } catch {
          return safeDependencyFailure(
            "ROUTE_IDEMPOTENCY_REMEMBER_FAILED",
            envelope.requestId,
          );
        }
      }
      safeRecordTelemetry(dependencies.telemetry, {
        type:
          result.status === "accepted" || result.status === "batch_completed"
            ? "route_fake_execution_accepted"
            : "route_fake_execution_rejected",
        requestId: envelope.requestId,
        operationKind: commandInput.kind,
        status: result.status,
      });
      return buildDocumentSyncRouteLocalFakeResponse(
        completionCode,
        {
          result,
          rateLimit: summarizeDocumentSyncRouteRateLimit(rateLimit),
          telemetry: safeTelemetryReport(dependencies.telemetry),
        },
        envelope.requestId,
        200,
      );
    } catch {
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_fake_execution_rejected",
        requestId: envelope.requestId,
        operationKind: commandInput.kind,
        reason: rejectedCode,
      });
      return safeDependencyFailure(rejectedCode, envelope.requestId);
    }
  }

  return {
    async handleDocumentSyncRouteRequest(input) {
      const method = input.method.toUpperCase();
      if (method === "GET") return handleGet();
      if (method === "POST") return handlePost(input);
      safeRecordTelemetry(dependencies.telemetry, {
        type: "route_method_rejected",
        reason: method,
      });
      return methodNotAllowed(`SYNTHETIC_ONLY_ROUTE_${method}`);
    },
  };
}

export function summarizeDocumentSyncRouteHandlerResult(
  response: DocumentSyncRouteSafeResponse,
): DocumentSyncRouteHandlerResultSummary {
  return {
    status: response.status,
    ok: response.body.ok,
    code: response.body.code,
    routeShell: response.body.routeShell,
    requestId: response.body.requestId,
  };
}
