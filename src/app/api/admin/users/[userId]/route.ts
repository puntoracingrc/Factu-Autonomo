import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  coerceAdminPlan,
  coerceAdminStatus,
  coerceNonNegativeInteger,
  normalizeAdminAiCreditUnits,
  normalizeAdminDate,
} from "@/lib/admin/users";
import { currentMonthKey } from "@/lib/billing/usage";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

interface AdminUserPatchBody {
  action?: "subscription" | "ban" | "reset_ai_usage";
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

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

interface DatabaseErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

type AdminSubscriptionPayload = Record<string, string | number | null>;

const OPTIONAL_SUBSCRIPTION_COLUMNS = [
  "scan_trial_remaining",
  "scan_credits",
  "ai_credit_units",
] as const;

function errorText(error: DatabaseErrorLike): string {
  return [
    error.code,
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function errorMentionsColumn(error: DatabaseErrorLike, column: string): boolean {
  return errorText(error).includes(column.toLowerCase());
}

async function upsertSubscription(
  admin: AdminClient,
  payload: AdminSubscriptionPayload,
): Promise<DatabaseErrorLike | null> {
  const { error } = await admin
    .from("user_subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (!error) return null;

  const retryPayload = { ...payload };
  let shouldRetry = false;

  for (const column of OPTIONAL_SUBSCRIPTION_COLUMNS) {
    if (errorMentionsColumn(error, column)) {
      delete retryPayload[column];
      shouldRetry = true;
    }
  }

  if (!shouldRetry) return error;

  const retry = await admin
    .from("user_subscriptions")
    .upsert(retryPayload, { onConflict: "user_id" });

  return retry.error ?? null;
}

async function touchAdminControls(
  admin: AdminClient,
  userId: string,
  requesterId: string,
  patch: Record<string, string | boolean | null> = {},
) {
  await admin.from("admin_user_controls").upsert(
    {
      user_id: userId,
      ...patch,
      updated_by: requesterId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function resetMonthlyAiUsage(admin: AdminClient, userId: string) {
  const monthKey = currentMonthKey();
  const payload = {
    user_id: userId,
    month_key: monthKey,
    expense_scans_created: 0,
    customer_ai_autofills_created: 0,
  };
  const { error } = await admin
    .from("user_usage")
    .upsert(payload, { onConflict: "user_id,month_key" });

  if (!error) return { monthKey, error: null };

  if (!errorMentionsColumn(error, "customer_ai_autofills_created")) {
    return { monthKey, error };
  }

  const retry = await admin
    .from("user_usage")
    .upsert(
      {
        user_id: userId,
        month_key: monthKey,
        expense_scans_created: 0,
      },
      { onConflict: "user_id,month_key" },
    );

  return { monthKey, error: retry.error ?? null };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return access.response;
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_users_update",
      limit: 60,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

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
    const normalizedAiCreditUnits = normalizeAdminAiCreditUnits(
      body.aiCreditUnits,
      body.scanCredits,
    );
    const error = await upsertSubscription(admin, {
      user_id: userId,
      plan: coerceAdminPlan(body.plan),
      status: coerceAdminStatus(body.status),
      trial_ends_at: normalizeAdminDate(body.trialEndsAt),
      current_period_end: normalizeAdminDate(body.currentPeriodEnd),
      scan_trial_remaining: coerceNonNegativeInteger(body.scanTrialRemaining),
      ai_credit_units: normalizedAiCreditUnits,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await touchAdminControls(admin, userId, access.user.id);

    return NextResponse.json({ ok: true });
  }

  if (body.action === "reset_ai_usage") {
    const { monthKey, error } = await resetMonthlyAiUsage(admin, userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await touchAdminControls(admin, userId, access.user.id);

    return NextResponse.json({ ok: true, monthKey });
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

    await touchAdminControls(admin, userId, access.user.id, {
      banned_at: banned ? new Date().toISOString() : null,
      ban_reason: banned ? reason : null,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
}
