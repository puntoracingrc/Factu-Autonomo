import { isBillingEnforced } from "./config";
import { isProPlan, PLANS, type PlanId } from "./plans";
import { SCAN_PACK_SIZE, formatScanPackPrice } from "./scan-packs";

/** Escaneos/mes en Pro (margen ~95% incluso si se agota el cupo con gpt-4o-mini). */
export const PRO_EXPENSE_SCANS_PER_MONTH = 30;

/** Escaneos de regalo al crear cuenta (plan Gratis). */
export const FREE_EXPENSE_SCAN_TRIAL = 2;

/** Unidad interna: 1 escaneo de documento equivale a 10 usos pequeños de IA. */
export const AI_UNITS_PER_SCAN = 10;

/** Rellenar un cliente desde texto es barato: 10 rellenos equivalen a 1 escaneo. */
export const CUSTOMER_AI_AUTOFILL_UNITS = 1;

export interface ScanQuota {
  plan: PlanId;
  /** Cupo mensual incluido en el plan (Pro). */
  limit: number;
  used: number;
  remaining: number;
  /** Escaneos extra comprados y aún no consumidos. */
  bonusCredits: number;
  /** Saldo interno en unidades IA para usos pequeños como texto. */
  usedUnits: number;
  remainingUnits: number;
  bonusCreditUnits: number;
  unitScale: number;
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
  monthlyTextAutofillsUsed = 0,
  bonusCreditUnits = bonusCredits * AI_UNITS_PER_SCAN,
): ScanQuota {
  if (!isBillingEnforced()) {
    return {
      plan: "pro",
      limit: Number.MAX_SAFE_INTEGER,
      used: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      bonusCredits: 0,
      usedUnits: 0,
      remainingUnits: Number.MAX_SAFE_INTEGER,
      bonusCreditUnits: 0,
      unitScale: AI_UNITS_PER_SCAN,
      period: "month",
      monthKey,
    };
  }

  if (isProPlan(plan)) {
    const limit = PRO_EXPENSE_SCANS_PER_MONTH;
    const usedUnits =
      monthlyUsed * AI_UNITS_PER_SCAN + Math.max(0, monthlyTextAutofillsUsed);
    const includedUnits = limit * AI_UNITS_PER_SCAN;
    const includedRemainingUnits = Math.max(0, includedUnits - usedUnits);
    const extraUnits = Math.max(0, bonusCreditUnits);
    const remainingUnits = Math.max(
      0,
      includedRemainingUnits + extraUnits,
    );
    return {
      plan,
      limit,
      used: Math.floor(usedUnits / AI_UNITS_PER_SCAN),
      remaining: Math.floor(remainingUnits / AI_UNITS_PER_SCAN),
      bonusCredits: Math.floor(extraUnits / AI_UNITS_PER_SCAN),
      usedUnits,
      remainingUnits,
      bonusCreditUnits: extraUnits,
      unitScale: AI_UNITS_PER_SCAN,
      period: "month",
      monthKey,
    };
  }

  const limit = FREE_EXPENSE_SCAN_TRIAL;
  const used = limit - trialRemaining;
  const usedUnits = Math.max(0, used) * AI_UNITS_PER_SCAN;
  const remainingUnits = Math.max(0, trialRemaining) * AI_UNITS_PER_SCAN;
  return {
    plan: "free",
    limit,
    used: Math.max(0, used),
    remaining: Math.max(0, trialRemaining),
    bonusCredits: 0,
    usedUnits,
    remainingUnits,
    bonusCreditUnits: 0,
    unitScale: AI_UNITS_PER_SCAN,
    period: "lifetime",
  };
}

export function scanBlockedMessage(plan: PlanId): string {
  if (isProPlan(plan)) {
    return `Has usado los ${PRO_EXPENSE_SCANS_PER_MONTH} escaneos incluidos este mes. Compra un pack de ${SCAN_PACK_SIZE} escaneos (${formatScanPackPrice()} + IVA) o espera al mes que viene.`;
  }
  return `Has agotado tus ${FREE_EXPENSE_SCAN_TRIAL} escaneos de prueba. Pasa a Pro (${PLANS.pro.priceMonthlyEur} €/mes) para escanear hasta ${PRO_EXPENSE_SCANS_PER_MONTH} facturas al mes.`;
}
