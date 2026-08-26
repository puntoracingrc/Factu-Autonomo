import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  activeSupportRecoveryGrants,
  isSupportRecoveryDurationMinutes,
  isSupportRecoveryToolId,
  normalizeSupportRecoveryGrant,
  type SupportRecoveryGrantRow,
} from "@/lib/admin/recovery-tools";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ userId: string }> };

interface RecoveryToolsBody {
  action?: "grant" | "revoke";
  toolId?: unknown;
  durationMinutes?: unknown;
  reason?: unknown;
}

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;
const HISTORY_LIMIT = 40;

function cleanReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const reason = value.trim().replace(/\s+/g, " ").slice(0, 500);
  return reason.length >= 3 ? reason : null;
}

async function requireAdmin(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return access;
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_user_recovery_tools",
      limit: 80,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return {
      ok: false as const,
      response: rateLimitExceededResponse(rateLimit),
    };
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Servidor admin no disponible" },
        { status: 503, headers: NO_STORE_HEADERS },
      ),
    };
  }
  return { ok: true as const, requester: access.user, admin };
}

async function targetExists(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  return !error && Boolean(data.user);
}

async function readGrants(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
) {
  const { data, error } = await admin
    .from("admin_user_recovery_grants")
    .select(
      "id,user_id,tool_id,granted_by,granted_at,expires_at,reason,revoked_at,revoked_by,revocation_reason",
    )
    .eq("user_id", userId)
    .order("granted_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) return { error: error.message, grants: [] };
  const grants = ((data ?? []) as SupportRecoveryGrantRow[])
    .map(normalizeSupportRecoveryGrant)
    .filter((grant) => grant !== null);
  return { grants };
}

export async function GET(request: Request, { params }: RouteParams) {
  const access = await requireAdmin(request);
  if (!access.ok) return access.response;
  const { userId } = await params;
  if (!(await targetExists(access.admin, userId))) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }
  const result = await readGrants(access.admin, userId);
  if (result.error) {
    return NextResponse.json(
      { error: "No se pudo cargar el historial de soporte" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
  return NextResponse.json(
    {
      grants: result.grants,
      activeGrants: activeSupportRecoveryGrants(result.grants),
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const access = await requireAdmin(request);
  if (!access.ok) return access.response;
  const { userId } = await params;
  if (!(await targetExists(access.admin, userId))) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const body = await readJsonBody<RecoveryToolsBody>(request, {
    maxBytes: 4_096,
    invalidMessage: "La solicitud de soporte no es válida.",
    tooLargeMessage: "La solicitud de soporte es demasiado grande.",
  });
  if (!body.ok) return body.response;
  const payload = body.data && typeof body.data === "object" ? body.data : {};
  const { action, toolId } = payload;
  const reason = cleanReason(payload.reason);
  if (!isSupportRecoveryToolId(toolId) || !reason) {
    return NextResponse.json(
      { error: "Herramienta o motivo no válidos" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const now = new Date();
  if (action === "grant") {
    const durationMinutes = payload.durationMinutes;
    if (!isSupportRecoveryDurationMinutes(durationMinutes)) {
      return NextResponse.json(
        { error: "Duración no válida" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    const expiresAt = new Date(
      now.getTime() + durationMinutes * 60_000,
    ).toISOString();
    const { data, error } = await access.admin
      .from("admin_user_recovery_grants")
      .insert({
        user_id: userId,
        tool_id: toolId,
        granted_by: access.requester.id,
        granted_at: now.toISOString(),
        expires_at: expiresAt,
        reason,
      })
      .select(
        "id,user_id,tool_id,granted_by,granted_at,expires_at,reason,revoked_at,revoked_by,revocation_reason",
      )
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "No se pudo activar la herramienta" },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    const grant = normalizeSupportRecoveryGrant(
      data as SupportRecoveryGrantRow,
    );
    if (!grant) {
      return NextResponse.json(
        { error: "La concesión guardada no es válida" },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    await access.admin
      .from("admin_user_recovery_grants")
      .update({
        revoked_at: now.toISOString(),
        revoked_by: access.requester.id,
        revocation_reason: "Sustituida por una nueva concesión",
      })
      .eq("user_id", userId)
      .eq("tool_id", toolId)
      .is("revoked_at", null)
      .neq("id", grant.id);
    return NextResponse.json(
      { ok: true, grant },
      { headers: NO_STORE_HEADERS },
    );
  }

  if (action === "revoke") {
    const { error } = await access.admin
      .from("admin_user_recovery_grants")
      .update({
        revoked_at: now.toISOString(),
        revoked_by: access.requester.id,
        revocation_reason: reason,
      })
      .eq("user_id", userId)
      .eq("tool_id", toolId)
      .is("revoked_at", null);
    if (error) {
      return NextResponse.json(
        { error: "No se pudo revocar la herramienta" },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    return NextResponse.json(
      { ok: true, revokedToolId: toolId },
      { headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    { error: "Acción no válida" },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}
