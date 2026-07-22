import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_ARCHIVE_BODY_BYTES = 4 * 1024;
const MAX_ARCHIVE_EVENTS = 100;
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

function normalizeArchiveEventIds(value: unknown): string[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "eventIds") return null;

  const eventIds = (value as { eventIds?: unknown }).eventIds;
  if (
    !Array.isArray(eventIds) ||
    eventIds.length === 0 ||
    eventIds.length > MAX_ARCHIVE_EVENTS ||
    eventIds.some(
      (eventId) => typeof eventId !== "string" || !UUID_PATTERN.test(eventId),
    )
  ) {
    return null;
  }

  return Array.from(new Set(eventIds));
}

function isArchiveReceipt(
  value: unknown,
): value is { id: string; resolved_at: string; archived_at: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.resolved_at === "string" &&
    typeof row.archived_at === "string"
  );
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
  const requestedStatus = searchParams.get("status");
  const status =
    requestedStatus === "resolved" || requestedStatus === "archived"
      ? requestedStatus
      : "pending";

  const query = admin
    .from("app_error_events")
    .select(
      "id,user_id,severity,area,code,message,route,created_at,resolved_at,resolution_source,archived_at",
    )
    .neq("area", "fiscal_watch_review");
  const filteredQuery = status === "archived"
    ? query.not("archived_at", "is", null)
    : status === "resolved"
      ? query.not("resolved_at", "is", null).is("archived_at", null)
      : query.is("resolved_at", null).is("archived_at", null);
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
    maxBytes: MAX_ARCHIVE_BODY_BYTES,
    invalidMessage: "Archivo de errores no válido.",
    tooLargeMessage: "El archivo contiene demasiados datos.",
  });
  if (!body.ok) return withPrivateHeaders(body.response);

  const eventIds = normalizeArchiveEventIds(body.data);
  if (!eventIds) {
    return privateJson(
      { error: "Archivo de errores no válido." },
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

  const archive = await admin.rpc("archive_resolved_app_error_events_v1", {
    p_event_ids: eventIds,
  });

  if (archive.error) {
    return privateJson(
      { error: "No se pudieron archivar los errores solucionados." },
      { status: 500 },
    );
  }

  const archived = Array.isArray(archive.data)
    ? archive.data.filter(isArchiveReceipt).map((row) => ({
        id: row.id,
        resolved_at: row.resolved_at,
        archived_at: row.archived_at,
      }))
    : [];
  const archivedIds = new Set(archived.map((row) => row.id));
  if (
    archived.length !== eventIds.length ||
    eventIds.some((eventId) => !archivedIds.has(eventId))
  ) {
    return privateJson(
      { error: "Solo se pueden archivar errores solucionados." },
      { status: 409 },
    );
  }

  return privateJson({ archived });
}
