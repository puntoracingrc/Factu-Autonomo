import { isBillingEnforced } from "./config";
import { isProPlan, PLANS, type PlanId } from "./plans";
import { SCAN_PACK_SIZE, formatScanPackPrice } from "./scan-packs";

/** Escaneos/mes en Pro (margen ~99% sobre 5,99 € con gpt-4o-mini). */
export const PRO_EXPENSE_SCANS_PER_MONTH = 15;

/** Escaneos de regalo al crear cuenta (plan Gratis). */
export const FREE_EXPENSE_SCAN_TRIAL = 2;

export interface ScanQuota {
  plan: PlanId;
  /** Cupo mensual incluido en el plan (Pro). */
  limit: number;
  used: number;
  remaining: number;
  /** Escaneos extra comprados y aún no consumidos. */
  bonusCredits: number;
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
  bonusCredits = 0,
): ScanQuota {
  if (!isBillingEnforced()) {
    return {
      plan: "pro",
      limit: Number.MAX_SAFE_INTEGER,
      used: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      bonusCredits: 0,
      period: "month",
      monthKey,
    };
  }

  if (isProPlan(plan)) {
    const limit = PRO_EXPENSE_SCANS_PER_MONTH;
    const used = monthlyUsed;
    const monthlyRemaining = Math.max(0, limit - used);
    return {
      plan,
      limit,
      used,
      remaining: monthlyRemaining + Math.max(0, bonusCredits),
      bonusCredits: Math.max(0, bonusCredits),
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
    bonusCredits: 0,
    period: "lifetime",
  };
}

export function scanBlockedMessage(plan: PlanId): string {
  if (isProPlan(plan)) {
    return `Has usado los ${PRO_EXPENSE_SCANS_PER_MONTH} escaneos incluidos este mes. Compra un pack de ${SCAN_PACK_SIZE} escaneos (${formatScanPackPrice()} + IVA) o espera al mes que viene.`;
  }
  return `Has agotado tus ${FREE_EXPENSE_SCAN_TRIAL} escaneos de prueba. Pasa a Pro (${PLANS.pro.priceMonthlyEur} €/mes) para escanear hasta ${PRO_EXPENSE_SCANS_PER_MONTH} facturas al mes.`;
}

