import { isBillingEnforced } from "./config";
import { isProPlan, PLANS, type PlanId } from "./plans";

/** Escaneos/mes en Pro (margen ~99% sobre 5,99 € con gpt-4o-mini). */
export const PRO_EXPENSE_SCANS_PER_MONTH = 15;

/** Escaneos de regalo al crear cuenta (plan Gratis). */
export const FREE_EXPENSE_SCAN_TRIAL = 2;

export interface ScanQuota {
  plan: PlanId;
  limit: number;
  used: number;
  remaining: number;
  period: "month" | "lifetime";
  monthKey?: string;
}

export function monthlyScanLimit(plan: PlanId): number {
  if (!isBillingEnforced()) return Number.MAX_SAFE_INTEGER;
  return isProPlan(plan) ? PRO_EXPENSE_SCANS_PER_MONTH : 0;
}

export function buildScanQuota(
  plan: PlanId,
  monthlyUsed: number,
  trialRemaining: number,
  monthKey: string,
): ScanQuota {
  if (!isBillingEnforced()) {
    return {
      plan: "pro",
      limit: Number.MAX_SAFE_INTEGER,
      used: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      period: "month",
      monthKey,
    };
  }

  if (isProPlan(plan)) {
    const limit = PRO_EXPENSE_SCANS_PER_MONTH;
    const used = monthlyUsed;
    return {
      plan,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      period: "month",
      monthKey,
    };
  }

  const limit = FREE_EXPENSE_SCAN_TRIAL;
  const used = limit - trialRemaining;
  return {
    plan: "free",
    limit,
    used: Math.max(0, used),
    remaining: Math.max(0, trialRemaining),
    period: "lifetime",
  };
}

export function scanBlockedMessage(plan: PlanId): string {
  if (isProPlan(plan)) {
    return `Has usado los ${PRO_EXPENSE_SCANS_PER_MONTH} escaneos de este mes. Vuelve el mes que viene o contacta si necesitas más.`;
  }
  return `Has agotado tus ${FREE_EXPENSE_SCAN_TRIAL} escaneos de prueba. Pasa a Pro (${PLANS.pro.priceMonthlyEur} €/mes) para escanear hasta ${PRO_EXPENSE_SCANS_PER_MONTH} facturas al mes.`;
}
