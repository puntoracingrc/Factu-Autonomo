/**
 * Precios posicionados por debajo de Quipu (~16 €/mes) y Contasimple ilimitado (~18 €/mes),
 * al ser una app más simple (sin banca ni modelos AEAT automáticos).
 * Ver docs/MARKET_PRICING.md
 */

export type PlanId = "free" | "pro" | "pro_plus" | "trial";
export type PaidPlanId = "pro" | "pro_plus";

export interface PlanLimits {
  maxDocumentsPerMonth: number | null;
  maxCustomers: number | null;
  maxProducts: number | null;
  expenseScansPerMonth: number | null;
  expenseInbox: boolean;
  expenseLineExtraction: boolean;
  productCreationFromExpenses: boolean;
  productCostAutoUpdate: boolean;
  productLearning: boolean;
  familyMarginRules: boolean;
  cloudSync: boolean;
  databaseImport: boolean;
  aiTextAutofill: boolean;
  quarterlySummary: boolean;
  quarterlyExport: boolean;
  customLogo: boolean;
  documentTemplateDesigner: boolean;
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
      maxProducts: 10,
      expenseScansPerMonth: 0,
      expenseInbox: false,
      expenseLineExtraction: false,
      productCreationFromExpenses: false,
      productCostAutoUpdate: false,
      productLearning: false,
      familyMarginRules: false,
      cloudSync: false,
      databaseImport: false,
      aiTextAutofill: false,
      quarterlySummary: false,
      quarterlyExport: false,
      customLogo: true,
      documentTemplateDesigner: false,
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
      maxProducts: null,
      expenseScansPerMonth: 30,
      expenseInbox: true,
      expenseLineExtraction: false,
      productCreationFromExpenses: false,
      productCostAutoUpdate: false,
      productLearning: false,
      familyMarginRules: false,
      cloudSync: true,
      databaseImport: true,
      aiTextAutofill: true,
      quarterlySummary: true,
      quarterlyExport: true,
      customLogo: true,
      documentTemplateDesigner: true,
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
      maxProducts: null,
      expenseScansPerMonth: 30,
      expenseInbox: true,
      expenseLineExtraction: false,
      productCreationFromExpenses: false,
      productCostAutoUpdate: false,
      productLearning: false,
      familyMarginRules: false,
      cloudSync: true,
      databaseImport: true,
      aiTextAutofill: true,
      quarterlySummary: true,
      quarterlyExport: true,
      customLogo: true,
      documentTemplateDesigner: true,
      prioritySupport: true,
    },
  },
  pro_plus: {
    id: "pro_plus",
    name: "Pro+ IA",
    priceMonthlyEur: 14.99,
    priceYearlyEur: 149,
    trialDays: 0,
    limits: {
      maxDocumentsPerMonth: null,
      maxCustomers: null,
      maxProducts: null,
      expenseScansPerMonth: 150,
      expenseInbox: true,
      expenseLineExtraction: true,
      productCreationFromExpenses: true,
      productCostAutoUpdate: true,
      productLearning: true,
      familyMarginRules: true,
      cloudSync: true,
      databaseImport: true,
      aiTextAutofill: true,
      quarterlySummary: true,
      quarterlyExport: true,
      customLogo: true,
      documentTemplateDesigner: true,
      prioritySupport: true,
    },
  },
};

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLANS[plan].limits;
}

export function isProPlan(plan: PlanId): boolean {
  return plan === "pro" || plan === "pro_plus" || plan === "trial";
}

export function isPaidPlan(plan: PlanId): plan is PaidPlanId {
  return plan === "pro" || plan === "pro_plus";
}

export function isProPlusPlan(plan: PlanId): boolean {
  return plan === "pro_plus";
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

export function yearlySavingsPercent(plan: PaidPlanId = "pro"): number {
  const monthly = PLANS[plan].priceMonthlyEur ?? 0;
  const yearly = PLANS[plan].priceYearlyEur ?? 0;
  if (monthly <= 0) return 0;
  const fullYearMonthly = monthly * 12;
  return Math.round(((fullYearMonthly - yearly) / fullYearMonthly) * 100);
}
