import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  ADMIN_RESTORE_ENTITY_TYPES,
  appDataFromSyncRows,
  normalizeRestorePointData,
  normalizeRestorePointSummary,
  summarizeRestoreData,
  summarizeRestoreDiffFromRows,
  type AdminSyncEntityRow,
} from "@/lib/admin/user-restore";
import {
  ADMIN_USER_RESTORE_APPLY_BLOCK_CODE,
  ADMIN_USER_RESTORE_APPLY_BLOCK_REASON,
  ADMIN_USER_RESTORE_POINT_MODE,
} from "@/lib/admin/user-restore-policy";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;
type AdminRequester = User;
type AdminAuthResult =
  | { ok: true; requester: AdminRequester; admin: AdminClient }
  | { ok: false; response: NextResponse };

interface RestorePointBody {
  action?: "create" | "preview" | "restore";
  restorePointId?: unknown;
  label?: unknown;
  reason?: unknown;
}

const SYNC_PAGE_SIZE = 500;
const RESTORE_POINT_LIMIT = 20;

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function cleanOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : null;
}

function cleanId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return access;
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_user_restore",
      limit: 60,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return { ok: false, response: rateLimitExceededResponse(rateLimit) };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Servidor admin no disponible" },
        { status: 503 },
      ),
    };
  }

  return { ok: true, requester: access.user, admin };
}

