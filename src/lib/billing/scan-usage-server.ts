import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isBillingEnforced } from "./config";
import { currentMonthKey } from "./usage";
import {
  AI_UNITS_PER_SCAN,
  CUSTOMER_AI_AUTOFILL_UNITS,
  aiUsageBlockedMessage,
  buildScanQuota,
  FREE_EXPENSE_SCAN_TRIAL,
  PRO_EXPENSE_SCANS_PER_MONTH,
  scanBlockedMessage,
  type ScanQuota,
} from "./scan-limits";
import { fetchUserSubscriptionServer } from "./server-repository";
import { resolveEffectivePlan } from "./subscription";

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

  const sub = await fetchUserSubscriptionServer(userId);
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

interface ConsumeAiUnitsRpcRow {
  allowed?: boolean;
  reason?: string | null;
}

interface ConsumptionRpcError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

interface ConsumeAiUnitsResult {
  allowed: boolean;
  reason?: string;
  quota: ScanQuota;
  blockedByQuota?: boolean;
}

function firstRpcRow(data: unknown): ConsumeAiUnitsRpcRow | null {
  if (Array.isArray(data)) return (data[0] as ConsumeAiUnitsRpcRow | undefined) ?? null;
  return (data as ConsumeAiUnitsRpcRow | null) ?? null;
}

function errorText(error: ConsumptionRpcError): string {
  return [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isMissingUsageColumnError(error: ConsumptionRpcError): boolean {
  const code = error.code ?? "";
  const text = errorText(error);
  return code === "42703" || text.includes("customer_ai_autofills_created");
}

function shouldFallbackToLegacyConsumption(error: ConsumptionRpcError): boolean {
  const code = error.code ?? "";
  const text = errorText(error);

  return (
    code === "PGRST202" ||
    code === "42883" ||
    code === "42703" ||
    (
      text.includes("consume_ai_units") &&
      (text.includes("could not find") ||
        text.includes("schema cache") ||
        text.includes("does not exist"))
    ) ||
    text.includes("customer_ai_autofills_created") ||
    text.includes("ai_credit_units")
  );
}

function reasonForAtomicFailure(
  reason: string | null | undefined,
  fallback: string,
  quota: ScanQuota,
  quotaReason: (plan: ScanQuota["plan"]) => string,
): string {
  if (reason === "missing_subscription") {
    return "Crea una cuenta en Ajustes para usar el escáner.";
  }
  if (reason === "insufficient_units" || reason === "trial_exhausted") {
    return quotaReason(quota.plan);
  }
  return fallback;
}

async function updateAiCreditUnitsLegacy(
  userId: string,
  units: number,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const scanCredits = Math.floor(units / AI_UNITS_PER_SCAN);
  const { error } = await admin
    .from("user_subscriptions")
    .update({
      ai_credit_units: units,
      scan_credits: scanCredits,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (!error) return true;

  const { error: legacyError } = await admin
    .from("user_subscriptions")
    .update({
      scan_credits: scanCredits,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !legacyError;
}

async function consumeAiUnitsLegacy(
  userId: string,
  costUnits: number,
  increments: {
    expenseScansCreated?: number;
    customerAiAutofillsCreated?: number;
  },
  failureReason: string,
  quotaBefore: ScanQuota,
  quotaReason: (plan: ScanQuota["plan"]) => string,
): Promise<ConsumeAiUnitsResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      allowed: false,
      reason: "No se pudo registrar el escaneo. Inténtalo más tarde.",
      quota: quotaBefore,
    };
  }

  const monthKey = currentMonthKey();
  const sub = await fetchUserSubscriptionServer(userId);
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
        reason: quotaReason(plan),
        quota: quotaBefore,
        blockedByQuota: true,
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
      const canSaveWithoutCustomerAiCounter =
        (increments.customerAiAutofillsCreated ?? 0) > 0 &&
        (increments.expenseScansCreated ?? 0) <= 0 &&
        isMissingUsageColumnError(error);

      if (
        (increments.customerAiAutofillsCreated ?? 0) <= 0 ||
        canSaveWithoutCustomerAiCounter
      ) {
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
      const updated = await updateAiCreditUnitsLegacy(
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
    if (!sub) {
      return {
        allowed: false,
        reason: "Crea una cuenta en Ajustes para usar el escáner.",
        quota: quotaBefore,
      };
    }

    const current = sub.scanTrialRemaining ?? FREE_EXPENSE_SCAN_TRIAL;
    if (current <= 0) {
      return {
        allowed: false,
        reason: quotaReason("free"),
        quota: quotaBefore,
        blockedByQuota: true,
      };
    }

    const { error } = await admin
      .from("user_subscriptions")
      .update({
        scan_trial_remaining: current - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      return {
        allowed: false,
        reason: failureReason,
        quota: quotaBefore,
      };
    }
  }

  const quota = await getExpenseScanQuota(userId);
  return { allowed: true, quota };
}

async function consumeAiUnits(
  userId: string,
  costUnits: number,
  increments: {
    expenseScansCreated?: number;
    customerAiAutofillsCreated?: number;
  },
  failureReason = "No se pudo registrar el escaneo.",
  quotaReason: (plan: ScanQuota["plan"]) => string = scanBlockedMessage,
): Promise<ConsumeAiUnitsResult> {
  const monthKey = currentMonthKey();
  const quotaBefore = await getExpenseScanQuota(userId);

  if (!isBillingEnforced()) {
    return { allowed: true, quota: quotaBefore };
  }

  if (quotaBefore.remainingUnits < costUnits) {
    return {
      allowed: false,
      reason: quotaReason(quotaBefore.plan),
      quota: quotaBefore,
      blockedByQuota: true,
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

  const { data, error } = await admin.rpc("consume_ai_units", {
    p_user_id: userId,
    p_month_key: monthKey,
    p_cost_units: costUnits,
    p_expense_scans_increment: increments.expenseScansCreated ?? 0,
    p_customer_ai_autofills_increment:
      increments.customerAiAutofillsCreated ?? 0,
    p_pro_monthly_units:
      PRO_EXPENSE_SCANS_PER_MONTH * AI_UNITS_PER_SCAN,
    p_free_trial_decrement: 1,
  });

  if (error) {
    if (shouldFallbackToLegacyConsumption(error)) {
      return consumeAiUnitsLegacy(
        userId,
        costUnits,
        increments,
        failureReason,
        quotaBefore,
        quotaReason,
      );
    }

    return {
      allowed: false,
      reason: failureReason,
      quota: quotaBefore,
    };
  }

  const result = firstRpcRow(data);
  if (!result?.allowed) {
    return {
      allowed: false,
      reason: reasonForAtomicFailure(
        result?.reason,
        failureReason,
        quotaBefore,
        quotaReason,
      ),
      quota: quotaBefore,
      blockedByQuota:
        result?.reason === "insufficient_units" ||
        result?.reason === "trial_exhausted",
    };
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
    "No hemos podido descontar el uso de IA. Inténtalo de nuevo en unos minutos.",
    aiUsageBlockedMessage,
  );
}
