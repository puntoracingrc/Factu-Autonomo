import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  handleServerDocumentIngestForServer,
  type ServerDocumentIngestWiringInput,
} from "./ingest-wiring";
import { isServerDocumentIngestRouteEnabled } from "./route-flag";
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
  "status",
  "user_id",
  "userId",
]);

function jsonResponse(body: SafeServerDocumentResponse, status: number) {
  return NextResponse.json(body, { status });
}

function routeUnavailableResponse() {
  return NextResponse.json(
    {
      error: "Ruta no disponible.",
    },
    { status: 404 },
  );
}

export function serverDocumentIngestMethodNotAllowedResponse() {
  return NextResponse.json(
    {
      error: "Metodo no permitido.",
    },
    {
      status: 405,
      headers: { Allow: "POST" },
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
    }
> {
  if (!isJsonRequest(request)) {
    return {
      ok: false,
      response: safeRejectedResponse(
        "invalid_request",
        "La peticion debe enviarse como JSON.",
      ),
    };
  }

  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: safeRejectedResponse("invalid_request", "Body JSON invalido."),
    };
  }
}

export async function handleServerDocumentIngestRoute(
  request: Request,
  dependencies: ServerDocumentIngestRouteDependencies = {},
): Promise<NextResponse> {
  const isEnabled =
    dependencies.isEnabled ?? isServerDocumentIngestRouteEnabled;
  if (!isEnabled()) {
    return routeUnavailableResponse();
  }

  if (request.method !== "POST") {
    return serverDocumentIngestMethodNotAllowedResponse();
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return jsonResponse(parsed.response, statusForSafeResponse(parsed.response));
  }

  const authenticate = dependencies.authenticate ?? getUserFromBearer;
  const user = await authenticate(request.headers.get("authorization"));
  if (!user?.id) {
    const response = safeRejectedResponse("unauthorized", "No autorizado.");
    return jsonResponse(response, 401);
  }

  const getSupabaseClient =
    dependencies.getSupabaseClient ??
    (() => getSupabaseAdmin() as SupabaseServerDocumentClient | null);
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return jsonResponse(safeErrorResponse(), 503);
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
    return jsonResponse(safe, statusForSafeResponse(safe));
  } catch {
    return jsonResponse(safeErrorResponse(), 500);
  }
}
