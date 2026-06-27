import { documentTotals } from "./calculations";
import {
  customerStreetSortKey,
  formatStreetLine,
  getStreetType,
  normalizeCustomerStreetFields,
} from "./customer-address";
import { isTaxableSaleDocument } from "./taxes";
import type { Client, Customer, Document } from "./types";

export function normalizeNamePart(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function customerFullName(firstName: string, lastName: string): string {
  return `${normalizeNamePart(firstName)} ${normalizeNamePart(lastName)}`.trim();
}

export function customerIdentityKey(firstName: string, lastName: string): string {
  return `${normalizeNamePart(firstName).toLowerCase()}|${normalizeNamePart(lastName).toLowerCase()}`;
}

export function getCustomerDisplayName(customer: Customer): string {
  if (customer.firstName && customer.lastName) {
    return customerFullName(customer.firstName, customer.lastName);
  }
  return customer.name ?? "";
}

function finalizeCustomerMigration(customer: Customer): Customer {
  const normalized = normalizeCustomerStreetFields(customer);
  const mergedCustomerIds = normalized.mergedCustomerIds
    ? [...new Set(normalized.mergedCustomerIds)].filter(
        (id) => id && id !== normalized.id,
      )
    : undefined;

  return {
    ...normalized,
    ...(mergedCustomerIds ? { mergedCustomerIds } : {}),
  };
}

export function migrateCustomer(raw: Customer): Customer {
  if (raw.firstName && raw.lastName) {
    return finalizeCustomerMigration({
      ...raw,
      firstName: normalizeNamePart(raw.firstName),
      lastName: normalizeNamePart(raw.lastName),
      name: customerFullName(raw.firstName, raw.lastName),
    });
  }

  const legacyName = normalizeNamePart(raw.name ?? "");
  const spaceIndex = legacyName.indexOf(" ");
  const firstName =
    spaceIndex === -1 ? legacyName : legacyName.slice(0, spaceIndex);
  const lastName =
    spaceIndex === -1 ? "" : legacyName.slice(spaceIndex + 1).trim();

  return finalizeCustomerMigration({
    ...raw,
    firstName,
    lastName,
    name: legacyName,
  });
}

export function normalizeCustomerNif(nif?: string | null): string {
  if (!nif?.trim()) return "";
  return nif.replace(/[\s.-]/g, "").toUpperCase();
}

const CUSTOMER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function normalizeCustomerEmail(email?: string | null): string {
  return email?.trim() ?? "";
}

export function normalizeCustomerPhone(phone?: string | null): string {
  return phone?.trim().replace(/\s+/g, " ") ?? "";
}

export function isValidCustomerEmail(email?: string | null): boolean {
  const value = normalizeCustomerEmail(email);
  if (!value) return true;
  return value.length <= 254 && CUSTOMER_EMAIL_PATTERN.test(value);
}

export interface CustomerContactValidation {
  ok: boolean;
  error?: string;
  email?: string;
  phone?: string;
}

export function validateCustomerContact(
  input: Pick<ClientInput, "email" | "phone">,
): CustomerContactValidation {
  const email = normalizeCustomerEmail(input.email);
  if (email && !isValidCustomerEmail(email)) {
    return { ok: false, error: "Revisa el formato del email" };
  }

  const phone = normalizeCustomerPhone(input.phone);
  return {
    ok: true,
    email: email || undefined,
    phone: phone || undefined,
  };
}

export function findCustomerByNif(
  customers: Customer[],
  nif?: string | null,
  excludeId?: string,
): Customer | undefined {
  const key = normalizeCustomerNif(nif);
  if (!key) return undefined;
  return customers.find(
    (c) =>
      c.id !== excludeId && normalizeCustomerNif(c.nif) === key,
  );
}

export function findDuplicateCustomerGroups(customers: Customer[]): Customer[][] {
  const byNif = new Map<string, Customer[]>();

  for (const customer of customers) {
    const key = normalizeCustomerNif(customer.nif);
    if (!key) continue;
    const group = byNif.get(key) ?? [];
    group.push(migrateCustomer(customer));
    byNif.set(key, group);
  }

  return [...byNif.values()].filter((group) => group.length > 1);
}

export function countDocumentsForCustomer(
  documents: Array<Pick<Document, "client"> & Partial<Pick<Document, "customerId">>>,
  customer: Customer,
): number {
  return documents.filter((doc) => documentBelongsToCustomer(doc, customer))
    .length;
}

/** Total facturado (facturas y recibos emitidos) vinculado al cliente. */
export function customerInvoicedTotal(
  documents: Document[],
  customer: Customer,
): number {
  return documents
    .filter(
      (doc) =>
        isTaxableSaleDocument(doc) &&
        documentBelongsToCustomer(doc, customer),
    )
    .reduce((sum, doc) => sum + documentTotals(doc).total, 0);
}

export type CustomerInvoicedTotals = ReadonlyMap<string, number>;

/** Totales facturados precalculados para no recorrer todos los documentos por cada cliente. */
export function buildCustomerInvoicedTotals(
  customers: Customer[],
  documents: Document[],
): CustomerInvoicedTotals {
  const byCustomerId = new Map<string, string>();
  const byNif = new Map<string, string[]>();
  const byIdentity = new Map<string, string[]>();
  const byDisplayName = new Map<string, string[]>();
  const totals = new Map<string, number>();

  const addIndex = (index: Map<string, string[]>, key: string, id: string) => {
    if (!key) return;
    const ids = index.get(key) ?? [];
    ids.push(id);
    index.set(key, ids);
  };

  for (const customer of customers) {
    const migrated = migrateCustomer(customer);
    totals.set(migrated.id, 0);
    for (const relatedId of customerReferenceIds(migrated)) {
      byCustomerId.set(relatedId, migrated.id);
    }
    addIndex(byNif, normalizeCustomerNif(migrated.nif), migrated.id);
    addIndex(
      byIdentity,
      customerIdentityKey(migrated.firstName, migrated.lastName),
      migrated.id,
    );
    addIndex(
      byDisplayName,
      getCustomerDisplayName(migrated).toLowerCase(),
      migrated.id,
    );
  }

  for (const doc of documents) {
    if (!isTaxableSaleDocument(doc)) continue;

    const matchedIds = new Set<string>();
    const customerIdMatch = doc.customerId
      ? byCustomerId.get(doc.customerId)
      : undefined;
    if (customerIdMatch) matchedIds.add(customerIdMatch);

    if (!doc.customerId || matchedIds.size === 0) {
      const nifMatches = byNif.get(normalizeCustomerNif(doc.client.nif)) ?? [];
      nifMatches.forEach((id) => matchedIds.add(id));

      if (doc.client.firstName && doc.client.lastName) {
        const identityMatches =
          byIdentity.get(
            customerIdentityKey(doc.client.firstName, doc.client.lastName),
          ) ?? [];
        identityMatches.forEach((id) => matchedIds.add(id));
      } else {
        const clientName = (doc.client.name ?? "").trim().toLowerCase();
        const nameMatches = byDisplayName.get(clientName) ?? [];
        nameMatches.forEach((id) => matchedIds.add(id));
      }
    }

    if (matchedIds.size === 0) continue;
    const total = documentTotals(doc).total;
    matchedIds.forEach((id) => {
      totals.set(id, (totals.get(id) ?? 0) + total);
    });
  }

  return totals;
}

export function clientMatchesCustomer(client: Client, customer: Customer): boolean {
  const migrated = migrateCustomer(customer);
  const customerNif = normalizeCustomerNif(migrated.nif);
  const clientNif = normalizeCustomerNif(client.nif);
  if (customerNif && clientNif && customerNif === clientNif) {
    return true;
  }

  if (client.firstName && client.lastName) {
    return (
      customerIdentityKey(client.firstName, client.lastName) ===
      customerIdentityKey(migrated.firstName, migrated.lastName)
    );
  }

  const clientName = (client.name ?? "").trim().toLowerCase();
  if (!clientName) return false;
  return getCustomerDisplayName(migrated).toLowerCase() === clientName;
}

function customerReferenceIds(customer: Customer): string[] {
  return [...new Set([customer.id, ...(customer.mergedCustomerIds ?? [])])];
}

function documentBelongsToCustomer(
  doc: Pick<Document, "client"> & Partial<Pick<Document, "customerId">>,
  customer: Customer,
): boolean {
  if (doc.customerId) {
    return customerReferenceIds(migrateCustomer(customer)).includes(
      doc.customerId,
    );
  }
  return clientMatchesCustomer(doc.client, customer);
}

export function pickCanonicalCustomer(
  group: Customer[],
  documents: Pick<Document, "client">[],
): Customer {
  return [...group].sort((a, b) => {
    const score = (customer: Customer) => {
      const migrated = migrateCustomer(customer);
      const hasNif = normalizeCustomerNif(migrated.nif) ? 10 : 0;
      const docCount = countDocumentsForCustomer(documents, migrated);
      const fields = [
        migrated.email,
        migrated.phone,
        migrated.address,
        migrated.city,
        migrated.postalCode,
      ].filter(Boolean).length;
      return hasNif * 100 + docCount * 10 + fields;
    };
    return score(b) - score(a);
  })[0];
}

export function sortCustomersByName(customers: Customer[]): Customer[] {
  return [...customers]
    .map(migrateCustomer)
    .sort((a, b) =>
      getCustomerDisplayName(a).localeCompare(getCustomerDisplayName(b), "es", {
        sensitivity: "base",
      }),
    );
}

export type CustomerSortField = "nombre" | "apellido" | "facturacion" | "direccion";
export type CustomerSortDirection = "asc" | "desc";

export const CUSTOMER_SORT_FIELD_LABELS: Record<CustomerSortField, string> = {
  nombre: "Nombre",
  apellido: "Apellidos",
  facturacion: "Volumen facturado",
  direccion: "Dirección",
};

export function customerAddressSortKey(customer: Customer): string {
  return customerStreetSortKey(migrateCustomer(customer));
}

export function customerSortDirectionLabel(
  field: CustomerSortField,
  direction: CustomerSortDirection,
): string {
  if (field === "facturacion") {
    return direction === "asc" ? "Menor a mayor" : "Mayor a menor";
  }
  return direction === "asc" ? "A → Z" : "Z → A";
}

export function sortCustomers(
  customers: Customer[],
  documents: Document[],
  field: CustomerSortField,
  direction: CustomerSortDirection,
  invoicedTotals?: CustomerInvoicedTotals,
): Customer[] {
  const factor = direction === "asc" ? 1 : -1;
  const totals =
    field === "facturacion"
      ? (invoicedTotals ?? buildCustomerInvoicedTotals(customers, documents))
      : undefined;
  const compareText = (left: string, right: string) =>
    factor *
    left.localeCompare(right, "es", {
      sensitivity: "base",
    });

  return [...customers].map(migrateCustomer).sort((a, b) => {
    switch (field) {
      case "nombre":
        return compareText(a.firstName, b.firstName);
      case "apellido":
        return compareText(a.lastName, b.lastName);
      case "direccion":
        return compareText(customerAddressSortKey(a), customerAddressSortKey(b));
      case "facturacion":
        return factor * ((totals?.get(a.id) ?? 0) - (totals?.get(b.id) ?? 0));
      default:
        return compareText(getCustomerDisplayName(a), getCustomerDisplayName(b));
    }
  });
}

export function customerToClient(customer: Customer): Client {
  const migrated = migrateCustomer(customer);

  return {
    firstName: migrated.firstName,
    lastName: migrated.lastName,
    name: getCustomerDisplayName(migrated),
    nif: migrated.nif,
    email: migrated.email,
    phone: migrated.phone,
    streetType: migrated.streetType,
    address: formatCustomerAddressBlock(migrated) || migrated.address,
  };
}

export function filterCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return sortCustomersByName(customers);

  return sortCustomersByName(customers).filter((c) => {
    const migrated = migrateCustomer(c);
    const haystack = [
      migrated.firstName,
      migrated.lastName,
      getCustomerDisplayName(migrated),
      migrated.nif,
      migrated.email,
      migrated.phone,
      getStreetType(migrated.streetType)?.label,
      formatStreetLine(migrated.streetType, migrated.address),
      migrated.address,
      migrated.city,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function findCustomerByIdentity(
  customers: Customer[],
  firstName: string,
  lastName: string,
  excludeId?: string,
): Customer | undefined {
  const key = customerIdentityKey(firstName, lastName);
  return customers.find(
    (c) =>
      c.id !== excludeId &&
      customerIdentityKey(
        migrateCustomer(c).firstName,
        migrateCustomer(c).lastName,
      ) === key,
  );
}

export function findCustomerByClient(
  customers: Customer[],
  client: Client,
): Customer | undefined {
  if (client.firstName && client.lastName) {
    const byIdentity = findCustomerByIdentity(
      customers,
      client.firstName,
      client.lastName,
    );
    if (byIdentity) return byIdentity;
  }

  const name = (client.name ?? "").trim().toLowerCase();
  if (!name) return undefined;

  const byNif = client.nif
    ? customers.find(
        (c) => c.nif && c.nif.toLowerCase() === client.nif!.toLowerCase(),
      )
    : undefined;
  if (byNif) return byNif;

  return customers.find(
    (c) => getCustomerDisplayName(migrateCustomer(c)).toLowerCase() === name,
  );
}

export interface CustomerNameValidation {
  ok: boolean;
  error?: string;
  firstName?: string;
  lastName?: string;
}

export function validateCustomerNames(
  firstName: string,
  lastName: string,
): CustomerNameValidation {
  const fn = normalizeNamePart(firstName);
  const ln = normalizeNamePart(lastName);

  if (!fn) {
    return { ok: false, error: "Añade al menos un nombre para guardar el cliente" };
  }
  if (!ln) {
    return { ok: false, error: "Añade los apellidos para guardar el cliente" };
  }
  if (fn.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 letras" };
  }
  if (ln.length < 2) {
    return { ok: false, error: "Los apellidos deben tener al menos 2 letras" };
  }

  return { ok: true, firstName: fn, lastName: ln };
}

export function validateUniqueCustomer(
  customers: Customer[],
  firstName: string,
  lastName: string,
  excludeId?: string,
  nif?: string,
): CustomerNameValidation {
  const base = validateCustomerNames(firstName, lastName);
  if (!base.ok) return base;

  const trimmedNif = nif?.trim();
  if (trimmedNif) {
    const duplicateNif = findCustomerByNif(customers, trimmedNif, excludeId);
    if (duplicateNif) {
      return {
        ok: false,
        error: `Ya existe un cliente con el NIF ${duplicateNif.nif ?? trimmedNif} (${getCustomerDisplayName(duplicateNif)}). Puedes unificar clientes desde la lista.`,
      };
    }
  }

  const duplicate = findCustomerByIdentity(
    customers,
    base.firstName!,
    base.lastName!,
    excludeId,
  );
  if (duplicate) {
    return {
      ok: false,
      error: `Ya existe un cliente llamado ${getCustomerDisplayName(duplicate)}. Los nombres y apellidos no se pueden repetir.`,
    };
  }

  return base;
}

export type CustomerInputValidation = CustomerNameValidation &
  CustomerContactValidation;

export interface ClientInput {
  firstName: string;
  lastName: string;
  nif?: string;
  email?: string;
  phone?: string;
  streetType?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
}

export function validateCustomerInput(
  customers: Customer[],
  input: ClientInput,
  excludeId?: string,
): CustomerInputValidation {
  const identity = validateUniqueCustomer(
    customers,
    input.firstName,
    input.lastName,
    excludeId,
    input.nif,
  );
  if (!identity.ok) return identity;

  const contact = validateCustomerContact(input);
  if (!contact.ok) return contact;

  return {
    ok: true,
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: contact.email,
    phone: contact.phone,
  };
}

export function formatCustomerAddressBlock(
  customer: Pick<Customer, "streetType" | "address" | "postalCode" | "city">,
): string {
  const streetLine = formatStreetLine(customer.streetType, customer.address);
  return [streetLine, [customer.postalCode, customer.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

export function customerToFormValues(customer: Customer) {
  const migrated = migrateCustomer(customer);
  return {
    firstName: migrated.firstName,
    lastName: migrated.lastName,
    nif: migrated.nif ?? "",
    email: migrated.email ?? "",
    phone: migrated.phone ?? "",
    streetType: migrated.streetType ?? "",
    address: migrated.address ?? "",
    city: migrated.city ?? "",
    postalCode: migrated.postalCode ?? "",
    notes: migrated.notes ?? "",
  };
}

export function clientInputToSnapshot(input: ClientInput): Client {
  const validation = validateCustomerNames(input.firstName, input.lastName);
  const firstName = validation.firstName ?? normalizeNamePart(input.firstName);
  const lastName = validation.lastName ?? normalizeNamePart(input.lastName);
  const addressBlock = formatCustomerAddressBlock({
    streetType: input.streetType?.trim(),
    address: input.address?.trim(),
    postalCode: input.postalCode?.trim(),
    city: input.city?.trim(),
  });

  return {
    firstName,
    lastName,
    name: customerFullName(firstName, lastName),
    nif: input.nif?.trim()
      ? normalizeCustomerNif(input.nif)
      : undefined,
    email: normalizeCustomerEmail(input.email) || undefined,
    phone: normalizeCustomerPhone(input.phone) || undefined,
    streetType: input.streetType?.trim() || undefined,
    address: addressBlock || input.address?.trim() || undefined,
  };
}

export type EnsureCustomerResult =
  | {
      ok: true;
      customer: Customer;
      created: boolean;
      client: Client;
    }
  | { ok: false; error: string };

export function ensureCustomerForDocument(
  customers: Customer[],
  input: ClientInput,
  selectedCustomerId: string | null,
): EnsureCustomerResult {
  const validation = validateCustomerInput(
    customers,
    input,
    selectedCustomerId ?? undefined,
  );
  if (!validation.ok) {
    return { ok: false, error: validation.error! };
  }

  const firstName = validation.firstName!;
  const lastName = validation.lastName!;
  const client = clientInputToSnapshot({
    ...input,
    firstName,
    lastName,
    email: validation.email,
    phone: validation.phone,
  });
  const now = new Date().toISOString();

  if (selectedCustomerId) {
    const existing = customers.find((c) => c.id === selectedCustomerId);
    if (!existing) {
      return { ok: false, error: "El cliente seleccionado ya no existe" };
    }

    const customer: Customer = {
      ...migrateCustomer(existing),
      firstName,
      lastName,
      name: customerFullName(firstName, lastName),
      nif: client.nif,
      email: client.email,
      phone: client.phone,
      streetType: input.streetType?.trim() || existing.streetType,
      address: input.address?.trim() || existing.address,
      city: input.city?.trim() || existing.city,
      postalCode: input.postalCode?.trim() || existing.postalCode,
      notes: input.notes?.trim() || existing.notes,
      updatedAt: now,
    };

    return {
      ok: true,
      customer,
      created: false,
      client: customerToClient(customer),
    };
  }

  const duplicate = findCustomerByIdentity(customers, firstName, lastName);
  if (duplicate) {
    return {
      ok: false,
      error: `Ya existe el cliente ${getCustomerDisplayName(duplicate)}. Selecciónalo de la lista en lugar de crearlo otra vez.`,
    };
  }

  const customer: Customer = {
    id: "pending",
    firstName,
    lastName,
    name: customerFullName(firstName, lastName),
    nif: client.nif,
    email: client.email,
    phone: client.phone,
    streetType: input.streetType?.trim() || undefined,
    address: input.address?.trim() || undefined,
    city: input.city?.trim() || undefined,
    postalCode: input.postalCode?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, customer, created: true, client: customerToClient(customer) };
}

export function customerPayloadFromInput(input: ClientInput) {
  const client = clientInputToSnapshot(input);
  return {
    firstName: client.firstName!,
    lastName: client.lastName!,
    name: client.name,
    nif: client.nif,
    email: client.email,
    phone: client.phone,
    streetType: input.streetType?.trim() || undefined,
    address: input.address?.trim() || undefined,
  };
}
