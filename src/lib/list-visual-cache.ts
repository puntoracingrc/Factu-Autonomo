import {
  formatMoney,
  formatShortDate,
  roundMoneySymmetric,
} from "./calculations";
import { isExpenseBusinessRelated } from "./expenses";
import { documentStatusLabel } from "./invoice-status-actions";
import type {
  AppData,
  Customer,
  Document,
  Expense,
  Product,
  Supplier,
} from "./types";
import { documentAmounts, expenseAmount, isVatExempt } from "./vat-regime";

export type ListVisualCacheKind =
  | "clientes"
  | "presupuestos"
  | "facturas"
  | "recibos"
  | "gastos"
  | "proveedores"
  | "productos";

export const LIST_VISUAL_CACHE_KINDS = [
  "clientes",
  "presupuestos",
  "facturas",
  "recibos",
  "gastos",
  "proveedores",
  "productos",
] as const satisfies readonly ListVisualCacheKind[];

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

export interface ListVisualCacheDependencies {
  scope: string;
  documents: AppData["documents"];
  customers: AppData["customers"];
  expenses: AppData["expenses"];
  suppliers: AppData["suppliers"];
  products: AppData["products"];
  vatExempt: boolean;
}

export function changedListVisualCacheKinds(
  previous: ListVisualCacheDependencies | null,
  next: ListVisualCacheDependencies,
): ListVisualCacheKind[] {
  if (!previous || previous.scope !== next.scope) {
    return [...LIST_VISUAL_CACHE_KINDS];
  }

  const changed = new Set<ListVisualCacheKind>();
  if (previous.documents !== next.documents) {
    const documentsChanged = collectChangedDocumentKinds(
      previous.documents,
      next.documents,
      changed,
    );
    if (documentsChanged) changed.add("clientes");
  }
  if (previous.customers !== next.customers) changed.add("clientes");
  if (previous.expenses !== next.expenses) {
    changed.add("gastos");
    changed.add("proveedores");
  }
  if (previous.suppliers !== next.suppliers) changed.add("proveedores");
  if (previous.products !== next.products) changed.add("productos");
  if (previous.vatExempt !== next.vatExempt) {
    changed.add("presupuestos");
    changed.add("facturas");
    changed.add("recibos");
    changed.add("gastos");
  }
  return [...changed];
}

function collectChangedDocumentKinds(
  previous: AppData["documents"],
  next: AppData["documents"],
  changed: Set<ListVisualCacheKind>,
): boolean {
  let documentsChanged = false;
  const length = Math.max(previous.length, next.length);
  for (let index = 0; index < length; index += 1) {
    const previousDocument = previous[index];
    const nextDocument = next[index];
    if (previousDocument === nextDocument) continue;
    documentsChanged = true;
    if (previousDocument) changed.add(documentListCacheKind(previousDocument));
    if (nextDocument) changed.add(documentListCacheKind(nextDocument));
  }
  return documentsChanged;
}

function documentListCacheKind(document: Document): ListVisualCacheKind {
  switch (document.type) {
    case "factura":
      return "facturas";
    case "presupuesto":
      return "presupuestos";
    case "recibo":
      return "recibos";
  }
}

