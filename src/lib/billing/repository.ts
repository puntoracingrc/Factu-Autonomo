import { getSupabaseClientAsync } from "../supabase/client";
import type { UserSubscription } from "./subscription";
import type { PlanId } from "./plans";

const SUBSCRIPTIONS_TABLE = "user_subscriptions";

function mapRow(row: Record<string, unknown>): UserSubscription {
  return {
    userId: String(row.user_id),
    plan: (row.plan as PlanId) ?? "free",
    status:
      (row.status as UserSubscription["status"]) ?? "inactive",
    stripeCustomerId: row.stripe_customer_id as string | null | undefined,
    stripeSubscriptionId: row.stripe_subscription_id as string | null | undefined,
    trialEndsAt: row.trial_ends_at as string | null | undefined,
    currentPeriodEnd: row.current_period_end as string | null | undefined,
  };
}

export async function fetchUserSubscription(
  userId: string,
): Promise<UserSubscription | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(SUBSCRIPTIONS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function ensureTrialSubscription(
  userId: string,
): Promise<UserSubscription | null> {
  const existing = await fetchUserSubscription(userId);
  if (existing) return existing;

  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  const response = await fetch("/api/billing/trial", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;

  const body = (await response.json()) as {
    subscription?: UserSubscription | null;
  };
  return body.subscription ?? null;
}
