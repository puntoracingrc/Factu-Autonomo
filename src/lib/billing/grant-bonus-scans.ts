import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { addScanCredits } from "./add-scan-credits";
import { isProPlan, type PlanId } from "./plans";
import { FREE_EXPENSE_SCAN_TRIAL } from "./scan-limits";
import { resolveEffectivePlan } from "./subscription";

async function fetchSubscriptionRow(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Record<string, unknown>;
}

export async function ensureUserSubscriptionRow(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const existing = await fetchSubscriptionRow(userId);
  if (existing) return true;

  const { error } = await admin.from("user_subscriptions").insert({
    user_id: userId,
    plan: "free",
    status: "inactive",
    scan_trial_remaining: FREE_EXPENSE_SCAN_TRIAL,
  });

  return !error;
}

function mapPlan(row: Record<string, unknown>): PlanId {
  return (row.plan as PlanId) ?? "free";
}

/** Añade escaneos extra: créditos comprados en Pro/trial, o prueba en Gratis. */
export async function grantBonusScans(
  userId: string,
  amount: number,
): Promise<boolean> {
  if (amount <= 0) return false;
  if (!(await ensureUserSubscriptionRow(userId))) return false;

  const row = await fetchSubscriptionRow(userId);
  if (!row) return false;

  const effectivePlan = resolveEffectivePlan({
    userId,
    plan: mapPlan(row),
    status: (row.status as "active" | "trialing" | "canceled" | "past_due" | "inactive") ?? "inactive",
    trialEndsAt: row.trial_ends_at as string | null | undefined,
    currentPeriodEnd: row.current_period_end as string | null | undefined,
  });

  if (isProPlan(effectivePlan)) {
    return addScanCredits(userId, amount);
  }

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const current =
    typeof row.scan_trial_remaining === "number"
      ? row.scan_trial_remaining
      : FREE_EXPENSE_SCAN_TRIAL;

  const { error } = await admin
    .from("user_subscriptions")
    .update({
      scan_trial_remaining: current + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !error;
}
