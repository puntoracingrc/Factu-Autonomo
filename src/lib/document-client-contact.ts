import {
  clientMatchesCustomer,
  findCustomerByIdOrMergedId,
  getCustomerDisplayName,
  isValidCustomerEmail,
  migrateCustomer,
  normalizeCustomerNif,
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

const DNI_CONTROL_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

function isValidSpanishPersonalTaxId(nif: string): boolean {
  const dni = nif.match(/^(\d{7,8})([A-Z])$/);
  if (dni) {
    const number = Number(dni[1].padStart(8, "0"));
    return DNI_CONTROL_LETTERS[number % 23] === dni[2];
  }

  const nie = nif.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (!nie) return false;

  const prefix = nie[1] === "X" ? "0" : nie[1] === "Y" ? "1" : "2";
  const number = Number(`${prefix}${nie[2]}`);
  return DNI_CONTROL_LETTERS[number % 23] === nie[3];
}

function isMalformedSpanishPersonalTaxId(nif: string): boolean {
  return (
    /^(?:\d{7,8}|[XYZ]\d{7})[A-Z]$/.test(nif) &&
    !isValidSpanishPersonalTaxId(nif)
  );
}

function contactIdentityMatchesCustomer(
  doc: Document,
  customer: Customer,
): boolean {
  const migrated = migrateCustomer(customer);
  const documentNif = normalizeCustomerNif(doc.client.nif);
  const customerNif = normalizeCustomerNif(migrated.nif);

  if (documentNif && customerNif) {
    if (documentNif === customerNif) return true;

    // A valid, different identity remains authoritative. Legacy imports can
    // contain truncated or mistyped personal NIFs; those must not prevent an
    // otherwise unique exact-name match from recovering current contact data.
    if (
      !isMalformedSpanishPersonalTaxId(documentNif) &&
      !isMalformedSpanishPersonalTaxId(customerNif)
    ) {
      return false;
    }
  }
  if (clientMatchesCustomer(doc.client, migrated)) return true;

  const documentName = normalizeLabel(doc.client.name);
  const customerName = normalizeLabel(getCustomerDisplayName(migrated));
  return Boolean(documentName && customerName && documentName === customerName);
}

function uniqueMatchingContact(
  doc: Document,
  customers: Customer[],
  field: "email" | "phone",
): string | undefined {
  const contacts = new Map<string, string>();

  customers.forEach((customer) => {
    if (!contactIdentityMatchesCustomer(doc, customer)) return;

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
    contactIdentityMatchesCustomer(doc, customer),
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
