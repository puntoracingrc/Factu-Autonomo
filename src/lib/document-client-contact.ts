import {
  findCustomerByClient,
  isValidCustomerEmail,
  migrateCustomer,
} from "./customers";
import { normalizePhoneForWhatsApp } from "./share";
import type { Customer, Document } from "./types";

function findLinkedCustomer(doc: Document, customers: Customer[]): Customer | null {
  if (!doc.customerId) return null;

  return (
    customers.map(migrateCustomer).find((customer) => {
      return (
        customer.id === doc.customerId ||
        customer.mergedCustomerIds?.includes(doc.customerId!)
      );
    }) ?? null
  );
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
  const customer = findLinkedCustomer(doc, customers) ?? findCustomerByClient(customers, doc.client);
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
