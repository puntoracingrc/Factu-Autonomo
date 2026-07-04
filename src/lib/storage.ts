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
import type { AppData, BusinessProfile, DocumentType, UserReminder } from "./types";
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
  };
}

const STORAGE_KEY = "factura-autonomo-data";

export function normalizeLoadedData(parsed: Partial<AppData>): AppData {
  const documents = (parsed.documents ?? []).map((document) =>
    normalizeQuoteDocument(document as AppData["documents"][number]),
  );
  const profile = migrateProfile(parsed.profile);
  return {
    ...EMPTY_DATA,
    ...parsed,
    profile,
    customers: (parsed.customers ?? []).map((customer) =>
      migrateCustomer(customer as AppData["customers"][number]),
    ),
    recurringExpenses: parsed.recurringExpenses ?? [],
    userReminders: (parsed.userReminders ?? []).map((item) =>
      normalizeUserReminder(item as UserReminder),
    ),
    products: (parsed.products ?? []).map((product) =>
      normalizeProductCatalogItem(product as AppData["products"][number]),
    ),
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    return normalizeLoadedData(JSON.parse(raw));
  } catch {
    return EMPTY_DATA;
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
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && inMemoryDataIsEmpty(data)) {
      const parsed = JSON.parse(existing) as Partial<AppData>;
      if (storedDataHasContent(parsed)) {
        return;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
