import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  appDataFromSyncRows,
  buildRestoreChanges,
  normalizeRestorePointData,
  normalizeRestorePointSummary,
  summarizeRestoreData,
  summarizeRestoreDiff,
  type AdminSyncEntityRow,
} from "@/lib/admin/user-restore";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SyncChange } from "@/lib/types";

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
  confirmEmail?: unknown;
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

  for (let page = 0; ; page += 1) {
    const from = page * SYNC_PAGE_SIZE;
    const to = from + SYNC_PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("sync_entities")
      .select("entity_type,entity_id,payload,deleted,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: true })
      .range(from, to);

    if (error) return { rows, error: error.message };

    const pageRows = (data ?? []) as AdminSyncEntityRow[];
    rows.push(...pageRows);
    if (pageRows.length < SYNC_PAGE_SIZE) break;
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

async function upsertRestoreChanges(
  admin: AdminClient,
  userId: string,
  changes: SyncChange[],
) {
  for (let index = 0; index < changes.length; index += SYNC_PAGE_SIZE) {
    const chunk = changes.slice(index, index + SYNC_PAGE_SIZE);
    const { error } = await admin.from("sync_entities").upsert(
      chunk.map((change) => ({
        user_id: userId,
        entity_type: change.entityType,
        entity_id: change.entityId,
        payload: change.deleted ? null : (change.payload ?? null),
        deleted: change.deleted,
        updated_at: change.updatedAt,
      })),
      { onConflict: "user_id,entity_type,entity_id" },
    );

    if (error) return error.message;
  }

  return null;
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
    current: current.summary,
    restorePoints: restorePoints.restorePoints,
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const body = (await request.json().catch(() => ({}))) as RestorePointBody;

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
    return NextResponse.json({ ok: true, restorePoint: created.restorePoint });
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

  const diffSummary = summarizeRestoreDiff(current.data, restorePoint.data);

  if (body.action === "preview") {
    return NextResponse.json({
      ok: true,
      restorePoint: restorePoint.restorePoint,
      current: current.summary,
      diff: diffSummary,
    });
  }

  if (body.action === "restore") {
    const confirmedEmail =
      typeof body.confirmEmail === "string"
        ? body.confirmEmail.trim().toLowerCase()
        : "";
    const expectedEmail = target.email?.trim().toLowerCase() ?? "";
    if (!expectedEmail || confirmedEmail !== expectedEmail) {
      return NextResponse.json(
        { error: "Escribe el email exacto del usuario para restaurar." },
        { status: 400 },
      );
    }

    const safety = await createRestorePoint(auth.admin, {
      userId,
      requesterId: auth.requester.id,
      label: `Copia de seguridad antes de restaurar ${new Date().toLocaleString(
        "es-ES",
      )}`,
      reason: `Creada automáticamente antes de restaurar ${restorePoint.restorePoint.label}`,
      source: "pre_restore_safety",
    });
    if ("error" in safety) {
      return NextResponse.json({ error: safety.error }, { status: 500 });
    }

    const restoredAt = new Date().toISOString();
    const changes = buildRestoreChanges(current.data, restorePoint.data, restoredAt);
    const upsertError = await upsertRestoreChanges(auth.admin, userId, changes);
    if (upsertError) {
      return NextResponse.json({ error: upsertError }, { status: 500 });
    }

    const { error: eventError } = await auth.admin
      .from("admin_user_restore_events")
      .insert({
        user_id: userId,
        restore_point_id: restorePoint.restorePoint.id,
        safety_restore_point_id: safety.restorePoint.id,
        restored_by: auth.requester.id,
        diff_summary: diffSummary,
        note: cleanOptionalText(body.reason, 500),
      });

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      restoredAt,
      changes: changes.length,
      diff: diffSummary,
      safetyRestorePoint: safety.restorePoint,
      restorePoint: restorePoint.restorePoint,
    });
  }

  return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
}
