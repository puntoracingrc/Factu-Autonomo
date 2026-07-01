import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import type { User } from "@supabase/supabase-js";
import {
  ageDaysFromIso,
  emptySubscription,
  providerLabel,
  type AdminBanSnapshot,
  type AdminErrorSnapshot,
  type AdminPaymentSnapshot,
  type AdminSubscriptionSnapshot,
  type AdminUserRow,
} from "@/lib/admin/users";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import type { PlanId } from "@/lib/billing/plans";
import type { SubscriptionStatus } from "@/lib/billing/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function subscriptionFromRow(
  row: Record<string, unknown> | undefined,
  userId: string,
): AdminSubscriptionSnapshot {
  if (!row) return emptySubscription(userId);
  return {
    plan: (row.plan as PlanId) ?? "free",
    status: (row.status as SubscriptionStatus) ?? "inactive",
    trialEndsAt: (row.trial_ends_at as string | null) ?? null,
    currentPeriodEnd: (row.current_period_end as string | null) ?? null,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    scanTrialRemaining:
      typeof row.scan_trial_remaining === "number" ? row.scan_trial_remaining : 0,
    scanCredits: typeof row.scan_credits === "number" ? row.scan_credits : 0,
    aiCreditUnits:
      typeof row.ai_credit_units === "number" ? row.ai_credit_units : 0,
    createdAt: (row.created_at as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

function paymentFromRows(rows: Array<Record<string, unknown>>): AdminPaymentSnapshot {
  return rows.reduce<AdminPaymentSnapshot>(
    (acc, row) => ({
      count: acc.count + 1,
      totalCents:
        acc.totalCents +
        (typeof row.amount_cents === "number" ? row.amount_cents : 0),
      latestPaidAt: acc.latestPaidAt ?? ((row.created_at as string | null) ?? null),
      latestDescription:
        acc.latestDescription ?? ((row.description as string | null) ?? null),
    }),
    {
      count: 0,
      totalCents: 0,
      latestPaidAt: null,
      latestDescription: null,
    },
  );
}

function banFromRow(
  user: Pick<User, "app_metadata">,
  row: Record<string, unknown> | undefined,
): AdminBanSnapshot {
  const bannedAt = (row?.banned_at as string | null | undefined) ?? null;
  const metadataBanned = user.app_metadata?.admin_banned === true;
  return {
    banned: Boolean(bannedAt) || metadataBanned,
    bannedAt,
    reason:
      (row?.ban_reason as string | null | undefined) ??
      (typeof user.app_metadata?.admin_ban_reason === "string"
        ? user.app_metadata.admin_ban_reason
        : null),
  };
}

function errorsFromRows(rows: Array<Record<string, unknown>>): AdminErrorSnapshot {
  return rows.reduce<AdminErrorSnapshot>(
    (acc, row) => ({
      count: acc.count + 1,
      latestAt: acc.latestAt ?? ((row.created_at as string | null) ?? null),
      latestArea: acc.latestArea ?? ((row.area as string | null) ?? null),
      latestMessage: acc.latestMessage ?? ((row.message as string | null) ?? null),
    }),
    {
      count: 0,
      latestAt: null,
      latestArea: null,
      latestMessage: null,
    },
  );
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(10, Number(searchParams.get("perPage") ?? 50)));

  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    page,
    perPage,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const users = authData.users;
  const userIds = users.map((user) => user.id);

  const [
    { data: subscriptionRows },
    { data: paymentRows },
    { data: controlRows },
    { data: errorRows },
  ] =
    await Promise.all([
      userIds.length
        ? admin.from("user_subscriptions").select("*").in("user_id", userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? admin
            .from("payment_receipts")
            .select("user_id,amount_cents,description,created_at")
            .in("user_id", userIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      userIds.length
        ? admin
            .from("admin_user_controls")
            .select("user_id,banned_at,ban_reason")
            .in("user_id", userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? admin
            .from("app_error_events")
            .select("user_id,area,message,created_at")
            .in("user_id", userIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  const subscriptionsByUser = new Map(
    (subscriptionRows ?? []).map((row) => [
      String((row as Record<string, unknown>).user_id),
      row as Record<string, unknown>,
    ]),
  );
  const controlsByUser = new Map(
    (controlRows ?? []).map((row) => [
      String((row as Record<string, unknown>).user_id),
      row as Record<string, unknown>,
    ]),
  );
  const paymentsByUser = new Map<string, Array<Record<string, unknown>>>();
  for (const row of paymentRows ?? []) {
    const userId = String((row as Record<string, unknown>).user_id);
    paymentsByUser.set(userId, [
      ...(paymentsByUser.get(userId) ?? []),
      row as Record<string, unknown>,
    ]);
  }
  const errorsByUser = new Map<string, Array<Record<string, unknown>>>();
  for (const row of errorRows ?? []) {
    const userId = String((row as Record<string, unknown>).user_id);
    errorsByUser.set(userId, [
      ...(errorsByUser.get(userId) ?? []),
      row as Record<string, unknown>,
    ]);
  }

  const now = new Date();
  const rows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    email: user.email ?? "Sin email",
    provider: providerLabel(user),
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    ageDays: ageDaysFromIso(user.created_at ?? null, now),
    subscription: subscriptionFromRow(subscriptionsByUser.get(user.id), user.id),
    payments: paymentFromRows(paymentsByUser.get(user.id) ?? []),
    ban: banFromRow(user, controlsByUser.get(user.id)),
    errors: errorsFromRows(errorsByUser.get(user.id) ?? []),
  }));

  return NextResponse.json({
    users: rows,
    page,
    perPage,
    total: authData.total ?? rows.length,
  });
}
