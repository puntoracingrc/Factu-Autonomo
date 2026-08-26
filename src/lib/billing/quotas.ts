import type { Expense, Document } from "@/lib/types";
import { PLANS, type PlanId } from "./plans";

export const BILLING_QUOTA_METRICS = [
  "documents",
  "manual_expenses",
  "customers",
  "suppliers",
  "products",
] as const;

export type BillingQuotaMetric = (typeof BILLING_QUOTA_METRICS)[number];
export type BillingQuotaSource =
  | "app"
  | "reconcile"
  | "automatic_customer"
  | "automatic_supplier";

export const BILLING_QUOTA_PACKS = {
  documents_5: {
    key: "documents_5",
    metric: "documents",
    quantity: 5,
    label: "5 documentos extra",
    priceLabel: "2,99 EUR + IVA",
  },
  manual_expenses_10: {
    key: "manual_expenses_10",
    metric: "manual_expenses",
    quantity: 10,
    label: "10 gastos manuales extra",
    priceLabel: "1,99 EUR + IVA",
  },
  contacts_5: {
    key: "contacts_5",
    metric: "customers",
    quantity: 5,
    label: "5 clientes y 5 proveedores extra",
    priceLabel: "3,99 EUR + IVA",
  },
} as const;

export type BillingQuotaPackKey = keyof typeof BILLING_QUOTA_PACKS;

export const BILLING_QUOTA_PACK_FULFILLMENT_CONTRACT =
  "quota_pack_atomic_v1";

export function isBillingQuotaPackKey(
  value: unknown,
): value is BillingQuotaPackKey {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(BILLING_QUOTA_PACKS, value)
  );
}

export interface BillingQuotaMetricSnapshot {
  metric: BillingQuotaMetric;
  used: number;
  included: number | null;
  effectiveLimit: number | null;
  creditBalance: number;
  capacityBonus: number;
  remaining: number | null;
  resetAt: string | null;
}

export interface BillingQuotaSnapshot {
  plan: PlanId;
  monthKey: string;
  generatedAt: string;
  metrics: Record<BillingQuotaMetric, BillingQuotaMetricSnapshot>;
}

export interface BillingQuotaBlock extends BillingQuotaMetricSnapshot {
  code: "limit_reached" | "account_required" | "service_unavailable";
  message: string;
}

export interface BillingQuotaReservation {
  allowed: true;
  claimId: string | null;
  metric: BillingQuotaMetric;
  snapshot: BillingQuotaMetricSnapshot;
}

export interface BillingQuotaDenied {
  allowed: false;
  block: BillingQuotaBlock;
}

export type BillingQuotaReserveResult =
  | BillingQuotaReservation
  | BillingQuotaDenied;

export interface BillingQuotaReconciliationInput {
  documents: string[];
  manualExpenses: string[];
  customers: string[];
  suppliers: string[];
  products: string[];
}

const PERIOD_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
});

function datePartsInMadrid(date: Date): { year: number; month: number } {
  const parts = PERIOD_FORMATTER.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function madridOffsetMilliseconds(date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return asUtc - date.getTime();
}

function madridLocalMidnightUtc(year: number, month: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, 1));
  const first = new Date(guess.getTime() - madridOffsetMilliseconds(guess));
  return new Date(guess.getTime() - madridOffsetMilliseconds(first));
}

export function billingMonthWindow(reference = new Date()): {
  monthKey: string;
  resetAt: string;
} {
  const { year, month } = datePartsInMadrid(reference);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    monthKey: `${year}-${String(month).padStart(2, "0")}`,
    resetAt: madridLocalMidnightUtc(nextYear, nextMonth).toISOString(),
  };
}

export function quotaPeriodKey(
  metric: BillingQuotaMetric,
  monthKey: string,
): string {
  return metric === "documents" || metric === "manual_expenses"
    ? monthKey
    : "lifetime";
}

