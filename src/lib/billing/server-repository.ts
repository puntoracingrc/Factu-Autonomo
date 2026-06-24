import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PlanId } from "./plans";
import { AI_UNITS_PER_SCAN, FREE_EXPENSE_SCAN_TRIAL } from "./scan-limits";
import { defaultTrialEndIso, type UserSubscription } from "./subscription";

export interface ServerUserSubscription extends UserSubscription {
  scanTrialRemaining: number;
  scanCredits: number;
  aiCreditUnits: number;
}

export function mapSubscriptionRow(
  row: Record<string, unknown>,
): ServerUserSubscription {
  const scanCredits =
    typeof row.scan_credits === "number" ? row.scan_credits : 0;

  return {
    userId: String(row.user_id),
    plan: (row.plan as PlanId) ?? "free",
    status:
      (row.status as UserSubscription["status"]) ?? "inactive",
    stripeCustomerId: row.stripe_customer_id as string | null | undefined,
    stripeSubscriptionId: row.stripe_subscription_id as string | null | undefined,
    trialEndsAt: row.trial_ends_at as string | null | undefined,
    currentPeriodEnd: row.current_period_end as string | null | undefined,
    scanTrialRemaining:
      typeof row.scan_trial_remaining === "number"
        ? row.scan_trial_remaining
        : FREE_EXPENSE_SCAN_TRIAL,
    scanCredits,
    aiCreditUnits:
      typeof row.ai_credit_units === "number"
        ? row.ai_credit_units
        : scanCredits * AI_UNITS_PER_SCAN,
  };
}

export async function fetchUserSubscriptionServer(
  userId: string,
): Promise<ServerUserSubscription | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapSubscriptionRow(data as Record<string, unknown>);
}

export async function ensureTrialSubscriptionServer(
  userId: string,
): Promise<ServerUserSubscription | null> {
  const existing = await fetchUserSubscriptionServer(userId);
  if (existing) return existing;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      plan: "trial",
      status: "trialing",
      trial_ends_at: defaultTrialEndIso(),
      scan_trial_remaining: FREE_EXPENSE_SCAN_TRIAL,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapSubscriptionRow(data as Record<string, unknown>);
}
