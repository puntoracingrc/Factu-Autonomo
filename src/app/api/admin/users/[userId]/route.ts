import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import {
  coerceAdminPlan,
  coerceAdminStatus,
  coerceNonNegativeInteger,
  normalizeAdminDate,
} from "@/lib/admin/users";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

interface AdminUserPatchBody {
  action?: "subscription" | "ban";
  plan?: unknown;
  status?: unknown;
  trialEndsAt?: unknown;
  currentPeriodEnd?: unknown;
  scanTrialRemaining?: unknown;
  scanCredits?: unknown;
  aiCreditUnits?: unknown;
  banned?: unknown;
  banReason?: unknown;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const requester = await getUserFromBearer(request.headers.get("authorization"));
  if (!requester) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminUser(requester)) {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor admin no disponible" },
      { status: 503 },
    );
  }

  const { userId } = await params;
  const body = (await request.json()) as AdminUserPatchBody;

  if (body.action === "subscription") {
    const { error } = await admin.from("user_subscriptions").upsert(
      {
        user_id: userId,
        plan: coerceAdminPlan(body.plan),
        status: coerceAdminStatus(body.status),
        trial_ends_at: normalizeAdminDate(body.trialEndsAt),
        current_period_end: normalizeAdminDate(body.currentPeriodEnd),
        scan_trial_remaining: coerceNonNegativeInteger(body.scanTrialRemaining),
        scan_credits: coerceNonNegativeInteger(body.scanCredits),
        ai_credit_units: coerceNonNegativeInteger(body.aiCreditUnits),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("admin_user_controls").upsert(
      {
        user_id: userId,
        updated_by: requester.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return NextResponse.json({ ok: true });
  }

  if (body.action === "ban") {
    const banned = Boolean(body.banned);
    const reason =
      typeof body.banReason === "string" && body.banReason.trim()
        ? body.banReason.trim()
        : null;

    const { data: target } = await admin.auth.admin.getUserById(userId);
    const appMetadata = target.user?.app_metadata ?? {};
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: banned ? "876000h" : "none",
      app_metadata: {
        ...appMetadata,
        admin_banned: banned,
        admin_ban_reason: banned ? reason : null,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    await admin.from("admin_user_controls").upsert(
      {
        user_id: userId,
        banned_at: banned ? new Date().toISOString() : null,
        ban_reason: banned ? reason : null,
        updated_by: requester.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
}
