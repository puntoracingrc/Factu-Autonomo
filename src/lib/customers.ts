import type { Client, Customer } from "./types";

export function sortCustomersByName(customers: Customer[]): Customer[] {
  return [...customers].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
}

export function customerToClient(customer: Customer): Client {
  const addressParts = [
    customer.address,
    [customer.postalCode, customer.city].filter(Boolean).join(" "),
  ].filter(Boolean);
  return {
    name: customer.name,
    nif: customer.nif,
    email: customer.email,
    phone: customer.phone,
    address: addressParts.length ? addressParts.join(", ") : undefined,
  };
}

export function filterCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return sortCustomersByName(customers);

  return sortCustomersByName(customers).filter((c) => {
    const haystack = [c.name, c.nif, c.email, c.phone, c.address, c.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function findCustomerByClient(
  customers: Customer[],
  client: Client,
): Customer | undefined {
  const name = client.name.trim().toLowerCase();
  if (!name) return undefined;

  const byNif = client.nif
    ? customers.find(
        (c) => c.nif && c.nif.toLowerCase() === client.nif!.toLowerCase(),
      )
    : undefined;
  if (byNif) return byNif;

  return customers.find((c) => c.name.trim().toLowerCase() === name);
}
