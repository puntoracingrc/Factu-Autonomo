import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PlanId } from "./plans";
import { AI_UNITS_PER_SCAN, FREE_EXPENSE_SCAN_TRIAL } from "./scan-limits";
import type { UserSubscription } from "./subscription";

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
    promotionalPlan: row.promotional_plan as "pro" | "pro_plus" | null | undefined,
    promotionalPlanEndsAt: row.promotional_plan_ends_at as string | null | undefined,
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

async function retireUnattributedTrial(
  subscription: ServerUserSubscription,
): Promise<ServerUserSubscription> {
  if (
    subscription.plan !== "trial" ||
    subscription.status !== "trialing" ||
    subscription.stripeCustomerId ||
    subscription.stripeSubscriptionId
  ) {
    return subscription;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return subscription;

  const { data: adminControl, error: adminControlError } = await admin
    .from("admin_user_controls")
    .select("user_id")
    .eq("user_id", subscription.userId)
    .maybeSingle();

  // Preserve the entitlement if its administrative provenance cannot be checked.
  if (adminControlError || adminControl) return subscription;

  const { data, error } = await admin
    .from("user_subscriptions")
    .update({
      plan: "free",
      status: "inactive",
      trial_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", subscription.userId)
    .eq("plan", "trial")
    .eq("status", "trialing")
    .select("*")
    .single();

  if (error || !data) {
    return (
      (await fetchUserSubscriptionServer(subscription.userId)) ?? subscription
    );
  }
  return mapSubscriptionRow(data as Record<string, unknown>);
}

export async function ensureFreeSubscriptionServer(
  userId: string,
): Promise<ServerUserSubscription | null> {
  const existing = await fetchUserSubscriptionServer(userId);
  if (existing) return retireUnattributedTrial(existing);

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      plan: "free",
      status: "inactive",
      scan_trial_remaining: FREE_EXPENSE_SCAN_TRIAL,
    })
    .select("*")
    .single();

  if (error || !data) {
    return fetchUserSubscriptionServer(userId);
  }
  return mapSubscriptionRow(data as Record<string, unknown>);
}