export function quotaLimitForPlan(
  plan: PlanId,
  metric: BillingQuotaMetric,
): number | null {
  const limits = PLANS[plan].limits;
  switch (metric) {
    case "documents":
      return limits.maxDocumentsPerMonth;
    case "manual_expenses":
      return limits.maxManualExpensesPerMonth;
    case "customers":
      return limits.maxCustomers;
    case "suppliers":
      return limits.maxSuppliers;
    case "products":
      return limits.maxProducts;
  }
}

export function quotaPackForMetric(
  metric: BillingQuotaMetric,
): BillingQuotaPackKey | null {
  if (metric === "documents") return "documents_5";
  if (metric === "manual_expenses") return "manual_expenses_10";
  if (metric === "customers" || metric === "suppliers") return "contacts_5";
  return null;
}

export function billingQuotaMetricLabel(metric: BillingQuotaMetric): string {
  switch (metric) {
    case "documents":
      return "documentos definitivos";
    case "manual_expenses":
      return "gastos manuales";
    case "customers":
      return "clientes";
    case "suppliers":
      return "proveedores";
    case "products":
      return "productos";
  }
}

export function billingQuotaBlockMessage(
  metric: BillingQuotaMetric,
  effectiveLimit: number | null,
  resetAt: string | null,
): string {
  const label = billingQuotaMetricLabel(metric);
  const reset = resetAt
    ? ` Tu contador se reinicia el ${new Intl.DateTimeFormat("es-ES", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Madrid",
      }).format(new Date(resetAt))}.`
    : "";
  return `Has alcanzado el límite${
    effectiveLimit === null ? "" : ` de ${effectiveLimit}`
  } de ${label} del plan Gratis.${reset}`;
}

export function isQuotaCountedDocument(document: Document): boolean {
  if (document.rectification) return false;
  if (
    document.status === "borrador" ||
    document.documentLifecycle === "draft"
  ) {
    return false;
  }
  if (document.type === "recibo" && document.sourceDocumentId) return false;
  return true;
}

export function isQuotaCountedManualExpense(expense: Expense): boolean {
  return expense.origin === "manual";
}

function belongsToBillingMonth(value: string | undefined, monthKey: string) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && billingMonthWindow(date).monthKey === monthKey;
}

export function buildBillingQuotaReconciliation(input: {
  documents: Document[];
  expenses: Expense[];
  customers: Array<{ id: string }>;
  suppliers: Array<{ id: string }>;
  products: Array<{ id: string; hidden?: boolean }>;
  monthKey: string;
}): BillingQuotaReconciliationInput {
  return {
    documents: input.documents
      .filter(
        (document) =>
          isQuotaCountedDocument(document) &&
          belongsToBillingMonth(
            document.issuedAt ?? document.createdAt,
            input.monthKey,
          ),
      )
      .map((document) => document.id),
    manualExpenses: input.expenses
      .filter(
        (expense) =>
          isQuotaCountedManualExpense(expense) &&
          belongsToBillingMonth(expense.createdAt, input.monthKey),
      )
      .map((expense) => expense.id),
    customers: input.customers.map((customer) => customer.id),
    suppliers: input.suppliers.map((supplier) => supplier.id),
    products: input.products
      .filter((product) => !product.hidden)
      .map((product) => product.id),
  };
}

export function emptyBillingQuotaSnapshot(
  plan: PlanId,
  reference = new Date(),
): BillingQuotaSnapshot {
  const { monthKey, resetAt } = billingMonthWindow(reference);
  const metrics = Object.fromEntries(
    BILLING_QUOTA_METRICS.map((metric) => {
      const included = quotaLimitForPlan(plan, metric);
      return [
        metric,
        {
          metric,
          used: 0,
          included,
          effectiveLimit: included,
          creditBalance: 0,
          capacityBonus: 0,
          remaining: included,
          resetAt:
            metric === "documents" || metric === "manual_expenses"
              ? resetAt
              : null,
        },
      ];
    }),
  ) as Record<BillingQuotaMetric, BillingQuotaMetricSnapshot>;
  return { plan, monthKey, generatedAt: reference.toISOString(), metrics };
}
