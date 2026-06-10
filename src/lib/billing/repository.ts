import { getSupabaseClientAsync } from "../supabase/client";
import type { UserSubscription } from "./subscription";
import type { PlanId } from "./plans";
import { FREE_EXPENSE_SCAN_TRIAL } from "./scan-limits";
import { defaultTrialEndIso } from "./subscription";

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

  const trialEndsAt = defaultTrialEndIso();
  const { data, error } = await supabase
    .from(SUBSCRIPTIONS_TABLE)
    .insert({
      user_id: userId,
      plan: "trial",
      status: "trialing",
      trial_ends_at: trialEndsAt,
      scan_trial_remaining: FREE_EXPENSE_SCAN_TRIAL,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}
