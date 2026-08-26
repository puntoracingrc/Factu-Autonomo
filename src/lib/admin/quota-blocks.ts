import type {
  BillingQuotaMetric,
  BillingQuotaSource,
} from "@/lib/billing/quotas";
import type { PlanId } from "@/lib/billing/plans";

export interface AdminQuotaBlockEvent {
  id: string;
  metric: BillingQuotaMetric;
  plan: PlanId;
  periodKey: string;
  currentUsage: number;
  includedLimit: number | null;
  effectiveLimit: number | null;
  creditBalance: number;
  capacityBonus: number;
  resetAt: string | null;
  source: BillingQuotaSource;
  createdAt: string;
  account: {
    key: string;
    email: string | null;
  };
}

export interface AdminQuotaBlocksResponse {
  monitoringAvailable: boolean;
  rangeDays: number;
  total: number;
  uniqueAccounts: number;
  byMetric: Partial<Record<BillingQuotaMetric, number>>;
  events: AdminQuotaBlockEvent[];
  message?: string;
  error?: string;
}

export function billingQuotaSourceLabel(source: BillingQuotaSource): string {
  if (source === "automatic_customer") return "Cliente automático";
  if (source === "automatic_supplier") return "Proveedor automático";
  if (source === "reconcile") return "Reconciliación";
  return "Acción del usuario";
}
