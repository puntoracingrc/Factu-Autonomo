import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  readJsonBody,
  rejectOversizedContentLength,
} from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  handleServerDocumentIngestForServer,
  type ServerDocumentIngestWiringInput,
} from "./ingest-wiring";
import { isServerDocumentIngestRouteEnabled } from "./route-flag";
import {
  SERVER_DOCUMENT_INGEST_ROUTE,
  buildServerDocumentRateLimitKey,
  defaultServerDocumentIngestAuditRecorder,
  defaultServerDocumentIngestRateLimiter,
  getSafeServerDocumentAction,
  resolveServerDocumentRequestId,
  type ServerDocumentIngestAuditRecorder,
  type ServerDocumentIngestRateLimiter,
} from "./operational-hardening";
import {
  safeRejectedResponse,
  sanitizeServerDocumentIngestResult,
  type SafeServerDocumentResponse,
} from "./safe-response";
import type { ServerDocumentAuthSource } from "./auth-context";
import type { SupabaseServerDocumentClient } from "./supabase-store";

type AuthenticatedUser = Awaited<ReturnType<typeof getUserFromBearer>>;
type ServerDocumentIngestHandler = (
  input: ServerDocumentIngestWiringInput<ServerDocumentAuthSource>,
) => Promise<SafeServerDocumentResponse>;

export interface ServerDocumentIngestRouteDependencies {
  isEnabled?: () => boolean;
  authenticate?: (authorization: string | null) => Promise<AuthenticatedUser>;
  getSupabaseClient?: () => SupabaseServerDocumentClient | null;
  handleIngest?: ServerDocumentIngestHandler;
  auditRecorder?: ServerDocumentIngestAuditRecorder;
  generateRequestId?: () => string;
  rateLimiter?: ServerDocumentIngestRateLimiter | null;
  now?: () => string;
}

type SafeStatusReason = Extract<
  SafeServerDocumentResponse,
  { reason: unknown }
>["reason"];

const CLIENT_CONTROLLED_KEYS = new Set([
  "authenticatedUserId",
  "entitlement",
  "entitlements",
  "plan",
  "role",
  "status",
  "user_id",
  "userId",
]);
const SERVER_DOCUMENT_INGEST_MAX_BYTES = 256 * 1024;
const SERVER_DOCUMENT_INGEST_TOO_LARGE_MESSAGE =
  "La peticion de ingest es demasiado grande.";

function jsonResponse(
  body: SafeServerDocumentResponse,
  status: number,
  requestId: string,
) {
  return NextResponse.json(body, {
    status,
    headers: { "x-request-id": requestId },
  });
}

function routeUnavailableResponse(requestId: string) {
  const init = { status: 404 };
  return NextResponse.json(
    {
      error: "Ruta no disponible.",
    },
    { ...init, headers: { "x-request-id": requestId } },
  );
}

export function serverDocumentIngestMethodNotAllowedResponse(
  requestId = resolveServerDocumentRequestId(null),
) {
  return NextResponse.json(
    {
      error: "Metodo no permitido.",
    },
    {
      status: 405,
      headers: { Allow: "POST", "x-request-id": requestId },
    },
  );
}

