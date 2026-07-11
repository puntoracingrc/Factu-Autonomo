import { migrateCustomer } from "./customers";
import { normalizeQuoteDocument } from "./quotes";
import { normalizeUserReminder } from "./reminder-team";
import { countersFromDocuments } from "./documents";
import { normalizeIvaSettings } from "./iva";
import { normalizeIrpfPercent } from "./taxes";
import { normalizeVatExempt } from "./vat-regime";
import { normalizeNumbering } from "./numbering";
import { normalizeDocumentPhrases } from "./document-phrases";
import { normalizeDocumentPaymentMethods } from "./document-payment-methods";
import { normalizeDocumentUnits } from "./document-units";
import { normalizeDocumentTemplate } from "./document-templates";
import { normalizeGooglePlacesSettings } from "./google-places";
import { normalizeVerifactuSettings } from "./verifactu/eligibility";
import { normalizeQuoteValidityDays } from "./quote-validity";
import { normalizeProductCatalogItem } from "./purchase-products";
import { normalizeProductFamilyMarkupSettings } from "./product-family-markups";
import { normalizeAppPreferences } from "./app-preferences";
import { normalizeSupplierNif, supplierCompareKey } from "./suppliers";
import { normalizeRecurringExpense } from "./recurring-expenses";
import {
  buildDocumentPdfSnapshot,
  deriveDocumentLifecycle,
  deriveIntegrityLock,
  deriveLegacySnapshotForReadOnly,
} from "./document-integrity";
import {
  DEMO_WORKSPACE_STORAGE_KEY,
  createDemoWorkspaceData,
  isDemoWorkspaceMode,
} from "./demo-workspace";
import type {
  AppData,
  BusinessProfile,
  Document,
  DocumentType,
  Expense,
  Supplier,
  UserReminder,
} from "./types";
import { DEFAULT_PROFILE, EMPTY_DATA } from "./types";

function migrateProfile(profile?: Partial<BusinessProfile>): BusinessProfile {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    commercialName: profile?.commercialName?.trim() ?? "",
    vatId: profile?.vatId?.trim().toUpperCase() ?? "",
    province: profile?.province?.trim() ?? "",
    country: profile?.country?.trim() ?? DEFAULT_PROFILE.country,
    website: profile?.website?.trim() ?? "",
    iva: normalizeIvaSettings(profile?.iva),
    irpfPercent: normalizeIrpfPercent(profile?.irpfPercent),
    vatExempt: normalizeVatExempt(profile?.vatExempt),
    quoteValidityDays: normalizeQuoteValidityDays(profile?.quoteValidityDays),
    numbering: normalizeNumbering(profile?.numbering),
    verifactu: normalizeVerifactuSettings(profile?.verifactu),
    documentPhrases: normalizeDocumentPhrases(profile?.documentPhrases),
    documentPaymentMethods: normalizeDocumentPaymentMethods(
      profile?.documentPaymentMethods,
    ),
    documentUnits: normalizeDocumentUnits(profile?.documentUnits),
    documentTemplate: normalizeDocumentTemplate(profile?.documentTemplate),
    productFamilyMarkups: normalizeProductFamilyMarkupSettings(
      profile?.productFamilyMarkups,
    ),
    googlePlaces: normalizeGooglePlacesSettings(profile?.googlePlaces),
    appPreferences: normalizeAppPreferences(profile?.appPreferences),
  };
}

const STORAGE_KEY = "factura-autonomo-data";

function currentStorageKey(): string {
  return isDemoWorkspaceMode() ? DEMO_WORKSPACE_STORAGE_KEY : STORAGE_KEY;
}

export function normalizeLoadedData(parsed: Partial<AppData>): AppData {
  const profile = migrateProfile(parsed.profile);
  const documents = (parsed.documents ?? []).map((document) =>
    normalizeHistoricalDocument(
      normalizeQuoteDocument(document as AppData["documents"][number]),
      profile,
    ),
  );
  const suppliers = (parsed.suppliers ?? []) as Supplier[];
  const expenses = linkLooseExpensesToExistingSuppliers(
    (parsed.expenses ?? []) as Expense[],
    suppliers,
  );
  return {
    ...EMPTY_DATA,
    ...parsed,
    profile,
    customers: (parsed.customers ?? []).map((customer) =>
      migrateCustomer(customer as AppData["customers"][number]),
    ),
    recurringExpenses: (parsed.recurringExpenses ?? []).map((item) =>
      normalizeRecurringExpense(item),
    ),
    userReminders: (parsed.userReminders ?? []).map((item) =>
      normalizeUserReminder(item as UserReminder),
    ),
    products: (parsed.products ?? []).map((product) =>
      normalizeProductCatalogItem(product as AppData["products"][number]),
    ),
    suppliers,
    expenses,
    documents,
    counters: {
      ...EMPTY_DATA.counters,
      ...parsed.counters,
      ...countersFromDocuments(
        documents,
        profile.numbering.year,
        profile.numbering,
      ),
    },
    meta: parsed.meta,
  };
}

