import { documentAmounts } from "./vat-regime";
import {
  customerStreetSortKey,
  formatAddressBlock,
  formatAddressExtra,
  formatStreetLine,
  getStreetType,
  normalizeCustomerStreetFields,
  normalizeResidenceType,
} from "./customer-address";
import { taxableSaleDocumentsForPeriod } from "./taxes";
import { isDocumentUsableForFinancialCalculations } from "./document-integrity/legacy-import-attestation";
import { withDocumentFinancialIntegritySignals } from "./document-integrity/financial-documents";
import {
  isValidContactEmail,
  normalizeContactEmail,
  normalizeContactPhone,
} from "./contact-validation";
import type {
  AddressResidenceType,
  Client,
  Customer,
  CustomerType,
  Document,
} from "./types";

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  person: "Particular",
  company: "Empresa",
};

export function normalizeNamePart(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCustomerType(
  value?: CustomerType | string | null,
): CustomerType {
  return value === "company" ? "company" : "person";
}

const SPANISH_COMPANY_NIF_PATTERN = /^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$/;
const COMPANY_NAME_PATTERN =
  /\b(S\.?\s*L\.?\s*U?\.?|SLU|SL|S\.?\s*A\.?|SA|S\.?\s*C\.?\s*P\.?|SCP|C\.?\s*B\.?|CB|S\.?\s*COOP\.?|SCCL|UTE)\b|\bSOCIEDAD\s+(LIMITADA|AN[OÓ]NIMA|COOPERATIVA)\b|\b(COMUNIDAD|ASOCIACI[OÓ]N|FUNDACI[OÓ]N|AYUNTAMIENTO|COOPERATIVA)\b/i;

export function looksLikeCompanyName(value?: string | null): boolean {
  return COMPANY_NAME_PATTERN.test(normalizeNamePart(value ?? ""));
}

export function isSpanishCompanyTaxId(nif?: string | null): boolean {
  return SPANISH_COMPANY_NIF_PATTERN.test(normalizeCustomerNif(nif));
}

export function inferCustomerTypeFromIdentity(input: {
  customerType?: CustomerType | string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  nif?: string | null;
}): CustomerType {
  if (input.customerType === "company") return "company";
  if (isSpanishCompanyTaxId(input.nif)) return "company";
  if (
    looksLikeCompanyName(
      [input.name, input.firstName, input.lastName].filter(Boolean).join(" "),
    )
  ) {
    return "company";
  }
  return "person";
}

export function customerFullName(firstName: string, lastName: string): string {
  return `${normalizeNamePart(firstName)} ${normalizeNamePart(lastName)}`.trim();
}

export function customerIdentityKey(firstName: string, lastName: string): string {
  return `${normalizeNamePart(firstName).toLowerCase()}|${normalizeNamePart(lastName).toLowerCase()}`;
}

function customerNameForType(
  customerType: CustomerType,
  firstName: string,
  lastName: string,
): string {
  const first = normalizeNamePart(firstName);
  const last = customerType === "company" ? "" : normalizeNamePart(lastName);
  return customerType === "company" ? first : customerFullName(first, last);
}

function customerIdentityKeyForType(
  customerType: CustomerType,
  firstName: string,
  lastName: string,
): string {
  const type = normalizeCustomerType(customerType);
  if (type === "company") {
    return `company|${normalizeNamePart(firstName).toLowerCase()}`;
  }
  return `person|${customerIdentityKey(firstName, lastName)}`;
}

export function getCustomerDisplayName(customer: Customer): string {
  const migratedType = normalizeCustomerType(customer.customerType);
  if (migratedType === "company") {
    return normalizeNamePart(customer.name || customer.firstName);
  }
  if (customer.firstName && customer.lastName) {
    return customerFullName(customer.firstName, customer.lastName);
  }
  return customer.name ?? "";
}

function finalizeCustomerMigration(customer: Customer): Customer {
  const normalized = normalizeCustomerStreetFields(customer);
  const residenceType = normalizeResidenceType(normalized.residenceType);
  const addressExtra = formatAddressExtra(
    residenceType,
    normalized.addressExtra,
  );
  const mergedCustomerIds = normalized.mergedCustomerIds
    ? [...new Set(normalized.mergedCustomerIds)].filter(
        (id) => id && id !== normalized.id,
      )
    : undefined;

  return {
    ...normalized,
    residenceType,
    addressExtra: addressExtra || undefined,
    ...(mergedCustomerIds ? { mergedCustomerIds } : {}),
  };
}

export function migrateCustomer(raw: Customer): Customer {
  const customerType = inferCustomerTypeFromIdentity(raw);

  if (customerType === "company") {
    const name = normalizeNamePart(
      raw.name || raw.firstName || customerFullName(raw.firstName ?? "", raw.lastName ?? ""),
    );
    return finalizeCustomerMigration({
      ...raw,
      customerType,
      firstName: name,
      lastName: "",
      name,
      contactName: normalizeNamePart(raw.contactName ?? "") || undefined,
    });
  }

  if (raw.firstName) {
    const firstName = normalizeNamePart(raw.firstName);
    const lastName = normalizeNamePart(raw.lastName ?? "");
    return finalizeCustomerMigration({
      ...raw,
      customerType,
      firstName,
      lastName,
      name: customerFullName(firstName, lastName),
      contactName: undefined,
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
    customerType,
    firstName,
    lastName,
    name: legacyName,
    contactName: undefined,
  });
}

export function normalizeCustomerNif(nif?: string | null): string {
  if (!nif?.trim()) return "";
  return nif.replace(/[\s.-]/g, "").toUpperCase();
}

function normalizeComparableCustomerText(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clientComparableName(client: Client): string {
  const type = normalizeCustomerType(client.customerType);
  if (type === "company") {
    return normalizeComparableCustomerText(client.name || client.firstName);
  }
  if (client.firstName && client.lastName) {
    return normalizeComparableCustomerText(
      customerFullName(client.firstName, client.lastName),
    );
  }
  return normalizeComparableCustomerText(client.name || client.firstName);
}

function customerComparableName(customer: Customer): string {
  return normalizeComparableCustomerText(getCustomerDisplayName(customer));
}

export function normalizeCustomerEmail(email?: string | null): string {
  return normalizeContactEmail(email);
}

export function normalizeCustomerPhone(phone?: string | null): string {
  return normalizeContactPhone(phone);
}

export function isValidCustomerEmail(email?: string | null): boolean {
  return isValidContactEmail(email);
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

export function findCustomerByIdOrMergedId(
  customers: Customer[],
  customerId?: string | null,
): Customer | undefined {
  if (!customerId) return undefined;

  return customers.map(migrateCustomer).find((customer) => {
    return (
      customer.id === customerId ||
      customer.mergedCustomerIds?.includes(customerId)
    );
  });
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

function invoicedDocumentAmount(document: Document): number {
  const claimsProtectedEvidence = Boolean(
    document.documentLifecycle === "issued" ||
      document.documentLifecycle === "canceled" ||
      document.integrityLock === "locked" ||
      document.issuedAt ||
      document.documentSnapshot ||
      document.pdfSnapshot ||
      document.snapshotSeal ||
      document.legacyImportAttestation,
  );
  if (
    claimsProtectedEvidence &&
    !isDocumentUsableForFinancialCalculations(document)
  ) {
    return 0;
  }
  return documentAmounts(document, false).total;
}

/** Total facturado (facturas y recibos emitidos) vinculado al cliente. */
export function customerInvoicedTotal(
  documents: Document[],
  customer: Customer,
): number {
  const integrityCheckedDocuments =
    withDocumentFinancialIntegritySignals(documents);
  return taxableSaleDocumentsForPeriod(integrityCheckedDocuments)
    .documents
    .filter(
      (doc) => documentBelongsToCustomer(doc, customer),
    )
    .reduce((sum, doc) => sum + invoicedDocumentAmount(doc), 0);
}

export type CustomerInvoicedTotals = ReadonlyMap<string, number>;

/** Totales facturados precalculados para no recorrer todos los documentos por cada cliente. */
export function buildCustomerInvoicedTotals(
  customers: Customer[],
  documents: Document[],
): CustomerInvoicedTotals {
  const integrityCheckedDocuments =
    withDocumentFinancialIntegritySignals(documents);
  const canonicalInvoicedDocuments = taxableSaleDocumentsForPeriod(
    integrityCheckedDocuments,
  ).documents;
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

  for (const doc of canonicalInvoicedDocuments) {
    const matchedIds = new Set<string>();
    const customerIdMatch = doc.customerId
      ? byCustomerId.get(doc.customerId)
      : undefined;
    if (customerIdMatch) matchedIds.add(customerIdMatch);

    if (!doc.customerId || matchedIds.size === 0) {
      const nifMatches = byNif.get(normalizeCustomerNif(doc.client.nif)) ?? [];
      nifMatches.forEach((id) => {
        const customer = customers.find((candidate) => candidate.id === id);
        if (customer && clientMatchesCustomer(doc.client, customer)) {
          matchedIds.add(id);
        }
      });

      if (doc.client.firstName && doc.client.lastName) {
        const identityMatches =
          byIdentity.get(
            customerIdentityKey(doc.client.firstName, doc.client.lastName),
          ) ?? [];
        identityMatches.forEach((id) => {
          const customer = customers.find((candidate) => candidate.id === id);
          if (customer && clientMatchesCustomer(doc.client, customer)) {
            matchedIds.add(id);
          }
        });
      } else {
        const clientName = (doc.client.name ?? "").trim().toLowerCase();
        const nameMatches = byDisplayName.get(clientName) ?? [];
        nameMatches.forEach((id) => {
          const customer = customers.find((candidate) => candidate.id === id);
          if (customer && clientMatchesCustomer(doc.client, customer)) {
            matchedIds.add(id);
          }
        });
      }
    }

    if (matchedIds.size === 0) continue;
    const total = invoicedDocumentAmount(doc);
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
    const clientName = clientComparableName(client);
    const customerName = customerComparableName(migrated);
    return !clientName || !customerName || clientName === customerName;
  }
  if (customerNif && clientNif) return false;

  const clientType = normalizeCustomerType(client.customerType);
  const customerType = normalizeCustomerType(migrated.customerType);
  if (clientType === "company" || customerType === "company") {
    const clientName = (client.name ?? client.firstName ?? "").trim().toLowerCase();
    const customerName = getCustomerDisplayName(migrated).toLowerCase();
    return Boolean(clientName && clientName === customerName);
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
        migrated.addressExtra,
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

export type CustomerSortField =
  | "reciente"
  | "nombre"
  | "apellido"
  | "facturacion"
  | "direccion";
export type CustomerSortDirection = "asc" | "desc";

export function customerListWindow(
  customers: Customer[],
  visibleCount: number,
): { visible: Customer[]; hiddenCount: number } {
  const safeCount = Number.isFinite(visibleCount)
    ? Math.max(0, Math.floor(visibleCount))
    : 0;
  const visible = customers.slice(0, safeCount);
  return {
    visible,
    hiddenCount: Math.max(customers.length - visible.length, 0),
  };
}

export const CUSTOMER_SORT_FIELD_LABELS: Record<CustomerSortField, string> = {
  reciente: "Últimos añadidos",
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
  if (field === "reciente") {
    return direction === "asc" ? "Más antiguos primero" : "Más nuevos primero";
  }
  if (field === "facturacion") {
    return direction === "asc" ? "Menor a mayor" : "Mayor a menor";
  }
  return direction === "asc" ? "A → Z" : "Z → A";
}

function customerCreatedAtTime(customer: Customer): number {
  const time = new Date(customer.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
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
  const compareDisplayName = (left: Customer, right: Customer) =>
    getCustomerDisplayName(left).localeCompare(getCustomerDisplayName(right), "es", {
      sensitivity: "base",
    });

  return [...customers].map(migrateCustomer).sort((a, b) => {
    switch (field) {
      case "reciente": {
        const byDate = factor * (customerCreatedAtTime(a) - customerCreatedAtTime(b));
        return byDate || compareDisplayName(a, b);
      }
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
    customerType: normalizeCustomerType(migrated.customerType),
    firstName: migrated.firstName,
    lastName: migrated.lastName,
    name: getCustomerDisplayName(migrated),
    contactName: migrated.contactName,
    nif: migrated.nif,
    email: migrated.email,
    phone: migrated.phone,
    streetType: migrated.streetType,
    residenceType: migrated.residenceType,
    addressExtra: migrated.addressExtra,
    address: formatCustomerAddressBlock(migrated) || migrated.address,
    city: migrated.city?.trim() || undefined,
    postalCode: migrated.postalCode?.trim() || undefined,
  };
}

export function filterCustomers(customers: Customer[], query: string): Customer[] {
  const q = normalizeComparableCustomerText(query);
  if (!q) return sortCustomersByName(customers);
  const queryTokens = q.split(" ").filter(Boolean);
  const compactQuery = q.replace(/\s/g, "");

  return sortCustomersByName(customers).filter((c) => {
    const migrated = migrateCustomer(c);
    const haystack = [
      CUSTOMER_TYPE_LABELS[normalizeCustomerType(migrated.customerType)],
      migrated.firstName,
      migrated.lastName,
      migrated.contactName,
      getCustomerDisplayName(migrated),
      migrated.nif,
      migrated.email,
      migrated.phone,
      getStreetType(migrated.streetType)?.label,
      formatStreetLine(migrated.streetType, migrated.address),
      migrated.address,
      migrated.addressExtra,
      migrated.city,
      migrated.postalCode,
    ]
      .filter(Boolean)
      .map((value) => normalizeComparableCustomerText(String(value)))
      .join(" ");
    const compactHaystack = haystack.replace(/\s/g, "");
    return (
      queryTokens.every((token) => haystack.includes(token)) ||
      Boolean(compactQuery && compactHaystack.includes(compactQuery))
    );
  });
}

export function findCustomerByIdentity(
  customers: Customer[],
  firstName: string,
  lastName: string,
  excludeId?: string,
  customerType: CustomerType = "person",
): Customer | undefined {
  const type = normalizeCustomerType(customerType);
  if (!normalizeNamePart(firstName)) {
    return undefined;
  }
  const key = customerIdentityKeyForType(type, firstName, lastName);
  return customers.find(
    (c) => {
      const migrated = migrateCustomer(c);
      return (
        c.id !== excludeId &&
        customerIdentityKeyForType(
          normalizeCustomerType(migrated.customerType),
          migrated.firstName,
          migrated.lastName,
        ) === key
      );
    },
  );
}

export function findCustomerByClient(
  customers: Customer[],
  client: Client,
): Customer | undefined {
  const byNif = client.nif
    ? customers.find(
        (c) =>
          normalizeCustomerNif(c.nif) === normalizeCustomerNif(client.nif) &&
          clientMatchesCustomer(client, c),
      )
    : undefined;
  if (byNif) return byNif;
  return customers.find((customer) => clientMatchesCustomer(client, customer));
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
  customerType: CustomerType = "person",
): CustomerNameValidation {
  const type = normalizeCustomerType(customerType);
  const fn = normalizeNamePart(firstName);
  const ln = type === "company" ? "" : normalizeNamePart(lastName);

  if (!fn) {
    return {
      ok: false,
      error:
        type === "company"
          ? "Añade la razón social para guardar la empresa"
          : "Añade al menos un nombre para guardar el cliente",
    };
  }
  if (fn.length < 2) {
    return {
      ok: false,
      error:
        type === "company"
          ? "La razón social debe tener al menos 2 letras"
          : "El nombre debe tener al menos 2 letras",
    };
  }
  if (type === "person" && ln && ln.length < 2) {
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
  customerType: CustomerType = "person",
): CustomerNameValidation {
  const type = normalizeCustomerType(customerType);
  const base = validateCustomerNames(firstName, lastName, type);
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

  if (type === "company" || base.firstName) {
    const duplicate = findCustomerByIdentity(
      customers,
      base.firstName!,
      base.lastName ?? "",
      excludeId,
      type,
    );
    if (duplicate) {
      return {
        ok: false,
        error:
          type === "company"
            ? `Ya existe una empresa llamada ${getCustomerDisplayName(duplicate)}.`
            : `Ya existe un cliente llamado ${getCustomerDisplayName(duplicate)}. Los nombres y apellidos no se pueden repetir.`,
      };
    }
  }

  return base;
}

export type CustomerInputValidation = CustomerNameValidation &
  CustomerContactValidation;

export interface ClientInput {
  customerType?: CustomerType;
  firstName: string;
  lastName: string;
  contactName?: string;
  nif?: string;
  email?: string;
  phone?: string;
  streetType?: string;
  residenceType?: AddressResidenceType;
  address?: string;
  addressExtra?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
}

export function validateCustomerInput(
  customers: Customer[],
  input: ClientInput,
  excludeId?: string,
): CustomerInputValidation {
  const customerType = normalizeCustomerType(input.customerType);
  const identity = validateUniqueCustomer(
    customers,
    input.firstName,
    input.lastName,
    excludeId,
    input.nif,
    customerType,
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
  customer: Pick<
    Customer,
    "streetType" | "address" | "addressExtra" | "residenceType" | "postalCode" | "city"
  >,
): string {
  return formatAddressBlock(customer);
}

export function customerToFormValues(customer: Customer) {
  const migrated = migrateCustomer(customer);
  return {
    customerType: normalizeCustomerType(migrated.customerType),
    firstName: migrated.firstName,
    lastName: migrated.lastName,
    contactName: migrated.contactName ?? "",
    nif: migrated.nif ?? "",
    email: migrated.email ?? "",
    phone: migrated.phone ?? "",
    streetType: migrated.streetType ?? "",
    residenceType: normalizeResidenceType(migrated.residenceType),
    address: migrated.address ?? "",
    addressExtra: migrated.addressExtra ?? "",
    city: migrated.city ?? "",
    postalCode: migrated.postalCode ?? "",
    notes: migrated.notes ?? "",
  };
}

export function clientInputToSnapshot(input: ClientInput): Client {
  const customerType = normalizeCustomerType(input.customerType);
  const validation = validateCustomerNames(
    input.firstName,
    input.lastName,
    customerType,
  );
  const firstName = validation.firstName ?? normalizeNamePart(input.firstName);
  const lastName =
    customerType === "company"
      ? ""
      : (validation.lastName ?? normalizeNamePart(input.lastName));
  const name = customerNameForType(customerType, firstName, lastName);
  const contactName =
    customerType === "company"
      ? normalizeNamePart(input.contactName ?? "") || undefined
      : undefined;
  const residenceType = normalizeResidenceType(input.residenceType);
  const addressExtra = formatAddressExtra(residenceType, input.addressExtra);
  const addressBlock = formatCustomerAddressBlock({
    streetType: input.streetType?.trim(),
    address: input.address?.trim(),
    residenceType,
    addressExtra,
    postalCode: input.postalCode?.trim(),
    city: input.city?.trim(),
  });

  return {
    customerType,
    firstName,
    lastName,
    name,
    contactName,
    nif: input.nif?.trim()
      ? normalizeCustomerNif(input.nif)
      : undefined,
    email: normalizeCustomerEmail(input.email) || undefined,
    phone: normalizeCustomerPhone(input.phone) || undefined,
    streetType: input.streetType?.trim() || undefined,
    residenceType,
    addressExtra: addressExtra || undefined,
    address: addressBlock || input.address?.trim() || undefined,
    city: input.city?.trim() || undefined,
    postalCode: input.postalCode?.trim() || undefined,
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

function findReusableCustomerForDocumentInput(
  customers: Customer[],
  input: ClientInput,
  selectedCustomerId: string | null,
): Customer | undefined {
  if (selectedCustomerId) {
    return customers.find((customer) => customer.id === selectedCustomerId);
  }

  const customerType = normalizeCustomerType(input.customerType);
  const firstName = normalizeNamePart(input.firstName);
  const lastName =
    customerType === "company" ? "" : normalizeNamePart(input.lastName);
  const byNif = input.nif?.trim()
    ? customers.find((customer) =>
        clientMatchesCustomer(
          {
            customerType,
            firstName,
            lastName,
            name: customerNameForType(customerType, firstName, lastName),
            nif: input.nif,
          },
          customer,
        ),
      )
    : undefined;
  if (byNif) return byNif;

  if (!firstName) return undefined;

  return findCustomerByIdentity(
    customers,
    firstName,
    lastName,
    undefined,
    customerType,
  );
}

export function ensureCustomerForDocument(
  customers: Customer[],
  input: ClientInput,
  selectedCustomerId: string | null,
  options?: { now?: string },
): EnsureCustomerResult {
  const reusableCustomer = findReusableCustomerForDocumentInput(
    customers,
    input,
    selectedCustomerId,
  );
  const effectiveSelectedCustomerId =
    selectedCustomerId ?? reusableCustomer?.id ?? null;
  const validation = validateCustomerInput(
    customers,
    input,
    effectiveSelectedCustomerId ?? undefined,
  );
  if (!validation.ok) {
    return { ok: false, error: validation.error! };
  }

  const firstName = validation.firstName!;
  const customerType = normalizeCustomerType(input.customerType);
  const lastName = customerType === "company" ? "" : validation.lastName!;
  const residenceType = normalizeResidenceType(input.residenceType);
  const addressExtra = formatAddressExtra(residenceType, input.addressExtra);
  const client = clientInputToSnapshot({
    ...input,
    customerType,
    firstName,
    lastName,
    email: validation.email,
    phone: validation.phone,
  });
  const now = options?.now ?? new Date().toISOString();

  if (effectiveSelectedCustomerId) {
    const existing =
      reusableCustomer ??
      customers.find((c) => c.id === effectiveSelectedCustomerId);
    if (!existing) {
      return { ok: false, error: "El cliente seleccionado ya no existe" };
    }

    const customer: Customer = {
      ...migrateCustomer(existing),
      customerType,
      firstName,
      lastName,
      name: customerNameForType(customerType, firstName, lastName),
      contactName: client.contactName,
      nif: client.nif,
      email: client.email,
      phone: client.phone,
      streetType: input.streetType?.trim() || undefined,
      residenceType,
      addressExtra: addressExtra || undefined,
      address: input.address?.trim() || undefined,
      city: input.city?.trim() || undefined,
      postalCode: input.postalCode?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      updatedAt: now,
    };

    return {
      ok: true,
      customer,
      created: false,
      client: customerToClient(customer),
    };
  }

  if (customerType === "company" || firstName) {
    const duplicate = findCustomerByIdentity(
      customers,
      firstName,
      lastName,
      undefined,
      customerType,
    );
    if (duplicate) {
      return {
        ok: false,
        error: `Ya existe el cliente ${getCustomerDisplayName(duplicate)}. Selecciónalo de la lista en lugar de crearlo otra vez.`,
      };
    }
  }

  const customer: Customer = {
    id: "pending",
    customerType,
    firstName,
    lastName,
    name: customerNameForType(customerType, firstName, lastName),
    contactName: client.contactName,
    nif: client.nif,
    email: client.email,
    phone: client.phone,
    streetType: input.streetType?.trim() || undefined,
    residenceType,
    addressExtra: addressExtra || undefined,
    address: input.address?.trim() || undefined,
    city: input.city?.trim() || undefined,
    postalCode: input.postalCode?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, customer, created: true, client: customerToClient(customer) };
}

export type CustomerCollectionWriteResult =
  | { ok: true; customers: Customer[]; customer: Customer }
  | { ok: false; error: string };

export function createCustomerInCollection(
  customers: Customer[],
  customer: Omit<Customer, "id" | "createdAt" | "updatedAt">,
  id: string,
  now: string,
): CustomerCollectionWriteResult {
  const validation = validateCustomerInput(customers, customer);
  if (!validation.ok) {
    return { ok: false, error: validation.error ?? "Revisa los datos del cliente" };
  }

  const created = migrateCustomer({
    ...customer,
    firstName: validation.firstName ?? customer.firstName,
    lastName: validation.lastName ?? customer.lastName,
    email: validation.email,
    phone: validation.phone,
    id,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, customers: [...customers, created], customer: created };
}

export function updateCustomerInCollection(
  customers: Customer[],
  customer: Customer,
  now: string,
): CustomerCollectionWriteResult {
  if (!customers.some((candidate) => candidate.id === customer.id)) {
    return { ok: false, error: "El cliente ya no existe" };
  }
  const validation = validateCustomerInput(customers, customer, customer.id);
  if (!validation.ok) {
    return { ok: false, error: validation.error ?? "Revisa los datos del cliente" };
  }

  const updated = migrateCustomer({
    ...customer,
    firstName: validation.firstName ?? customer.firstName,
    lastName: validation.lastName ?? customer.lastName,
    email: validation.email,
    phone: validation.phone,
    updatedAt: now,
  });
  return {
    ok: true,
    customers: customers.map((candidate) =>
      candidate.id === updated.id ? updated : candidate,
    ),
    customer: updated,
  };
}

export type CustomerDocumentUpsertResult =
  | {
      ok: true;
      customers: Customer[];
      customerId: string;
      client: Client;
    }
  | { ok: false; error: string };

export function upsertCustomerForDocumentInCollection(
  customers: Customer[],
  input: ClientInput,
  selectedCustomerId: string | null,
  id: string,
  now: string,
): CustomerDocumentUpsertResult {
  const result = ensureCustomerForDocument(customers, input, selectedCustomerId, {
    now,
  });
  if (!result.ok) return result;

  const customer = result.created ? { ...result.customer, id } : result.customer;
  return {
    ok: true,
    customers: result.created
      ? [...customers, customer]
      : customers.map((candidate) =>
          candidate.id === customer.id ? customer : candidate,
        ),
    customerId: customer.id,
    client: customerToClient(customer),
  };
}

export function customerPayloadFromInput(input: ClientInput) {
  const client = clientInputToSnapshot(input);
  return {
    customerType: client.customerType,
    firstName: client.firstName!,
    lastName: client.lastName!,
    name: client.name,
    contactName: client.contactName,
    nif: client.nif,
    email: client.email,
    phone: client.phone,
    streetType: input.streetType?.trim() || undefined,
    residenceType: normalizeResidenceType(input.residenceType),
    addressExtra:
      formatAddressExtra(input.residenceType, input.addressExtra) || undefined,
    address: input.address?.trim() || undefined,
  };
}
