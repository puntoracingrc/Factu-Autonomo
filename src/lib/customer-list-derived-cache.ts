import {
  buildCustomerInvoicedTotals,
  findDuplicateCustomerGroups,
  sortCustomers,
  type CustomerInvoicedTotals,
  type CustomerSortDirection,
  type CustomerSortField,
} from "./customers";
import {
  readPersistedCustomerListSnapshot,
  type PersistedCustomerListSnapshot,
} from "./persisted-app-derived-cache";
import type { Customer, Document } from "./types";

interface CustomerListCacheEntry {
  persisted: PersistedCustomerListSnapshot | null;
  invoicedTotals?: CustomerInvoicedTotals;
  duplicateGroups?: Customer[][];
  sorted: Map<string, Customer[]>;
}

const cache = new WeakMap<
  readonly Customer[],
  WeakMap<readonly Document[], CustomerListCacheEntry>
>();

function cacheEntry(
  customers: readonly Customer[],
  documents: readonly Document[],
): CustomerListCacheEntry {
  const cached = cache.get(customers)?.get(documents);
  if (cached) return cached;

  const entry: CustomerListCacheEntry = {
    persisted: readPersistedCustomerListSnapshot(customers, documents),
    sorted: new Map(),
  };
  let byDocuments = cache.get(customers);
  if (!byDocuments) {
    byDocuments = new WeakMap();
    cache.set(customers, byDocuments);
  }
  byDocuments.set(documents, entry);
  return entry;
}

function customerByUniqueId(
  customers: readonly Customer[],
): Map<string, Customer> | null {
  const byId = new Map(customers.map((customer) => [customer.id, customer]));
  return byId.size === customers.length ? byId : null;
}

function totalsFromPersisted(
  customers: readonly Customer[],
  snapshot: PersistedCustomerListSnapshot,
): CustomerInvoicedTotals | null {
  if (snapshot.invoicedTotals.length !== customers.length) return null;
  const knownIds = new Set(customers.map((customer) => customer.id));
  if (knownIds.size !== customers.length) return null;
  const totals = new Map<string, number>();
  for (const [customerId, total] of snapshot.invoicedTotals) {
    if (!knownIds.has(customerId) || totals.has(customerId)) return null;
    totals.set(customerId, total);
  }
  return totals;
}

function orderedCustomersFromPersisted(
  customers: readonly Customer[],
  ids: readonly string[],
): Customer[] | null {
  if (ids.length !== customers.length) return null;
  const byId = customerByUniqueId(customers);
  if (!byId) return null;
  const seen = new Set<string>();
  const result: Customer[] = [];
  for (const id of ids) {
    const customer = byId.get(id);
    if (!customer || seen.has(id)) return null;
    seen.add(id);
    result.push(customer);
  }
  return result;
}

function duplicateGroupsFromPersisted(
  customers: readonly Customer[],
  snapshot: PersistedCustomerListSnapshot,
): Customer[][] | null {
  const byId = customerByUniqueId(customers);
  if (!byId) return null;
  const used = new Set<string>();
  const groups: Customer[][] = [];
  for (const ids of snapshot.duplicateGroupIds) {
    if (ids.length < 2) return null;
    const group: Customer[] = [];
    for (const id of ids) {
      const customer = byId.get(id);
      if (!customer || used.has(id)) return null;
      used.add(id);
      group.push(customer);
    }
    groups.push(group);
  }
  return groups;
}

export function buildCustomerInvoicedTotalsCached(
  customers: Customer[],
  documents: Document[],
): CustomerInvoicedTotals {
  const entry = cacheEntry(customers, documents);
  if (entry.invoicedTotals) return entry.invoicedTotals;
  entry.invoicedTotals =
    (entry.persisted && totalsFromPersisted(customers, entry.persisted)) ||
    buildCustomerInvoicedTotals(customers, documents);
  return entry.invoicedTotals;
}

export function findDuplicateCustomerGroupsCached(
  customers: Customer[],
  documents: Document[],
): Customer[][] {
  const entry = cacheEntry(customers, documents);
  if (entry.duplicateGroups) return entry.duplicateGroups;
  entry.duplicateGroups =
    (entry.persisted &&
      duplicateGroupsFromPersisted(customers, entry.persisted)) ||
    findDuplicateCustomerGroups(customers);
  return entry.duplicateGroups;
}

export function sortCustomersCached(
  customers: Customer[],
  documents: Document[],
  field: CustomerSortField,
  direction: CustomerSortDirection,
  invoicedTotals?: CustomerInvoicedTotals,
): Customer[] {
  const entry = cacheEntry(customers, documents);
  const key = `${field}:${direction}`;
  const canCache =
    field !== "facturacion" ||
    invoicedTotals === undefined ||
    invoicedTotals === entry.invoicedTotals;
  const cached = canCache ? entry.sorted.get(key) : undefined;
  if (cached) return cached;

  const persistedDefault =
    field === "reciente" && direction === "desc" && entry.persisted
      ? orderedCustomersFromPersisted(
          customers,
          entry.persisted.recentDescendingIds,
        )
      : null;
  const sorted =
    persistedDefault ??
    sortCustomers(customers, documents, field, direction, invoicedTotals);
  if (canCache) entry.sorted.set(key, sorted);
  return sorted;
}