function restoreApplyBlockedResponse() {
  return NextResponse.json(
    {
      ok: false,
      blocked: true,
      mode: ADMIN_USER_RESTORE_POINT_MODE,
      code: ADMIN_USER_RESTORE_APPLY_BLOCK_CODE,
      error: ADMIN_USER_RESTORE_APPLY_BLOCK_REASON,
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

async function fetchTargetEmail(admin: AdminClient, userId: string) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return { error: error?.message ?? "Usuario no encontrado" };
  }
  return { email: data.user.email ?? null };
}

async function fetchSyncRows(
  admin: AdminClient,
  userId: string,
): Promise<{ rows: AdminSyncEntityRow[]; error?: string }> {
  const rows: AdminSyncEntityRow[] = [];

  for (const entityType of ADMIN_RESTORE_ENTITY_TYPES) {
    let afterEntityId: string | null = null;

    for (;;) {
      let query = admin
        .from("sync_entities")
        .select("entity_type,entity_id,payload,deleted,updated_at")
        .eq("user_id", userId)
        .eq("entity_type", entityType)
        .order("entity_id", { ascending: true });
      if (afterEntityId) {
        query = query.gt("entity_id", afterEntityId);
      }

      const { data, error } = await query.limit(SYNC_PAGE_SIZE);
      if (error) return { rows, error: error.message };

      const pageRows = (data ?? []) as AdminSyncEntityRow[];
      rows.push(...pageRows);
      if (pageRows.length < SYNC_PAGE_SIZE) break;

      const nextCursor = pageRows.at(-1)?.entity_id;
      if (!nextCursor || (afterEntityId && nextCursor <= afterEntityId)) {
        return {
          rows,
          error: "No se pudo paginar la copia de forma estable.",
        };
      }
      afterEntityId = nextCursor;
    }
  }

  return { rows };
}

async function fetchCurrentUserData(admin: AdminClient, userId: string) {
  const { rows, error } = await fetchSyncRows(admin, userId);
  if (error) return { error };

  const data = appDataFromSyncRows(rows);
  return {
    rows,
    data,
    summary: summarizeRestoreData(data, rows),
  };
}

async function fetchRestorePoints(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("admin_user_restore_points")
    .select("id,user_id,created_at,created_by,label,reason,source,summary")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(RESTORE_POINT_LIMIT);

  if (error) return { error: error.message };
  return {
    restorePoints: (data ?? []).map((row) =>
      normalizeRestorePointSummary(row as Record<string, unknown>),
    ),
  };
}

async function fetchRestorePointData(
  admin: AdminClient,
  userId: string,
  restorePointId: string,
) {
  const { data, error } = await admin
    .from("admin_user_restore_points")
    .select("id,user_id,created_at,created_by,label,reason,source,summary,data")
    .eq("user_id", userId)
    .eq("id", restorePointId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Copia no encontrada" };

  return {
    restorePoint: normalizeRestorePointSummary(
      data as Record<string, unknown>,
    ),
    data: normalizeRestorePointData((data as Record<string, unknown>).data),
  };
}

async function createRestorePoint(
  admin: AdminClient,
  input: {
    userId: string;
    requesterId: string;
    label: string;
    reason: string | null;
    source: "admin_manual" | "pre_restore_safety";
  },
) {
  const current = await fetchCurrentUserData(admin, input.userId);
  if ("error" in current) return { error: current.error };

  const { data, error } = await admin
    .from("admin_user_restore_points")
    .insert({
      user_id: input.userId,
      created_by: input.requesterId,
      label: input.label,
      reason: input.reason,
      source: input.source,
      data: current.data,
      summary: current.summary,
    })
    .select("id,user_id,created_at,created_by,label,reason,source,summary")
    .single();

  if (error) return { error: error.message };

  return {
    restorePoint: normalizeRestorePointSummary(
      data as Record<string, unknown>,
    ),
    snapshotData: current.data,
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const target = await fetchTargetEmail(auth.admin, userId);
  if ("error" in target) {
    return NextResponse.json({ error: target.error }, { status: 404 });
  }

  const current = await fetchCurrentUserData(auth.admin, userId);
  if ("error" in current) {
    return NextResponse.json({ error: current.error }, { status: 500 });
  }

  const restorePoints = await fetchRestorePoints(auth.admin, userId);
  if ("error" in restorePoints) {
    return NextResponse.json({ error: restorePoints.error }, { status: 500 });
  }

  return NextResponse.json({
    userId,
    email: target.email,
    mode: ADMIN_USER_RESTORE_POINT_MODE,
    current: current.summary,
    restorePoints: restorePoints.restorePoints,
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const bodyResult = await readJsonBody<RestorePointBody>(request, {
    maxBytes: 16 * 1024,
    invalidMessage: "Acción de restauración no válida.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  if (body.action === "restore") {
    return restoreApplyBlockedResponse();
  }

  const target = await fetchTargetEmail(auth.admin, userId);
  if ("error" in target) {
    return NextResponse.json({ error: target.error }, { status: 404 });
  }

  if (body.action === "create") {
    const created = await createRestorePoint(auth.admin, {
      userId,
      requesterId: auth.requester.id,
      label: cleanText(body.label, "Copia manual admin", 120),
      reason: cleanOptionalText(body.reason, 500),
      source: "admin_manual",
    });
    if ("error" in created) {
      return NextResponse.json({ error: created.error }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      mode: ADMIN_USER_RESTORE_POINT_MODE,
      restorePoint: created.restorePoint,
    });
  }

  const restorePointId = cleanId(body.restorePointId);
  if (!restorePointId) {
    return NextResponse.json(
      { error: "Falta la copia de restauración" },
      { status: 400 },
    );
  }

  const restorePoint = await fetchRestorePointData(
    auth.admin,
    userId,
    restorePointId,
  );
  if ("error" in restorePoint) {
    return NextResponse.json({ error: restorePoint.error }, { status: 404 });
  }

  const current = await fetchCurrentUserData(auth.admin, userId);
  if ("error" in current) {
    return NextResponse.json({ error: current.error }, { status: 500 });
  }

  const diffSummary = summarizeRestoreDiffFromRows(
    current.rows,
    restorePoint.data,
  );

  if (body.action === "preview") {
    return NextResponse.json({
      ok: true,
      mode: ADMIN_USER_RESTORE_POINT_MODE,
      restorePoint: restorePoint.restorePoint,
      current: current.summary,
      diff: diffSummary,
    });
  }

  return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
}