function linkLooseExpensesToExistingSuppliers(
  expenses: Expense[],
  suppliers: Supplier[],
): Expense[] {
  if (expenses.length === 0 || suppliers.length === 0) return expenses;

  const suppliersByNif = new Map<string, Supplier>();
  const suppliersByName = new Map<string, Supplier>();
  for (const supplier of suppliers) {
    const nif = normalizeSupplierNif(supplier.nif);
    if (nif && !suppliersByNif.has(nif)) {
      suppliersByNif.set(nif, supplier);
    }

    const name = supplierCompareKey(supplier.name);
    if (name && !suppliersByName.has(name)) {
      suppliersByName.set(name, supplier);
    }
  }

  return expenses.map((expense) => {
    if (expense.supplierId) return expense;

    const supplierNif = normalizeSupplierNif(
      expense.purchaseDocument?.supplierNif,
    );
    const supplier =
      (supplierNif ? suppliersByNif.get(supplierNif) : undefined) ??
      suppliersByName.get(supplierCompareKey(expense.supplierName));

    if (!supplier) return expense;

    return {
      ...expense,
      supplierId: supplier.id,
      supplierName: supplier.name,
    };
  });
}

function shouldBackfillHistoricalSnapshot(doc: Document): boolean {
  if (doc.documentSnapshot) return false;
  if (doc.type !== "factura" && doc.type !== "recibo") return false;
  return deriveDocumentLifecycle(doc) !== "draft";
}

function isRecoverableLegacyRectificationDraft(doc: Document): boolean {
  if (!doc.rectification || doc.status !== "borrador") return false;
  if (doc.number.trim().toUpperCase() !== "BORRADOR") return false;
  if (doc.verifactu || doc.issuedAt || doc.documentLifecycle === "canceled") {
    return false;
  }
  return (
    !doc.documentSnapshot ||
    doc.documentSnapshot.source === "legacy_backfill"
  );
}

function normalizeHistoricalDocument(
  doc: Document,
  profile: BusinessProfile,
): Document {
  if (isRecoverableLegacyRectificationDraft(doc)) {
    return {
      ...doc,
      issuer: undefined,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      deliveryStatus: undefined,
      paymentStatus: undefined,
      acceptanceStatus: undefined,
      issuedAt: undefined,
      sentAt: undefined,
      paidAt: undefined,
      acceptedAt: undefined,
    };
  }

  const lifecycle = deriveDocumentLifecycle(doc);
  const integrityLock = deriveIntegrityLock(doc);
  if (!shouldBackfillHistoricalSnapshot(doc)) {
    return {
      ...doc,
      documentLifecycle: doc.documentLifecycle ?? lifecycle,
      integrityLock: doc.integrityLock ?? integrityLock,
    };
  }

  const documentSnapshot = deriveLegacySnapshotForReadOnly(doc, profile);
  return {
    ...doc,
    documentLifecycle: "issued",
    integrityLock: "locked",
    documentSnapshot,
    pdfSnapshot:
      doc.pdfSnapshot ??
      buildDocumentPdfSnapshot(
        documentSnapshot,
        profile,
        doc.issuedAt ?? doc.updatedAt,
      ),
  };
}

export function touchAppData(data: AppData): AppData {
  return {
    ...data,
    meta: {
      ...data.meta,
      lastModified: new Date().toISOString(),
    },
  };
}

export function getDataTimestamp(data: AppData): string {
  return data.meta?.lastModified ?? "1970-01-01T00:00:00.000Z";
}

export function loadData(): AppData {
  if (typeof window === "undefined") return EMPTY_DATA;
  try {
    const raw = localStorage.getItem(currentStorageKey());
    if (!raw) {
      return isDemoWorkspaceMode() ? createDemoWorkspaceData() : EMPTY_DATA;
    }
    return normalizeLoadedData(JSON.parse(raw));
  } catch {
    return isDemoWorkspaceMode() ? createDemoWorkspaceData() : EMPTY_DATA;
  }
}

function storedDataHasContent(parsed: Partial<AppData>): boolean {
  return (
    (parsed.documents?.length ?? 0) > 0 ||
    (parsed.customers?.length ?? 0) > 0 ||
    (parsed.expenses?.length ?? 0) > 0 ||
    (parsed.suppliers?.length ?? 0) > 0 ||
    (parsed.products?.length ?? 0) > 0 ||
    Boolean(parsed.profile?.name?.trim())
  );
}

function inMemoryDataIsEmpty(data: AppData): boolean {
  return (
    data.documents.length === 0 &&
    data.customers.length === 0 &&
    data.expenses.length === 0 &&
    data.suppliers.length === 0 &&
    data.products.length === 0 &&
    !data.profile.name.trim()
  );
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    const storageKey = currentStorageKey();
    const existing = localStorage.getItem(storageKey);
    if (existing && inMemoryDataIsEmpty(data)) {
      const parsed = JSON.parse(existing) as Partial<AppData>;
      if (storedDataHasContent(parsed)) {
        return;
      }
    }
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error("No se pudo guardar en localStorage:", error);
  }
}

/** @deprecated Usar assignNextDocumentNumber desde documents.ts */
export function nextDocumentNumber(
  type: DocumentType,
  counters: AppData["counters"],
  year = new Date().getFullYear(),
): { number: string; counters: AppData["counters"] } {
  const next = counters[type] + 1;
  const prefix =
    type === "factura" ? "F" : type === "presupuesto" ? "P" : "R";
  return {
    number: `${prefix}-${year}-${String(next).padStart(4, "0")}`,
    counters: { ...counters, [type]: next },
  };
}
