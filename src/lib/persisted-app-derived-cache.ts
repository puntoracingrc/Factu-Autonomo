import type {
  AppData,
  BusinessProfile,
  Customer,
  Document,
  DocumentSnapshotIntegrityIssue,
} from "./types";

export const PERSISTED_APP_DERIVED_CACHE_VERSION = 1;

export interface PersistedInvoiceIntegritySnapshot {
  blockedDocumentIds: string[];
  claimedDocumentIds: string[];
  validDocumentIds: string[];
  issuesByDocumentId: Array<
    [string, DocumentSnapshotIntegrityIssue[]]
  >;
}

export interface PersistedDocumentListSnapshot {
  invoiceIds: string[];
  quoteIds: string[];
  receiptIds: string[];
}

export interface PersistedCustomerListSnapshot {
  invoicedTotals: Array<[string, number]>;
  recentDescendingIds: string[];
  duplicateGroupIds: string[][];
}

export interface PersistedAppDerivedCache {
  version: typeof PERSISTED_APP_DERIVED_CACHE_VERSION;
  invoiceIntegrity: PersistedInvoiceIntegritySnapshot;
  documentLists: PersistedDocumentListSnapshot;
  customerLists: PersistedCustomerListSnapshot;
}

const invoiceIntegrityByDocuments = new WeakMap<
  readonly Document[],
  WeakMap<BusinessProfile, PersistedInvoiceIntegritySnapshot>
>();
const documentListsByDocuments = new WeakMap<
  readonly Document[],
  WeakMap<BusinessProfile, PersistedDocumentListSnapshot>
>();
const customerListsByCustomers = new WeakMap<
  readonly Customer[],
  WeakMap<readonly Document[], PersistedCustomerListSnapshot>
>();

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isIssueEntries(
  value: unknown,
): value is Array<[string, DocumentSnapshotIntegrityIssue[]]> {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        isStringArray(entry[1]),
    )
  );
}

function isTotals(value: unknown): value is Array<[string, number]> {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        typeof entry[1] === "number" &&
        Number.isFinite(entry[1]),
    )
  );
}

export function isPersistedAppDerivedCache(
  value: unknown,
): value is PersistedAppDerivedCache {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedAppDerivedCache>;
  const integrity = candidate.invoiceIntegrity;
  const documents = candidate.documentLists;
  const customers = candidate.customerLists;
  return (
    candidate.version === PERSISTED_APP_DERIVED_CACHE_VERSION &&
    Boolean(integrity && typeof integrity === "object") &&
    isStringArray(integrity?.blockedDocumentIds) &&
    isStringArray(integrity?.claimedDocumentIds) &&
    isStringArray(integrity?.validDocumentIds) &&
    isIssueEntries(integrity?.issuesByDocumentId) &&
    Boolean(documents && typeof documents === "object") &&
    isStringArray(documents?.invoiceIds) &&
    isStringArray(documents?.quoteIds) &&
    isStringArray(documents?.receiptIds) &&
    Boolean(customers && typeof customers === "object") &&
    isTotals(customers?.invoicedTotals) &&
    isStringArray(customers?.recentDescendingIds) &&
    Array.isArray(customers?.duplicateGroupIds) &&
    customers.duplicateGroupIds.every(isStringArray)
  );
}

export function rememberPersistedAppDerivedCache(
  data: AppData,
  value: unknown,
): void {
  if (!isPersistedAppDerivedCache(value)) return;

  let integrityByProfile = invoiceIntegrityByDocuments.get(data.documents);
  if (!integrityByProfile) {
    integrityByProfile = new WeakMap();
    invoiceIntegrityByDocuments.set(data.documents, integrityByProfile);
  }
  integrityByProfile.set(data.profile, value.invoiceIntegrity);

  let listsByProfile = documentListsByDocuments.get(data.documents);
  if (!listsByProfile) {
    listsByProfile = new WeakMap();
    documentListsByDocuments.set(data.documents, listsByProfile);
  }
  listsByProfile.set(data.profile, value.documentLists);

  let listsByDocuments = customerListsByCustomers.get(data.customers);
  if (!listsByDocuments) {
    listsByDocuments = new WeakMap();
    customerListsByCustomers.set(data.customers, listsByDocuments);
  }
  listsByDocuments.set(data.documents, value.customerLists);
}

export function readPersistedInvoiceIntegritySnapshot(
  documents: readonly Document[],
  profile: BusinessProfile,
): PersistedInvoiceIntegritySnapshot | null {
  return invoiceIntegrityByDocuments.get(documents)?.get(profile) ?? null;
}

export function readPersistedDocumentListSnapshot(
  documents: readonly Document[],
  profile: BusinessProfile,
): PersistedDocumentListSnapshot | null {
  return documentListsByDocuments.get(documents)?.get(profile) ?? null;
}

export function readPersistedCustomerListSnapshot(
  customers: readonly Customer[],
  documents: readonly Document[],
): PersistedCustomerListSnapshot | null {
  return customerListsByCustomers.get(customers)?.get(documents) ?? null;
}
