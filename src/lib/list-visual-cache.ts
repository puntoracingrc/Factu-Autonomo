import { formatMoney, formatShortDate, roundMoneySymmetric } from "./calculations";
import { isExpenseBusinessRelated } from "./expenses";
import { documentStatusLabel } from "./invoice-status-actions";
import type { AppData, Document, Expense } from "./types";
import { documentAmounts, expenseAmount, isVatExempt } from "./vat-regime";

export type ListVisualCacheKind = "facturas" | "gastos";

export const LIST_VISUAL_CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const CACHE_VERSION = 1 as const;
const PREVIEW_ITEM_LIMIT = 5;
const MAX_SCOPE_LENGTH = 120;
const MAX_TEXT_LENGTH = 72;

export interface ListVisualCacheItem {
  id: string;
  title: string;
  detail: string;
  amount: string;
}

export interface ListVisualCacheMetric {
  label: string;
  value: string;
}

export interface ListVisualCacheSnapshot {
  version: 1;
  kind: ListVisualCacheKind;
  savedAt: string;
  title: string;
  subtitle: string;
  metrics: ListVisualCacheMetric[];
  items: ListVisualCacheItem[];
  signature: string;
}

export function buildListVisualCacheSnapshot(
  data: AppData,
  kind: ListVisualCacheKind,
  now = new Date(),
): ListVisualCacheSnapshot {
  const vatExempt = isVatExempt(data.profile);
  const content =
    kind === "facturas"
      ? buildInvoiceListVisualContent(data.documents, vatExempt)
      : buildExpenseListVisualContent(data.expenses, vatExempt);
  const snapshotWithoutSignature = {
    version: CACHE_VERSION,
    kind,
    savedAt: now.toISOString(),
    ...content,
  };

  return {
    ...snapshotWithoutSignature,
    signature: listVisualCacheSignature({
      kind,
      title: snapshotWithoutSignature.title,
      subtitle: snapshotWithoutSignature.subtitle,
      metrics: snapshotWithoutSignature.metrics,
      items: snapshotWithoutSignature.items,
    }),
  };
}

export function readListVisualCacheSnapshot(
  kind: ListVisualCacheKind,
  scope: string,
  storage: Pick<Storage, "getItem"> | undefined = browserLocalStorage(),
  now = Date.now(),
): ListVisualCacheSnapshot | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(listVisualCacheStorageKey(kind, scope));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isListVisualCacheSnapshot(parsed, kind)) return null;

    const savedAt = Date.parse(parsed.savedAt);
    if (!Number.isFinite(savedAt)) return null;
    if (now - savedAt > LIST_VISUAL_CACHE_MAX_AGE_MS) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function writeListVisualCacheSnapshot(
  snapshot: ListVisualCacheSnapshot,
  scope: string,
  storage: Pick<Storage, "setItem"> | undefined = browserLocalStorage(),
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(
      listVisualCacheStorageKey(snapshot.kind, scope),
      JSON.stringify(snapshot),
    );
    return true;
  } catch {
    return false;
  }
}

export function hasListVisualCacheChanges(
  previous: ListVisualCacheSnapshot | null,
  next: ListVisualCacheSnapshot,
): boolean {
  return Boolean(previous && previous.signature !== next.signature);
}

export function listVisualCacheStorageKey(
  kind: ListVisualCacheKind,
  scope: string,
): string {
  return `factu.list.visual-cache.v1.${kind}.${encodeURIComponent(
    scope || "local",
  ).slice(0, MAX_SCOPE_LENGTH)}`;
}

function buildInvoiceListVisualContent(
  documents: Document[],
  vatExempt: boolean,
): Omit<ListVisualCacheSnapshot, "version" | "kind" | "savedAt" | "signature"> {
  const invoices = documents
    .filter((document) => document.type === "factura")
    .sort((a, b) => dateDesc(a.date, b.date) || textDesc(a.number, b.number));
  const pendingCount = invoices.filter((document) =>
    isInvoicePendingCollection(document),
  ).length;
  const totalAmount = invoices.reduce(
    (sum, document) => sum + safeAmount(documentAmounts(document, vatExempt).total),
    0,
  );

  return {
    title: "Facturas",
    subtitle: `${invoices.length} factura${invoices.length === 1 ? "" : "s"} guardada${invoices.length === 1 ? "" : "s"}`,
    metrics: [
      { label: "Total", value: String(invoices.length) },
      { label: "Pendientes", value: String(pendingCount) },
      { label: "Importe", value: formatMoney(roundMoneySymmetric(totalAmount)) },
    ],
    items: invoices.slice(0, PREVIEW_ITEM_LIMIT).map((document) => ({
      id: document.id,
      title: cleanText(document.number || "Factura"),
      detail: cleanText(
        `${document.rectification ? "Rectificativa" : documentStatusLabel(document, "factura")} · ${formatShortDate(document.date)}`,
      ),
      amount: formatMoney(safeAmount(documentAmounts(document, vatExempt).total)),
    })),
  };
}

