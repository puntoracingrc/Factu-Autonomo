import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isBillingEnforced } from "./config";
import { currentMonthKey } from "./usage";
import {
  buildScanQuota,
  FREE_EXPENSE_SCAN_TRIAL,
  scanBlockedMessage,
  type ScanQuota,
} from "./scan-limits";
import { resolveEffectivePlan, type UserSubscription } from "./subscription";
import type { PlanId } from "./plans";

function mapSubscription(row: Record<string, unknown>): UserSubscription & {
  scanTrialRemaining: number;
} {
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
  };
}

async function fetchSubscriptionAdmin(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapSubscription(data as Record<string, unknown>);
}

async function getMonthlyScanUsage(userId: string, monthKey: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;

  const { data } = await admin
    .from("user_usage")
    .select("expense_scans_created")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  return (data?.expense_scans_created as number | undefined) ?? 0;
}

export async function getExpenseScanQuota(userId: string): Promise<ScanQuota> {
  const monthKey = currentMonthKey();
  if (!isBillingEnforced()) {
    return buildScanQuota("pro", 0, FREE_EXPENSE_SCAN_TRIAL, monthKey);
  }

  const sub = await fetchSubscriptionAdmin(userId);
  const plan = resolveEffectivePlan(sub);
  const monthlyUsed = await getMonthlyScanUsage(userId, monthKey);
  const trialRemaining = sub?.scanTrialRemaining ?? FREE_EXPENSE_SCAN_TRIAL;

  return buildScanQuota(plan, monthlyUsed, trialRemaining, monthKey);
}

export async function consumeExpenseScan(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  quota: ScanQuota;
}> {
  const monthKey = currentMonthKey();
  const quotaBefore = await getExpenseScanQuota(userId);

  if (!isBillingEnforced()) {
    return { allowed: true, quota: quotaBefore };
  }

  if (quotaBefore.remaining <= 0) {
    return {
      allowed: false,
      reason: scanBlockedMessage(quotaBefore.plan),
      quota: quotaBefore,
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      allowed: false,
      reason: "No se pudo registrar el escaneo. Inténtalo más tarde.",
      quota: quotaBefore,
    };
  }

  const sub = await fetchSubscriptionAdmin(userId);
  const plan = resolveEffectivePlan(sub);

  if (plan === "pro" || plan === "trial") {
    const used = await getMonthlyScanUsage(userId, monthKey);
    const { data: existing } = await admin
      .from("user_usage")
      .select("documents_created")
      .eq("user_id", userId)
      .eq("month_key", monthKey)
      .maybeSingle();

    const payload = {
      user_id: userId,
      month_key: monthKey,
      documents_created: (existing?.documents_created as number | undefined) ?? 0,
      expense_scans_created: used + 1,
    };

    const { error } = await admin
      .from("user_usage")
      .upsert(payload, { onConflict: "user_id,month_key" });
    if (error) {
      return {
        allowed: false,
        reason: "No se pudo registrar el escaneo.",
        quota: quotaBefore,
      };
    }
  } else {
    const current = sub?.scanTrialRemaining ?? FREE_EXPENSE_SCAN_TRIAL;
    if (current <= 0) {
      return {
        allowed: false,
        reason: scanBlockedMessage("free"),
        quota: quotaBefore,
      };
    }
    if (!sub) {
      return {
        allowed: false,
        reason: "Crea una cuenta en Ajustes para usar el escáner.",
        quota: quotaBefore,
      };
    }
    const { error } = await admin
      .from("user_subscriptions")
      .update({ scan_trial_remaining: current - 1 })
      .eq("user_id", userId);
    if (error) {
      return {
        allowed: false,
        reason: "No se pudo registrar el escaneo.",
        quota: quotaBefore,
      };
    }
  }

  const quota = await getExpenseScanQuota(userId);
  return { allowed: true, quota };
}