function isJsonRequest(request: Request): boolean {
  return (
    request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json") ?? false
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stripClientControlledClaims(body: unknown): unknown {
  if (!isRecord(body)) return body;

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!CLIENT_CONTROLLED_KEYS.has(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function statusForSafeResponse(response: SafeServerDocumentResponse): number {
  if (response.status === "accepted") return 200;
  if (response.status === "conflict") return 409;

  const reason = response.reason as SafeStatusReason;
  if (reason === "unauthorized") return 401;
  if (reason === "invalid_request" || reason === "missing_expected_version") {
    return 400;
  }
  if (reason === "rate_limited") return 429;
  if (reason === "store_error") return 500;
  return 409;
}

function safeErrorResponse() {
  return safeRejectedResponse(
    "store_error",
    "No se pudo procesar el ingest documental de forma segura.",
  );
}

async function parseJsonBody(request: Request): Promise<
  | {
      ok: true;
      body: unknown;
    }
  | {
      ok: false;
      response: SafeServerDocumentResponse;
      status: number;
    }
> {
  if (!isJsonRequest(request)) {
    return {
      ok: false,
      response: safeRejectedResponse(
        "invalid_request",
        "La peticion debe enviarse como JSON.",
      ),
      status: 400,
    };
  }

  const body = await readJsonBody<unknown>(request, {
    maxBytes: SERVER_DOCUMENT_INGEST_MAX_BYTES,
    invalidMessage: "Body JSON invalido.",
    tooLargeMessage: SERVER_DOCUMENT_INGEST_TOO_LARGE_MESSAGE,
  });
  if (!body.ok) {
    return {
      ok: false,
      response: safeRejectedResponse(
        "invalid_request",
        body.response.status === 413
          ? SERVER_DOCUMENT_INGEST_TOO_LARGE_MESSAGE
          : "Body JSON invalido.",
      ),
      status: body.response.status,
    };
  }

  return { ok: true, body: body.data };
}

export async function handleServerDocumentIngestRoute(
  request: Request,
  dependencies: ServerDocumentIngestRouteDependencies = {},
): Promise<NextResponse> {
  const requestId = resolveServerDocumentRequestId(
    request.headers.get("x-request-id"),
    dependencies.generateRequestId,
  );
  const auditRecorder =
    dependencies.auditRecorder ?? defaultServerDocumentIngestAuditRecorder;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const recordAudit = async (
    response: SafeServerDocumentResponse,
    action?: string,
    userId?: string,
  ) => {
    await auditRecorder.record({
      timestamp: now(),
      requestId,
      route: SERVER_DOCUMENT_INGEST_ROUTE,
      status: response.status,
      ...(action ? { action } : {}),
      ...(response.status === "accepted" ? {} : { reason: response.reason }),
      ...(userId ? { userId } : {}),
    });
  };

  const isEnabled =
    dependencies.isEnabled ?? isServerDocumentIngestRouteEnabled;
  if (!isEnabled()) {
    return routeUnavailableResponse(requestId);
  }

  if (request.method !== "POST") {
    return serverDocumentIngestMethodNotAllowedResponse(requestId);
  }

  const declaredTooLarge = rejectOversizedContentLength(
    request,
    SERVER_DOCUMENT_INGEST_MAX_BYTES,
    SERVER_DOCUMENT_INGEST_TOO_LARGE_MESSAGE,
  );
  if (declaredTooLarge) {
    const response = safeRejectedResponse(
      "invalid_request",
      SERVER_DOCUMENT_INGEST_TOO_LARGE_MESSAGE,
    );
    await recordAudit(response);
    return jsonResponse(response, 413, requestId);
  }

  const authenticate =
    dependencies.authenticate ??
    ((authorization: string | null) =>
      getUserFromBearer(authorization, { requireEmailConfirmed: true }));
  const user = await authenticate(request.headers.get("authorization"));
  if (!user?.id) {
    const response = safeRejectedResponse("unauthorized", "No autorizado.");
    await recordAudit(response);
    return jsonResponse(response, 401, requestId);
  }

  const rateLimiter =
    dependencies.rateLimiter === undefined
      ? defaultServerDocumentIngestRateLimiter
      : dependencies.rateLimiter;
  if (rateLimiter) {
    const rateLimit = await rateLimiter.check({
      key: buildServerDocumentRateLimitKey(request, user.id),
      requestId,
      userId: user.id,
    });
    if (!rateLimit.allowed) {
      const response = safeRejectedResponse(
        "rate_limited",
        "Demasiados intentos. Prueba de nuevo en unos instantes.",
      );
      await recordAudit(response, undefined, user.id);
      return jsonResponse(response, 429, requestId);
    }
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    await recordAudit(parsed.response, undefined, user.id);
    return jsonResponse(parsed.response, parsed.status, requestId);
  }
  const action = getSafeServerDocumentAction(parsed.body);

  const getSupabaseClient =
    dependencies.getSupabaseClient ??
    (() => getSupabaseAdmin() as SupabaseServerDocumentClient | null);
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    const response = safeErrorResponse();
    await recordAudit(response, action, user.id);
    return jsonResponse(response, 503, requestId);
  }

  try {
    const handleIngest =
      dependencies.handleIngest ?? handleServerDocumentIngestForServer;
    const result = await handleIngest({
      authSource: { authenticatedUserId: user.id },
      authResolver: async (source) => source,
      supabaseClient,
      body: stripClientControlledClaims(parsed.body),
    });
    const safe = sanitizeServerDocumentIngestResult(result);
    await recordAudit(safe, action, user.id);
    return jsonResponse(safe, statusForSafeResponse(safe), requestId);
  } catch {
    const response = safeErrorResponse();
    await recordAudit(response, action, user.id);
    return jsonResponse(response, 500, requestId);
  }
}
