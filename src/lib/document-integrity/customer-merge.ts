import { clientMatchesCustomer, customerToClient, migrateCustomer } from "@/lib/customers";
import type { Customer, Document } from "@/lib/types";
import { isDocumentIntegrityLocked } from "@/lib/document-integrity";

export type MergeCustomersOptions = {
  updateDraftDocuments?: boolean;
};

export interface MergeCustomerRecordsResult {
  customers: Customer[];
  keep: Customer;
  removed: Customer[];
}

function uniqueIds(ids: Array<string | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function customerRelationIds(customer: Customer): string[] {
  return uniqueIds([customer.id, ...(customer.mergedCustomerIds ?? [])]);
}

function documentReferencesCustomerId(doc: Document, customer: Customer): boolean {
  if (!doc.customerId) return false;
  return customerRelationIds(customer).includes(doc.customerId);
}

function documentClientMatchesCustomer(doc: Document, customer: Customer): boolean {
  return clientMatchesCustomer(doc.client, customer);
}

export function isDocumentCustomerSnapshotProtected(doc: Document): boolean {
  return isDocumentIntegrityLocked(doc);
}

export function documentMatchesCustomer(doc: Document, customer: Customer): boolean {
  if (doc.customerId) {
    return documentReferencesCustomerId(doc, customer);
  }

  return documentClientMatchesCustomer(doc, customer);
}

export function findDocumentsForCustomer(
  documents: Document[],
  customer: Customer,
): Document[] {
  return documents.filter((doc) => documentMatchesCustomer(doc, customer));
}

export function mergeCustomerRecords(
  customers: Customer[],
  keepId: string,
  removeIds: string[],
  mergedAt: Date | string = new Date(),
): MergeCustomerRecordsResult | null {
  const uniqueRemoveIds = uniqueIds(removeIds).filter((id) => id !== keepId);
  if (uniqueRemoveIds.length === 0) return null;

  const keep = customers.find((customer) => customer.id === keepId);
  if (!keep) return null;

  const removed = customers.filter((customer) =>
    uniqueRemoveIds.includes(customer.id),
  );
  if (removed.length === 0) return null;

  const migratedKeep = migrateCustomer(keep);
  const mergedCustomerIds = uniqueIds([
    ...(migratedKeep.mergedCustomerIds ?? []),
    ...removed.flatMap((customer) => [
      customer.id,
      ...(customer.mergedCustomerIds ?? []),
    ]),
  ]).filter((id) => id !== keepId);

  const enrichedKeep: Customer = {
    ...migratedKeep,
    mergedCustomerIds,
    nif: keep.nif ?? removed.find((customer) => customer.nif)?.nif,
    email: keep.email ?? removed.find((customer) => customer.email)?.email,
    phone: keep.phone ?? removed.find((customer) => customer.phone)?.phone,
    streetType:
      keep.streetType ??
      removed.find((customer) => customer.streetType)?.streetType,
    address: keep.address ?? removed.find((customer) => customer.address)?.address,
    city: keep.city ?? removed.find((customer) => customer.city)?.city,
    postalCode:
      keep.postalCode ??
      removed.find((customer) => customer.postalCode)?.postalCode,
    notes: keep.notes ?? removed.find((customer) => customer.notes)?.notes,
    updatedAt:
      typeof mergedAt === "string" ? mergedAt : mergedAt.toISOString(),
  };

  return {
    keep: enrichedKeep,
    removed,
    customers: customers
      .filter((customer) => !uniqueRemoveIds.includes(customer.id))
      .map((customer) => (customer.id === keepId ? enrichedKeep : customer)),
  };
}

export function applyCustomerMergeToDocument(
  doc: Document,
  keep: Customer,
  removed: Customer[],
  options: MergeCustomersOptions = {},
): Document {
  const matchesRemoved = removed.some((customer) =>
    documentMatchesCustomer(doc, customer),
  );
  if (!matchesRemoved) return doc;

  const base = doc.customerId === keep.id ? doc : { ...doc, customerId: keep.id };

  if (isDocumentCustomerSnapshotProtected(doc)) {
    return base;
  }

  if (!options.updateDraftDocuments) {
    return base;
  }

  return {
    ...base,
    client: customerToClient(keep),
  };
}