export function buildListVisualCacheSnapshot(
  data: AppData,
  kind: ListVisualCacheKind,
  now = new Date(),
): ListVisualCacheSnapshot {
  const vatExempt = isVatExempt(data.profile);
  const content = buildListVisualContent(data, kind, vatExempt);
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

function buildListVisualContent(
  data: AppData,
  kind: ListVisualCacheKind,
  vatExempt: boolean,
): Omit<ListVisualCacheSnapshot, "version" | "kind" | "savedAt" | "signature"> {
  switch (kind) {
    case "clientes":
      return buildCustomerListVisualContent(data.customers, data.documents);
    case "presupuestos":
      return buildDocumentTypeListVisualContent(
        data.documents,
        "presupuesto",
        vatExempt,
      );
    case "facturas":
      return buildInvoiceListVisualContent(data.documents, vatExempt);
    case "recibos":
      return buildDocumentTypeListVisualContent(
        data.documents,
        "recibo",
        vatExempt,
      );
    case "gastos":
      return buildExpenseListVisualContent(data.expenses, vatExempt);
    case "proveedores":
      return buildSupplierListVisualContent(data.suppliers, data.expenses);
    case "productos":
      return buildProductListVisualContent(data.products);
  }
}

function buildInvoiceListVisualContent(
  documents: Document[],
  vatExempt: boolean,
): Omit<ListVisualCacheSnapshot, "version" | "kind" | "savedAt" | "signature"> {
  return buildDocumentTypeListVisualContent(documents, "factura", vatExempt);
}

function buildDocumentTypeListVisualContent(
  documents: Document[],
  documentType: Document["type"],
  vatExempt: boolean,
): Omit<ListVisualCacheSnapshot, "version" | "kind" | "savedAt" | "signature"> {
  const typedDocuments = documents
    .filter((document) => document.type === documentType)
    .sort((a, b) => dateDesc(a.date, b.date) || textDesc(a.number, b.number));
  const statusMetric = buildDocumentStatusMetric(typedDocuments, documentType);
  const totalAmount = typedDocuments.reduce(
    (sum, document) =>
      sum + safeAmount(documentAmounts(document, vatExempt).total),
    0,
  );
  const title = documentListTitle(documentType);
  const singular = documentListSingular(documentType);

  return {
    title,
    subtitle: `${typedDocuments.length} ${plural(typedDocuments.length, singular)} guardado${typedDocuments.length === 1 ? "" : "s"}`,
    metrics: [
      { label: "Total", value: String(typedDocuments.length) },
      statusMetric,
      {
        label: "Importe",
        value: formatMoney(roundMoneySymmetric(totalAmount)),
      },
    ],
    items: typedDocuments.slice(0, PREVIEW_ITEM_LIMIT).map((document) => ({
      id: document.id,
      title: cleanText(
        document.number || documentListItemFallback(documentType),
      ),
      detail: cleanText(
        `${document.rectification ? "Rectificativa" : documentStatusLabel(document, documentType)} · ${formatShortDate(document.date)}`,
      ),
      amount: formatMoney(
        safeAmount(documentAmounts(document, vatExempt).total),
      ),
    })),
  };
}

function buildCustomerListVisualContent(
  customers: Customer[],
  documents: Document[],
): Omit<ListVisualCacheSnapshot, "version" | "kind" | "savedAt" | "signature"> {
  const sortedCustomers = [...customers].sort(
    (a, b) =>
      dateDesc(a.updatedAt, b.updatedAt) ||
      dateDesc(a.createdAt, b.createdAt) ||
      textAsc(customerDisplayName(a), customerDisplayName(b)),
  );
  const companyCount = sortedCustomers.filter(
    (customer) => customer.customerType === "company",
  ).length;
  const documentCounts = countDocumentsByEntity(documents, "customerId");

  return {
    title: "Clientes",
    subtitle: `${sortedCustomers.length} cliente${sortedCustomers.length === 1 ? "" : "s"} guardado${sortedCustomers.length === 1 ? "" : "s"}`,
    metrics: [
      { label: "Total", value: String(sortedCustomers.length) },
      { label: "Empresas", value: String(companyCount) },
      { label: "Con docs.", value: String(documentCounts.size) },
    ],
    items: sortedCustomers.slice(0, PREVIEW_ITEM_LIMIT).map((customer) => {
      const documentCount = documentCounts.get(customer.id) ?? 0;
      return {
        id: customer.id,
        title: cleanText(customerDisplayName(customer)),
        detail: cleanText(
          `${customer.customerType === "company" ? "Empresa" : "Cliente"} · ${formatShortDate(customer.updatedAt || customer.createdAt)}`,
        ),
        amount:
          documentCount > 0
            ? `${documentCount} doc${documentCount === 1 ? "." : "s."}`
            : "",
      };
    }),
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
      {
        label: "Importe",
        value: formatMoney(roundMoneySymmetric(totalAmount)),
      },
    ],
    items: sortedExpenses.slice(0, PREVIEW_ITEM_LIMIT).map((expense) => ({
      id: expense.id,
      title: cleanText(expense.category || "Gasto"),
      detail: cleanText(formatShortDate(expense.date)),
      amount: formatMoney(safeAmount(expenseAmount(expense, vatExempt))),
    })),
  };
}

