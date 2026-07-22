import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_RESOLUTION_BODY_BYTES = 4 * 1024;
const MAX_RESOLUTION_EVENTS = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Vary: "Authorization",
} as const;

interface ErrorEventRow extends Record<string, unknown> {
  user_id: string | null;
}

interface AdminErrorActor {
  key: string;
  kind: "user" | "system";
  email: string | null;
}

function withPrivateHeaders<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  return withPrivateHeaders(NextResponse.json(body, init));
}

function normalizeResolutionEventIds(value: unknown): string[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "eventIds") return null;

  const eventIds = (value as { eventIds?: unknown }).eventIds;
  if (
    !Array.isArray(eventIds) ||
    eventIds.length === 0 ||
    eventIds.length > MAX_RESOLUTION_EVENTS ||
    eventIds.some(
      (eventId) => typeof eventId !== "string" || !UUID_PATTERN.test(eventId),
    )
  ) {
    return null;
  }

  return Array.from(new Set(eventIds));
}

function isMissingErrorEventsTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/app_error_events/i.test(error.message ?? "") &&
      /schema cache|does not exist|not find/i.test(error.message ?? ""))
  );
}

export async function GET(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_errors",
      limit: 120,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return privateJson(
      { error: "Servidor admin no disponible" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(10, Number(searchParams.get("limit") ?? 50)),
  );
  const status =
    searchParams.get("status") === "resolved" ? "resolved" : "pending";

  const query = admin
    .from("app_error_events")
    .select(
      "id,user_id,severity,area,code,message,route,created_at,resolved_at",
    )
    .neq("area", "fiscal_watch_review");
  const filteredQuery =
    status === "resolved"
      ? query.not("resolved_at", "is", null)
      : query.is("resolved_at", null);
  const { data, error } = await filteredQuery
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingErrorEventsTable(error)) {
      return privateJson({
        errors: [],
        monitoringAvailable: false,
        message:
          "El registro de errores todavía no está activado en la base de datos.",
      });
    }
    return privateJson(
      { error: "No se pudieron cargar los errores" },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as ErrorEventRow[];
  const userIds = Array.from(
    new Set(
      rows
        .map((row) => row.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );
  const actorsByUserId = new Map<string, AdminErrorActor>();

  await Promise.all(
    userIds.map(async (userId, index) => {
      let email: string | null = null;
      try {
        const { data: userData, error: userError } =
          await admin.auth.admin.getUserById(userId);
        if (!userError) email = userData.user?.email ?? null;
      } catch {
        // Keep the event visible even if the account no longer resolves.
      }
      actorsByUserId.set(userId, {
        key: `account-${index + 1}`,
        kind: "user",
        email,
      });
    }),
  );

  const errors = rows.map(({ user_id: userId, ...row }) => ({
    ...row,
    actor: userId
      ? (actorsByUserId.get(userId) ?? {
          key: "account-unavailable",
          kind: "user" as const,
          email: null,
        })
      : {
          key: "system",
          kind: "system" as const,
          email: null,
        },
  }));

  return privateJson({ errors, monitoringAvailable: true });
}

export async function PATCH(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPrivateHeaders(access.response);

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_errors_resolve",
      limit: 30,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }

  const body = await readJsonBody(request, {
    maxBytes: MAX_RESOLUTION_BODY_BYTES,
    invalidMessage: "Confirmación de errores no válida.",
    tooLargeMessage: "La confirmación contiene demasiados datos.",
  });
  if (!body.ok) return withPrivateHeaders(body.response);

  const eventIds = normalizeResolutionEventIds(body.data);
  if (!eventIds) {
    return privateJson(
      { error: "Confirmación de errores no válida." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return privateJson(
      { error: "Servidor admin no disponible" },
      { status: 503 },
    );
  }

  const resolvedAt = new Date().toISOString();
  const update = await admin
    .from("app_error_events")
    .update({ resolved_at: resolvedAt })
    .in("id", eventIds)
    .neq("area", "fiscal_watch_review")
    .is("resolved_at", null);

  if (update.error) {
    return privateJson(
      { error: "No se pudieron confirmar los errores." },
      { status: 500 },
    );
  }

  const readback = await admin
    .from("app_error_events")
    .select("id,resolved_at")
    .in("id", eventIds)
    .neq("area", "fiscal_watch_review");

  if (readback.error) {
    return privateJson(
      { error: "No se pudo comprobar la confirmación." },
      { status: 503 },
    );
  }

  const resolved = (readback.data ?? []).filter(
    (row): row is { id: string; resolved_at: string } =>
      typeof row.id === "string" && typeof row.resolved_at === "string",
  );
  const resolvedIds = new Set(resolved.map((row) => row.id));
  if (
    resolved.length !== eventIds.length ||
    eventIds.some((eventId) => !resolvedIds.has(eventId))
  ) {
    return privateJson(
      { error: "No se pudieron confirmar todos los errores." },
      { status: 409 },
    );
  }

  return privateJson({ resolved });
}
