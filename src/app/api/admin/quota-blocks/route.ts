import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import type { AdminQuotaBlocksResponse } from "@/lib/admin/quota-blocks";
import {
  BILLING_QUOTA_METRICS,
  type BillingQuotaMetric,
} from "@/lib/billing/quotas";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Vary: "Authorization",
} as const;

interface QuotaBlockRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  metric: BillingQuotaMetric;
  plan: "free" | "pro" | "pro_plus" | "trial";
  period_key: string;
  current_usage: number;
  included_limit: number | null;
  effective_limit: number | null;
  credit_balance: number;
  capacity_bonus: number;
  reset_at: string | null;
  source: "app" | "reconcile" | "automatic_customer" | "automatic_supplier";
  created_at: string;
}

function privateJson(
  body: AdminQuotaBlocksResponse | { error: string },
  init?: ResponseInit,
) {
  const response = NextResponse.json(body, init);
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function missingQuotaTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /billing_quota_block_events/i.test(error.message ?? "")
  );
}

export async function GET(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) {
    for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
      access.response.headers.set(key, value);
    }
    return access.response;
  }
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "admin_quota_blocks", limit: 120, windowMs: 10 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    const response = rateLimitExceededResponse(rateLimit);
    for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return privateJson({ error: "Servidor admin no disponible" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const requestedDays = Number(searchParams.get("days") ?? 7);
  const rangeDays = [1, 7, 30, 90].includes(requestedDays)
    ? requestedDays
    : 7;
  const requestedLimit = Number(searchParams.get("limit") ?? 100);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(250, Math.max(25, requestedLimit))
      : 100;
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
  const { data, error, count } = await admin
    .from("billing_quota_block_events")
    .select(
      "id,user_id,metric,plan,period_key,current_usage,included_limit,effective_limit,credit_balance,capacity_bonus,reset_at,source,created_at",
      { count: "exact" },
    )
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (missingQuotaTable(error)) {
      return privateJson({
        monitoringAvailable: false,
        rangeDays,
        total: 0,
        uniqueAccounts: 0,
        byMetric: {},
        events: [],
        message: "El registro central de límites todavía no está activado.",
      });
    }
    return privateJson(
      { error: "No se pudieron cargar los bloqueos de límites" },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as QuotaBlockRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const accountKeys = new Map(
    userIds.map((userId, index) => [userId, `account-${index + 1}`]),
  );
  const emails = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const { data: userData, error: userError } =
          await admin.auth.admin.getUserById(userId);
        emails.set(userId, userError ? null : (userData.user?.email ?? null));
      } catch {
        emails.set(userId, null);
      }
    }),
  );

  const byMetric: Partial<Record<BillingQuotaMetric, number>> = {};
  for (const row of rows) {
    if (BILLING_QUOTA_METRICS.includes(row.metric)) {
      byMetric[row.metric] = (byMetric[row.metric] ?? 0) + 1;
    }
  }

  return privateJson({
    monitoringAvailable: true,
    rangeDays,
    total: count ?? rows.length,
    uniqueAccounts: userIds.length,
    byMetric,
    events: rows.map((row) => ({
      id: row.id,
      metric: row.metric,
      plan: row.plan,
      periodKey: row.period_key,
      currentUsage: row.current_usage,
      includedLimit: row.included_limit,
      effectiveLimit: row.effective_limit,
      creditBalance: row.credit_balance,
      capacityBonus: row.capacity_bonus,
      resetAt: row.reset_at,
      source: row.source,
      createdAt: row.created_at,
      account: {
        key: accountKeys.get(row.user_id) ?? "account-unavailable",
        email: emails.get(row.user_id) ?? null,
      },
    })),
  });
}
