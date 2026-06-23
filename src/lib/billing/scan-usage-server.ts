import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isBillingEnforced } from "./config";
import { currentMonthKey } from "./usage";
import {
  AI_UNITS_PER_SCAN,
  CUSTOMER_AI_AUTOFILL_UNITS,
  buildScanQuota,
  FREE_EXPENSE_SCAN_TRIAL,
  PRO_EXPENSE_SCANS_PER_MONTH,
  scanBlockedMessage,
  type ScanQuota,
} from "./scan-limits";
import { resolveEffectivePlan, type UserSubscription } from "./subscription";
import type { PlanId } from "./plans";

function mapSubscription(row: Record<string, unknown>): UserSubscription & {
  scanTrialRemaining: number;
  scanCredits: number;
  aiCreditUnits: number;
} {
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

interface MonthlyAiUsage {
  documentsCreated: number;
  expenseScansCreated: number;
  customerAiAutofillsCreated: number;
}

async function getMonthlyAiUsage(
  userId: string,
  monthKey: string,
): Promise<MonthlyAiUsage> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      documentsCreated: 0,
      expenseScansCreated: 0,
      customerAiAutofillsCreated: 0,
    };
  }

  const { data, error } = await admin
    .from("user_usage")
    .select("documents_created, expense_scans_created, customer_ai_autofills_created")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (error) {
    const { data: legacyData } = await admin
      .from("user_usage")
      .select("documents_created, expense_scans_created")
      .eq("user_id", userId)
      .eq("month_key", monthKey)
      .maybeSingle();

    return {
      documentsCreated:
        (legacyData?.documents_created as number | undefined) ?? 0,
      expenseScansCreated:
        (legacyData?.expense_scans_created as number | undefined) ?? 0,
      customerAiAutofillsCreated: 0,
    };
  }

  if (!data) {
    return {
      documentsCreated: 0,
      expenseScansCreated: 0,
      customerAiAutofillsCreated: 0,
    };
  }

  return {
    documentsCreated: (data.documents_created as number | undefined) ?? 0,
    expenseScansCreated:
      (data.expense_scans_created as number | undefined) ?? 0,
    customerAiAutofillsCreated:
      (data.customer_ai_autofills_created as number | undefined) ?? 0,
  };
}

export async function getExpenseScanQuota(userId: string): Promise<ScanQuota> {
  const monthKey = currentMonthKey();
  if (!isBillingEnforced()) {
    return buildScanQuota("pro", 0, FREE_EXPENSE_SCAN_TRIAL, monthKey);
  }

  const sub = await fetchSubscriptionAdmin(userId);
  const plan = resolveEffectivePlan(sub);
  const usage = await getMonthlyAiUsage(userId, monthKey);
  const trialRemaining = sub?.scanTrialRemaining ?? FREE_EXPENSE_SCAN_TRIAL;
  const scanCredits = sub?.scanCredits ?? 0;
  const aiCreditUnits = sub?.aiCreditUnits ?? scanCredits * AI_UNITS_PER_SCAN;

  return buildScanQuota(
    plan,
    usage.expenseScansCreated,
    trialRemaining,
    monthKey,
    scanCredits,
    usage.customerAiAutofillsCreated,
    aiCreditUnits,
  );
}

async function updateAiCreditUnits(
  userId: string,
  units: number,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin
    .from("user_subscriptions")
    .update({
      ai_credit_units: units,
      scan_credits: Math.floor(units / AI_UNITS_PER_SCAN),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (!error) return true;

  const { error: legacyError } = await admin
    .from("user_subscriptions")
    .update({
      scan_credits: Math.floor(units / AI_UNITS_PER_SCAN),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !legacyError;
}

async function consumeAiUnits(
  userId: string,
  costUnits: number,
  increments: {
    expenseScansCreated?: number;
    customerAiAutofillsCreated?: number;
  },
  failureReason = "No se pudo registrar el escaneo.",
): Promise<{
  allowed: boolean;
  reason?: string;
  quota: ScanQuota;
}> {
  const monthKey = currentMonthKey();
  const quotaBefore = await getExpenseScanQuota(userId);

  if (!isBillingEnforced()) {
    return { allowed: true, quota: quotaBefore };
  }

  if (quotaBefore.remainingUnits < costUnits) {
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
    const usage = await getMonthlyAiUsage(userId, monthKey);
    const usedUnits =
      usage.expenseScansCreated * AI_UNITS_PER_SCAN +
      usage.customerAiAutofillsCreated;
    const includedRemainingUnits = Math.max(
      0,
      PRO_EXPENSE_SCANS_PER_MONTH * AI_UNITS_PER_SCAN - usedUnits,
    );
    const aiCreditUnits =
      sub?.aiCreditUnits ?? (sub?.scanCredits ?? 0) * AI_UNITS_PER_SCAN;

    if (includedRemainingUnits + aiCreditUnits < costUnits) {
      return {
        allowed: false,
        reason: scanBlockedMessage(plan),
        quota: quotaBefore,
      };
    }

    const payload = {
      user_id: userId,
      month_key: monthKey,
      documents_created: usage.documentsCreated,
      expense_scans_created:
        usage.expenseScansCreated + (increments.expenseScansCreated ?? 0),
      customer_ai_autofills_created:
        usage.customerAiAutofillsCreated +
        (increments.customerAiAutofillsCreated ?? 0),
    };

    const { error } = await admin
      .from("user_usage")
      .upsert(payload, { onConflict: "user_id,month_key" });
    if (error) {
      let legacySaved = false;
      if ((increments.customerAiAutofillsCreated ?? 0) <= 0) {
        const { error: legacyError } = await admin
          .from("user_usage")
          .upsert(
            {
              user_id: userId,
              month_key: monthKey,
              documents_created: usage.documentsCreated,
              expense_scans_created: payload.expense_scans_created,
            },
            { onConflict: "user_id,month_key" },
          );
        legacySaved = !legacyError;
      }
      if (!legacySaved) {
        return {
          allowed: false,
          reason: failureReason,
          quota: quotaBefore,
        };
      }
    }

    const unitsFromCredit = Math.max(0, costUnits - includedRemainingUnits);
    if (unitsFromCredit > 0) {
      const updated = await updateAiCreditUnits(
        userId,
        aiCreditUnits - unitsFromCredit,
      );
      if (!updated) {
        return {
          allowed: false,
          reason: failureReason,
          quota: quotaBefore,
        };
      }
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

export async function consumeExpenseScan(userId: string) {
  return consumeAiUnits(userId, AI_UNITS_PER_SCAN, {
    expenseScansCreated: 1,
  });
}

export async function consumeCustomerAiAutofill(userId: string) {
  return consumeAiUnits(
    userId,
    CUSTOMER_AI_AUTOFILL_UNITS,
    {
      customerAiAutofillsCreated: 1,
    },
    "No se pudo registrar el uso IA. Revisa la migración de saldo IA en Supabase.",
  );
}
