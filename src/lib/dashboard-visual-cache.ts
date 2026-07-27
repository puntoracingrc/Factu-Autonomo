import {
  formatMoney,
  formatShortDate,
  roundMoneySymmetric,
} from "./calculations";
import { documentStatusLabel } from "./invoice-status-actions";
import { expenseTotals } from "./expenses";
import { documentAmounts, isVatExempt } from "./vat-regime";
import type { ProductBusinessSummary } from "./product-business-summary";
import type {
  ProductPeriodSelection,
  ProductPeriodSummary,
} from "./product-period-summary";
import type { AppData, Document, Expense } from "./types";

export const DASHBOARD_VISUAL_CACHE_KEY =
  "factu.dashboard.visual-cache.v1";

export const DASHBOARD_VISUAL_CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const CACHE_VERSION = 1 as const;
const PREVIEW_ITEM_LIMIT = 3;

export interface DashboardVisualCacheItem {
  id: string;
  title: string;
  detail: string;
  amount: string;
}

export interface DashboardVisualCacheSnapshot {
  version: 1;
  savedAt: string;
  periodLabel: string;
  metrics: {
    billed: string;
    collected: string;
    pending: string;
    expenses: string;
    balance: string;
  };
  recentDocuments: DashboardVisualCacheItem[];
  recentExpenses: DashboardVisualCacheItem[];
  pendingInvoices: DashboardVisualCacheItem[];
  signature: string;
}

export function buildDashboardVisualCacheSnapshot(
  data: AppData,
  period: ProductPeriodSelection,
  periodSummary: ProductPeriodSummary,
  recentSummary: ProductBusinessSummary,
  now = new Date(),
): DashboardVisualCacheSnapshot {
  const vatExempt = isVatExempt(data.profile);
  const snapshotWithoutSignature = {
    version: CACHE_VERSION,
    savedAt: now.toISOString(),
    periodLabel: periodSummary.label,
    metrics: {
      billed: formatMoney(periodSummary.totalBilledIssued),
      collected: formatMoney(periodSummary.totalCollectedLocal),
      pending: formatMoney(periodSummary.totalPendingCollection),
      expenses: formatMoney(Math.abs(periodSummary.totalExpenses)),
      balance: formatMoney(periodSummary.balanceEstimated),
    },
    recentDocuments: recentSummary.recentDocuments
      .slice(0, PREVIEW_ITEM_LIMIT)
      .map((document) => documentCacheItem(document, vatExempt)),
    recentExpenses: recentSummary.recentExpenses
      .slice(0, PREVIEW_ITEM_LIMIT)
      .map((expense) => expenseCacheItem(expense, vatExempt)),
    pendingInvoices: recentSummary.pendingInvoices
      .slice(0, PREVIEW_ITEM_LIMIT)
      .map((document) => pendingInvoiceCacheItem(document, vatExempt)),
  };

  return {
    ...snapshotWithoutSignature,
    signature: dashboardVisualCacheSignature({
      periodLabel: snapshotWithoutSignature.periodLabel,
      metrics: snapshotWithoutSignature.metrics,
      recentDocuments: snapshotWithoutSignature.recentDocuments,
      recentExpenses: snapshotWithoutSignature.recentExpenses,
      pendingInvoices: snapshotWithoutSignature.pendingInvoices,
      periodKind: period.kind,
      year: period.year,
      month: period.month,
      quarter: period.quarter,
    }),
  };
}

export function readDashboardVisualCache(
  storage: Pick<Storage, "getItem"> | undefined = browserLocalStorage(),
  now = Date.now(),
): DashboardVisualCacheSnapshot | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(DASHBOARD_VISUAL_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isDashboardVisualCacheSnapshot(parsed)) return null;

    const savedAt = Date.parse(parsed.savedAt);
    if (!Number.isFinite(savedAt)) return null;
    if (now - savedAt > DASHBOARD_VISUAL_CACHE_MAX_AGE_MS) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function writeDashboardVisualCache(
  snapshot: DashboardVisualCacheSnapshot,
  storage: Pick<Storage, "setItem"> | undefined = browserLocalStorage(),
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(DASHBOARD_VISUAL_CACHE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function hasDashboardVisualCacheChanges(
  previous: DashboardVisualCacheSnapshot | null,
  next: DashboardVisualCacheSnapshot,
): boolean {
  return Boolean(previous && previous.signature !== next.signature);
}

function documentCacheItem(
  document: Document,
  vatExempt: boolean,
): DashboardVisualCacheItem {
  const status = document.rectification
    ? "Rectificativa"
    : documentStatusLabel(document, document.type);
  return {
    id: document.id,
    title: document.number,
    detail: `${status} · ${formatShortDate(document.date)}`,
    amount: formatMoney(
      signedAmount(documentAmounts(document, vatExempt).total),
    ),
  };
}

function pendingInvoiceCacheItem(
  document: Document,
  vatExempt: boolean,
): DashboardVisualCacheItem {
  return {
    id: document.id,
    title: document.number,
    detail: `Pendiente · ${formatShortDate(document.date)}`,
    amount: formatMoney(
      positiveAmount(documentAmounts(document, vatExempt).total),
    ),
  };
}

function expenseCacheItem(
  expense: Expense,
  vatExempt: boolean,
): DashboardVisualCacheItem {
  return {
    id: expense.id,
    title: expense.description || "Gasto",
    detail: `${expense.category} · ${formatShortDate(expense.date)}`,
    amount: formatMoney(signedAmount(expenseTotals(expense, vatExempt).total)),
  };
}

function positiveAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return roundMoneySymmetric(value);
}

function signedAmount(value: number): number {
  return Number.isFinite(value) ? roundMoneySymmetric(value) : 0;
}

function dashboardVisualCacheSignature(value: unknown): string {
  return JSON.stringify(value);
}

function browserLocalStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function isDashboardVisualCacheSnapshot(
  value: unknown,
): value is DashboardVisualCacheSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as DashboardVisualCacheSnapshot;
  return (
    snapshot.version === CACHE_VERSION &&
    typeof snapshot.savedAt === "string" &&
    typeof snapshot.periodLabel === "string" &&
    isMetrics(snapshot.metrics) &&
    isCacheItemList(snapshot.recentDocuments) &&
    isCacheItemList(snapshot.recentExpenses) &&
    isCacheItemList(snapshot.pendingInvoices) &&
    typeof snapshot.signature === "string"
  );
}

function isMetrics(
  value: DashboardVisualCacheSnapshot["metrics"] | unknown,
): value is DashboardVisualCacheSnapshot["metrics"] {
  if (!value || typeof value !== "object") return false;
  const metrics = value as DashboardVisualCacheSnapshot["metrics"];
  return (
    typeof metrics.billed === "string" &&
    typeof metrics.collected === "string" &&
    typeof metrics.pending === "string" &&
    typeof metrics.expenses === "string" &&
    typeof metrics.balance === "string"
  );
}

function isCacheItemList(value: unknown): value is DashboardVisualCacheItem[] {
  return (
    Array.isArray(value) &&
    value.length <= PREVIEW_ITEM_LIMIT &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.detail === "string" &&
        typeof item.amount === "string",
    )
  );
}