function buildSupplierListVisualContent(
  suppliers: Supplier[],
  expenses: Expense[],
): Omit<ListVisualCacheSnapshot, "version" | "kind" | "savedAt" | "signature"> {
  const sortedSuppliers = [...suppliers].sort(
    (a, b) => dateDesc(a.createdAt, b.createdAt) || textAsc(a.name, b.name),
  );
  const categories = new Set(
    sortedSuppliers
      .map((supplier) => supplier.category?.trim())
      .filter((category): category is string => Boolean(category)),
  );
  const expenseCounts = countExpensesBySupplier(expenses);

  return {
    title: "Proveedores",
    subtitle: `${sortedSuppliers.length} proveedor${sortedSuppliers.length === 1 ? "" : "es"} guardado${sortedSuppliers.length === 1 ? "" : "s"}`,
    metrics: [
      { label: "Total", value: String(sortedSuppliers.length) },
      { label: "Categorías", value: String(categories.size) },
      { label: "Con gastos", value: String(expenseCounts.size) },
    ],
    items: sortedSuppliers.slice(0, PREVIEW_ITEM_LIMIT).map((supplier) => {
      const expenseCount = expenseCounts.get(supplier.id) ?? 0;
      return {
        id: supplier.id,
        title: cleanText(supplier.name || "Proveedor"),
        detail: cleanText(
          supplier.category || `Creado ${formatShortDate(supplier.createdAt)}`,
        ),
        amount:
          expenseCount > 0
            ? `${expenseCount} gasto${expenseCount === 1 ? "" : "s"}`
            : "",
      };
    }),
  };
}

function buildProductListVisualContent(
  products: Product[],
): Omit<ListVisualCacheSnapshot, "version" | "kind" | "savedAt" | "signature"> {
  const sortedProducts = [...products].sort(
    (a, b) =>
      dateDesc(a.updatedAt, b.updatedAt) ||
      dateDesc(a.createdAt, b.createdAt) ||
      textAsc(a.name, b.name),
  );
  const visibleProducts = sortedProducts.filter((product) => !product.hidden);
  const families = new Set(
    visibleProducts
      .map((product) => product.family?.trim())
      .filter((family): family is string => Boolean(family)),
  );
  const manualCount = visibleProducts.filter(
    (product) => product.source === "manual",
  ).length;

  return {
    title: "Productos",
    subtitle: `${visibleProducts.length} producto${visibleProducts.length === 1 ? "" : "s"} visible${visibleProducts.length === 1 ? "" : "s"}`,
    metrics: [
      { label: "Visibles", value: String(visibleProducts.length) },
      { label: "Familias", value: String(families.size) },
      { label: "Manual", value: String(manualCount) },
    ],
    items: visibleProducts.slice(0, PREVIEW_ITEM_LIMIT).map((product) => ({
      id: product.id,
      title: cleanText(product.name || "Producto"),
      detail: cleanText(
        [product.family, product.subfamily].filter(Boolean).join(" · ") ||
          `Creado ${formatShortDate(product.createdAt)}`,
      ),
      amount: product.cost
        ? `Coste ${formatMoney(safeAmount(product.cost))}`
        : product.pvp
          ? `PVP ${formatMoney(safeAmount(product.pvp))}`
          : product.unit || "",
    })),
  };
}

function buildDocumentStatusMetric(
  documents: Document[],
  documentType: Document["type"],
): ListVisualCacheMetric {
  if (documentType === "factura") {
    return {
      label: "Pendientes",
      value: String(documents.filter(isInvoicePendingCollection).length),
    };
  }
  if (documentType === "presupuesto") {
    return {
      label: "Aceptados",
      value: String(
        documents.filter((document) => document.status === "aceptado").length,
      ),
    };
  }
  return {
    label: "Cobrados",
    value: String(
      documents.filter((document) => document.status === "pagado").length,
    ),
  };
}

function isInvoicePendingCollection(document: Document): boolean {
  if (
    document.paymentStatus === "pending" ||
    document.paymentStatus === "overdue"
  ) {
    return true;
  }
  return document.status === "enviado" || document.status === "vencido";
}

function documentListTitle(documentType: Document["type"]): string {
  if (documentType === "presupuesto") return "Presupuestos";
  if (documentType === "recibo") return "Recibos";
  return "Facturas";
}

function documentListSingular(documentType: Document["type"]): string {
  if (documentType === "presupuesto") return "presupuesto";
  if (documentType === "recibo") return "recibo";
  return "factura";
}

function documentListItemFallback(documentType: Document["type"]): string {
  if (documentType === "presupuesto") return "Presupuesto";
  if (documentType === "recibo") return "Recibo";
  return "Factura";
}

function customerDisplayName(customer: Customer): string {
  return (
    customer.name ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    "Cliente"
  );
}

function countDocumentsByEntity(
  documents: Document[],
  field: "customerId",
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const document of documents) {
    const id = document[field];
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function countExpensesBySupplier(expenses: Expense[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.supplierId) continue;
    counts.set(expense.supplierId, (counts.get(expense.supplierId) ?? 0) + 1);
  }
  return counts;
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

function textAsc(a: string, b: string): number {
  return a.localeCompare(b, "es");
}

function plural(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
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

function isListVisualCacheMetric(
  value: unknown,
): value is ListVisualCacheMetric {
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
