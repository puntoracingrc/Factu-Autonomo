import {
  clientMatchesCustomer,
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

interface DocumentCustomerLookup {
  byReferenceId: Map<string, Customer>;
  byNif: Map<string, Customer[]>;
  byLabel: Map<string, Customer[]>;
  order: Map<Customer, number>;
}

const documentCustomerLookupCache = new WeakMap<
  Customer[],
  DocumentCustomerLookup
>();

function pushCustomerLookup(
  lookup: Map<string, Customer[]>,
  key: string,
  customer: Customer,
) {
  if (!key) return;
  const matches = lookup.get(key) ?? [];
  matches.push(customer);
  lookup.set(key, matches);
}

function getDocumentCustomerLookup(
  customers: Customer[],
): DocumentCustomerLookup {
  const cached = documentCustomerLookupCache.get(customers);
  if (cached) return cached;

  const byReferenceId = new Map<string, Customer>();
  const byNif = new Map<string, Customer[]>();
  const byLabel = new Map<string, Customer[]>();
  const order = new Map<Customer, number>();

  customers.forEach((rawCustomer, index) => {
    const customer = migrateCustomer(rawCustomer);
    order.set(customer, index);
    for (const referenceId of [
      customer.id,
      ...(customer.mergedCustomerIds ?? []),
    ]) {
      if (!byReferenceId.has(referenceId)) {
        byReferenceId.set(referenceId, customer);
      }
    }
    pushCustomerLookup(byNif, normalizeCustomerNif(customer.nif), customer);
    pushCustomerLookup(
      byLabel,
      normalizeLabel(getCustomerDisplayName(customer)),
      customer,
    );
  });

  const lookup = { byReferenceId, byNif, byLabel, order };
  documentCustomerLookupCache.set(customers, lookup);
  return lookup;
}

function matchingCustomersForDocument(
  doc: Document,
  lookup: DocumentCustomerLookup,
): Customer[] {
  const candidates = new Set<Customer>();
  const nif = normalizeCustomerNif(doc.client.nif);
  for (const customer of lookup.byNif.get(nif) ?? []) {
    candidates.add(customer);
  }

  const labels = new Set([
    normalizeLabel(doc.client.name),
    normalizeLabel(doc.client.firstName),
    normalizeLabel(
      [doc.client.firstName, doc.client.lastName].filter(Boolean).join(" "),
    ),
  ]);
  for (const label of labels) {
    if (!label) continue;
    for (const customer of lookup.byLabel.get(label) ?? []) {
      candidates.add(customer);
    }
  }

  return [...candidates]
    .sort(
      (left, right) =>
        (lookup.order.get(left) ?? 0) - (lookup.order.get(right) ?? 0),
    )
    .filter((customer) => contactIdentityMatchesCustomer(doc, customer));
}

export function findLinkedCustomerForDocument(
  doc: Pick<Document, "customerId">,
  customers: Customer[],
): Customer | null {
  if (!doc.customerId) return null;
  return (
    getDocumentCustomerLookup(customers).byReferenceId.get(doc.customerId) ??
    null
  );
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
  customers: Customer[],
  field: "email" | "phone",
): string | undefined {
  const contacts = new Map<string, string>();

  customers.forEach((customer) => {
    const value = customer[field]?.trim();
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
  if (hasUsableEmail(doc.client.email) && hasUsablePhone(doc.client.phone)) {
    return doc;
  }

  const lookup = getDocumentCustomerLookup(customers);
  const migrated = doc.customerId
    ? lookup.byReferenceId.get(doc.customerId) ?? null
    : null;
  const matchingCustomers = matchingCustomersForDocument(doc, lookup);
  if (!migrated && matchingCustomers.length === 0) return doc;

  const email = hasUsableEmail(doc.client.email)
    ? doc.client.email
    : hasUsableEmail(migrated?.email)
      ? migrated?.email
      : uniqueMatchingContact(matchingCustomers, "email");
  const phone = hasUsablePhone(doc.client.phone)
    ? doc.client.phone
    : hasUsablePhone(migrated?.phone)
      ? migrated?.phone
      : uniqueMatchingContact(matchingCustomers, "phone");

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
