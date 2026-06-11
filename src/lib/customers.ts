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

export function migrateCustomer(raw: Customer): Customer {
  if (raw.firstName && raw.lastName) {
    return {
      ...raw,
      firstName: normalizeNamePart(raw.firstName),
      lastName: normalizeNamePart(raw.lastName),
      name: customerFullName(raw.firstName, raw.lastName),
    };
  }

  const legacyName = normalizeNamePart(raw.name ?? "");
  const spaceIndex = legacyName.indexOf(" ");
  const firstName =
    spaceIndex === -1 ? legacyName : legacyName.slice(0, spaceIndex);
  const lastName =
    spaceIndex === -1 ? "" : legacyName.slice(spaceIndex + 1).trim();

  return {
    ...raw,
    firstName,
    lastName,
    name: legacyName,
  };
}

export function normalizeCustomerNif(nif?: string | null): string {
  if (!nif?.trim()) return "";
  return nif.replace(/[\s.-]/g, "").toUpperCase();
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
  documents: Pick<Document, "client">[],
  customer: Customer,
): number {
  return documents.filter((doc) =>
    clientMatchesCustomer(doc.client, customer),
  ).length;
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

export function customerToClient(customer: Customer): Client {
  const migrated = migrateCustomer(customer);
  const addressParts = [
    migrated.address,
    [migrated.postalCode, migrated.city].filter(Boolean).join(" "),
  ].filter(Boolean);

  return {
    firstName: migrated.firstName,
    lastName: migrated.lastName,
    name: getCustomerDisplayName(migrated),
    nif: migrated.nif,
    email: migrated.email,
    phone: migrated.phone,
    address: addressParts.length ? addressParts.join(", ") : migrated.address,
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
    return { ok: false, error: "Escribe el nombre del cliente" };
  }
  if (!ln) {
    return { ok: false, error: "Escribe los apellidos del cliente" };
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

export interface ClientInput {
  firstName: string;
  lastName: string;
  nif?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export function clientInputToSnapshot(input: ClientInput): Client {
  const validation = validateCustomerNames(input.firstName, input.lastName);
  const firstName = validation.firstName ?? normalizeNamePart(input.firstName);
  const lastName = validation.lastName ?? normalizeNamePart(input.lastName);

  return {
    firstName,
    lastName,
    name: customerFullName(firstName, lastName),
    nif: input.nif?.trim()
      ? normalizeCustomerNif(input.nif)
      : undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
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
  const validation = validateUniqueCustomer(
    customers,
    input.firstName,
    input.lastName,
    selectedCustomerId ?? undefined,
    input.nif,
  );
  if (!validation.ok) {
    return { ok: false, error: validation.error! };
  }

  const firstName = validation.firstName!;
  const lastName = validation.lastName!;
  const client = clientInputToSnapshot({ ...input, firstName, lastName });
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
      address: input.address?.trim() || existing.address,
      updatedAt: now,
    };

    return { ok: true, customer, created: false, client };
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
    address: input.address?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, customer, created: true, client };
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
    address: input.address?.trim() || undefined,
  };
}
