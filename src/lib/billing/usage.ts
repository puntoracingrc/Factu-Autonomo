import { PLANS, type PlanId } from "./plans";
import { isBillingEnforced } from "./config";

const USAGE_STORAGE_KEY = "fa_billing_usage_v1";

export interface UsageSnapshot {
  monthKey: string;
  documentsCreated: number;
}

interface StoredUsage {
  months: Record<string, number>;
}

export function currentMonthKey(reference = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function readStoredUsage(): StoredUsage {
  if (!hasLocalStorage()) return { months: {} };
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return { months: {} };
    const parsed = JSON.parse(raw) as StoredUsage;
    return parsed?.months ? parsed : { months: {} };
  } catch {
    return { months: {} };
  }
}

function writeStoredUsage(data: StoredUsage): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(data));
}

export function getLocalDocumentUsage(monthKey = currentMonthKey()): number {
  return readStoredUsage().months[monthKey] ?? 0;
}

export function incrementLocalDocumentUsage(
  monthKey = currentMonthKey(),
): UsageSnapshot {
  const stored = readStoredUsage();
  const next = (stored.months[monthKey] ?? 0) + 1;
  stored.months[monthKey] = next;
  writeStoredUsage(stored);
  return { monthKey, documentsCreated: next };
}

export function canCreateDocument(
  plan: PlanId,
  documentsThisMonth: number,
  customerCount?: number,
): { allowed: boolean; reason?: string } {
  if (!isBillingEnforced()) {
    return { allowed: true };
  }

  const limits = PLANS[plan].limits;

  if (
    limits.maxDocumentsPerMonth !== null &&
    documentsThisMonth >= limits.maxDocumentsPerMonth
  ) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limits.maxDocumentsPerMonth} documentos este mes en el plan Gratis. Pasa a Pro para facturar sin límite.`,
    };
  }

  if (
    customerCount !== undefined &&
    limits.maxCustomers !== null &&
    customerCount >= limits.maxCustomers
  ) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limits.maxCustomers} clientes en el plan Gratis. Pasa a Pro para añadir más.`,
    };
  }

  return { allowed: true };
}

export function usageWarningThreshold(plan: PlanId): number | null {
  const max = PLANS[plan].limits.maxDocumentsPerMonth;
  if (max === null) return null;
  return Math.max(1, max - 2);
}