function buildExpenseListVisualContent(
  expenses: Expense[],
  vatExempt: boolean,
): Omit<ListVisualCacheSnapshot, "version" | "kind" | "savedAt" | "signature"> {
  const sortedExpenses = [...expenses].sort(
    (a, b) =>
      dateDesc(a.date, b.date) ||
      dateDesc(a.createdAt, b.createdAt) ||
      textDesc(a.id, b.id),
  );
  const businessExpenses = sortedExpenses.filter(isExpenseBusinessRelated);
  const totalAmount = businessExpenses.reduce(
    (sum, expense) => sum + safeAmount(expenseAmount(expense, vatExempt)),
    0,
  );

  return {
    title: "Gastos",
    subtitle: `${sortedExpenses.length} gasto${sortedExpenses.length === 1 ? "" : "s"} guardado${sortedExpenses.length === 1 ? "" : "s"}`,
    metrics: [
      { label: "Total", value: String(sortedExpenses.length) },
      { label: "Negocio", value: String(businessExpenses.length) },
      { label: "Importe", value: formatMoney(roundMoneySymmetric(totalAmount)) },
    ],
    items: sortedExpenses.slice(0, PREVIEW_ITEM_LIMIT).map((expense) => ({
      id: expense.id,
      title: cleanText(expense.category || "Gasto"),
      detail: cleanText(formatShortDate(expense.date)),
      amount: formatMoney(safeAmount(expenseAmount(expense, vatExempt))),
    })),
  };
}

function isInvoicePendingCollection(document: Document): boolean {
  if (document.paymentStatus === "pending" || document.paymentStatus === "overdue") {
    return true;
  }
  return document.status === "enviado" || document.status === "vencido";
}

function safeAmount(value: number): number {
  return Number.isFinite(value) ? roundMoneySymmetric(value) : 0;
}

function dateDesc(a: string | undefined, b: string | undefined): number {
  const timeA = a ? Date.parse(a) : 0;
  const timeB = b ? Date.parse(b) : 0;
  const safeA = Number.isFinite(timeA) ? timeA : 0;
  const safeB = Number.isFinite(timeB) ? timeB : 0;
  return safeB - safeA;
}

function textDesc(a: string, b: string): number {
  return b.localeCompare(a, "es");
}

function cleanText(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_TEXT_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_TEXT_LENGTH - 1).trim()}…`;
}

function listVisualCacheSignature(value: unknown): string {
  return JSON.stringify(value);
}

function browserLocalStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function isListVisualCacheSnapshot(
  value: unknown,
  kind: ListVisualCacheKind,
): value is ListVisualCacheSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as ListVisualCacheSnapshot;
  return (
    snapshot.version === CACHE_VERSION &&
    snapshot.kind === kind &&
    typeof snapshot.savedAt === "string" &&
    typeof snapshot.title === "string" &&
    typeof snapshot.subtitle === "string" &&
    Array.isArray(snapshot.metrics) &&
    snapshot.metrics.length <= 3 &&
    snapshot.metrics.every(isListVisualCacheMetric) &&
    Array.isArray(snapshot.items) &&
    snapshot.items.length <= PREVIEW_ITEM_LIMIT &&
    snapshot.items.every(isListVisualCacheItem) &&
    typeof snapshot.signature === "string"
  );
}

function isListVisualCacheMetric(value: unknown): value is ListVisualCacheMetric {
  if (!value || typeof value !== "object") return false;
  const metric = value as ListVisualCacheMetric;
  return typeof metric.label === "string" && typeof metric.value === "string";
}

function isListVisualCacheItem(value: unknown): value is ListVisualCacheItem {
  if (!value || typeof value !== "object") return false;
  const item = value as ListVisualCacheItem;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.detail === "string" &&
    typeof item.amount === "string"
  );
}
