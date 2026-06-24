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

function firstRpcRow(data: unknown): ConsumeAiUnitsRpcRow | null {
  if (Array.isArray(data)) return (data[0] as ConsumeAiUnitsRpcRow | undefined) ?? null;
  return (data as ConsumeAiUnitsRpcRow | null) ?? null;
}

function reasonForAtomicFailure(
  reason: string | null | undefined,
  fallback: string,
  quota: ScanQuota,
): string {
  if (reason === "missing_subscription") {
    return "Crea una cuenta en Ajustes para usar el escáner.";
  }
  if (reason === "insufficient_units" || reason === "trial_exhausted") {
    return scanBlockedMessage(quota.plan);
  }
  return fallback;
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
      reason: reasonForAtomicFailure(result?.reason, failureReason, quotaBefore),
      quota: quotaBefore,
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
    "No se pudo registrar el uso IA. Revisa la migración de saldo IA en Supabase.",
  );
}
