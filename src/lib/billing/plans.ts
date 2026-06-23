/**
 * Precios posicionados por debajo de Quipu (~16 €/mes) y Contasimple ilimitado (~18 €/mes),
 * al ser una app más simple (sin banca ni modelos AEAT automáticos).
 * Ver docs/MARKET_PRICING.md
 */

export type PlanId = "free" | "pro" | "trial";

export interface PlanLimits {
  maxDocumentsPerMonth: number | null;
  maxCustomers: number | null;
  expenseScansPerMonth: number | null;
  cloudSync: boolean;
  databaseImport: boolean;
  aiTextAutofill: boolean;
  quarterlySummary: boolean;
  quarterlyExport: boolean;
  customLogo: boolean;
  prioritySupport: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceMonthlyEur: number | null;
  priceYearlyEur: number | null;
  trialDays: number;
  limits: PlanLimits;
}

export const TRIAL_DAYS = 14;

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Gratis",
    priceMonthlyEur: 0,
    priceYearlyEur: 0,
    trialDays: 0,
    limits: {
      maxDocumentsPerMonth: 10,
      maxCustomers: 15,
      expenseScansPerMonth: 0,
      cloudSync: false,
      databaseImport: false,
      aiTextAutofill: false,
      quarterlySummary: false,
      quarterlyExport: false,
      customLogo: true,
      prioritySupport: false,
    },
  },
  trial: {
    id: "trial",
    name: "Prueba Pro",
    priceMonthlyEur: null,
    priceYearlyEur: null,
    trialDays: TRIAL_DAYS,
    limits: {
      maxDocumentsPerMonth: null,
      maxCustomers: null,
      expenseScansPerMonth: 30,
      cloudSync: true,
      databaseImport: true,
      aiTextAutofill: true,
      quarterlySummary: true,
      quarterlyExport: true,
      customLogo: true,
      prioritySupport: true,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyEur: 5.99,
    priceYearlyEur: 49,
    trialDays: 0,
    limits: {
      maxDocumentsPerMonth: null,
      maxCustomers: null,
      expenseScansPerMonth: 30,
      cloudSync: true,
      databaseImport: true,
      aiTextAutofill: true,
      quarterlySummary: true,
      quarterlyExport: true,
      customLogo: true,
      prioritySupport: true,
    },
  },
};

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLANS[plan].limits;
}

export function isProPlan(plan: PlanId): boolean {
  return plan === "pro" || plan === "trial";
}

export function formatPlanPrice(
  amount: number,
  interval: "month" | "year",
): string {
  const formatted = amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return interval === "month"
    ? `${formatted} €/mes (+ IVA)`
    : `${formatted} €/año (+ IVA)`;
}

export function yearlySavingsPercent(): number {
  const monthly = PLANS.pro.priceMonthlyEur ?? 0;
  const yearly = PLANS.pro.priceYearlyEur ?? 0;
  if (monthly <= 0) return 0;
  const fullYearMonthly = monthly * 12;
  return Math.round(((fullYearMonthly - yearly) / fullYearMonthly) * 100);
}
