import {
  clientMatchesCustomer,
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

function uniqueMatchingContact(
  doc: Document,
  customers: Customer[],
  field: "email" | "phone",
): string | undefined {
  const contacts = new Map<string, string>();

  customers.forEach((customer) => {
    if (!clientMatchesCustomer(doc.client, customer)) return;

    const value = migrateCustomer(customer)[field]?.trim();
    if (!value) return;

    const normalized =
      field === "email"
        ? hasUsableEmail(value)
          ? value.toLowerCase()
          : null
        : normalizePhoneForWhatsApp(value);
    if (normalized && !contacts.has(normalized)) {
      contacts.set(normalized, value);
    }
  });

  return contacts.size === 1 ? [...contacts.values()][0] : undefined;
}

export function documentWithCurrentCustomerContact(
  doc: Document,
  customers: Customer[],
): Document {
  const linkedCustomer = findLinkedCustomerForDocument(doc, customers);
  const migrated = linkedCustomer ? migrateCustomer(linkedCustomer) : null;
  const hasMatchingCustomer = customers.some((customer) =>
    clientMatchesCustomer(doc.client, customer),
  );
  if (!migrated && !hasMatchingCustomer) return doc;

  const email = hasUsableEmail(doc.client.email)
    ? doc.client.email
    : hasUsableEmail(migrated?.email)
      ? migrated?.email
      : uniqueMatchingContact(doc, customers, "email");
  const phone = hasUsablePhone(doc.client.phone)
    ? doc.client.phone
    : hasUsablePhone(migrated?.phone)
      ? migrated?.phone
      : uniqueMatchingContact(doc, customers, "phone");

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
