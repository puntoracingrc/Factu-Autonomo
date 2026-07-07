import {
  findCustomerByClient,
  findCustomerByIdOrMergedId,
  getCustomerDisplayName,
  isValidCustomerEmail,
  migrateCustomer,
} from "./customers";
import { normalizePhoneForWhatsApp } from "./share";
import type { Customer, Document } from "./types";

function normalizeLabel(value?: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findLinkedCustomerForDocument(
  doc: Pick<Document, "customerId">,
  customers: Customer[],
): Customer | null {
  return findCustomerByIdOrMergedId(customers, doc.customerId) ?? null;
}

export function documentHasLinkedCustomerNameMismatch(
  doc: Pick<Document, "customerId" | "client">,
  customers: Customer[],
): boolean {
  const customer = findLinkedCustomerForDocument(doc, customers);
  if (!customer) return false;

  const documentName = normalizeLabel(doc.client.name);
  const customerName = normalizeLabel(
    getCustomerDisplayName(migrateCustomer(customer)),
  );
  return Boolean(documentName && customerName && documentName !== customerName);
}

function hasUsableEmail(email?: string): boolean {
  return Boolean(email?.trim() && isValidCustomerEmail(email));
}

function hasUsablePhone(phone?: string): boolean {
  return Boolean(phone?.trim() && normalizePhoneForWhatsApp(phone));
}

export function documentWithCurrentCustomerContact(
  doc: Document,
  customers: Customer[],
): Document {
  const customer =
    findLinkedCustomerForDocument(doc, customers) ??
    findCustomerByClient(customers, doc.client);
  if (!customer) return doc;

  const migrated = migrateCustomer(customer);
  const email = hasUsableEmail(doc.client.email)
    ? doc.client.email
    : migrated.email;
  const phone = hasUsablePhone(doc.client.phone)
    ? doc.client.phone
    : migrated.phone;

  if (email === doc.client.email && phone === doc.client.phone) {
    return doc;
  }

  return {
    ...doc,
    client: {
      ...doc.client,
      email,
      phone,
    },
  };
}
