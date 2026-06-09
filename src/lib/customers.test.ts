import { describe, expect, it } from "vitest";
import {
  customerFullName,
  customerToClient,
  ensureCustomerForDocument,
  filterCustomers,
  findCustomerByClient,
  findCustomerByIdentity,
  migrateCustomer,
  sortCustomersByName,
  validateUniqueCustomer,
} from "./customers";
import type { Customer } from "./types";

const sample: Customer[] = [
  {
    id: "1",
    firstName: "Zara",
    lastName: "Servicios",
    name: "Zara Servicios",
    nif: "B11111111",
    phone: "600111111",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "2",
    firstName: "Ana",
    lastName: "García",
    name: "Ana García",
    nif: "12345678A",
    email: "ana@test.com",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "3",
    firstName: "Beatriz",
    lastName: "López",
    name: "Beatriz López",
    address: "Calle Mayor 1",
    city: "Madrid",
    postalCode: "28001",
    createdAt: "",
    updatedAt: "",
  },
];

describe("sortCustomersByName", () => {
  it("ordena alfabéticamente en español", () => {
    const sorted = sortCustomersByName(sample).map((c) => c.name);
    expect(sorted).toEqual(["Ana García", "Beatriz López", "Zara Servicios"]);
  });
});

describe("filterCustomers", () => {
  it("filtra por nombre", () => {
    expect(filterCustomers(sample, "ana").map((c) => c.name)).toEqual([
      "Ana García",
    ]);
  });

  it("filtra por apellidos", () => {
    expect(filterCustomers(sample, "lópez").map((c) => c.name)).toEqual([
      "Beatriz López",
    ]);
  });

  it("filtra por NIF", () => {
    expect(filterCustomers(sample, "B111").map((c) => c.name)).toEqual([
      "Zara Servicios",
    ]);
  });
});

describe("validateUniqueCustomer", () => {
  it("rechaza nombre sin apellidos", () => {
    const result = validateUniqueCustomer(sample, "Pedro", "");
    expect(result.ok).toBe(false);
  });

  it("rechaza duplicado", () => {
    const result = validateUniqueCustomer(sample, "Ana", "García");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Ya existe");
  });

  it("acepta cliente nuevo", () => {
    const result = validateUniqueCustomer(sample, "Pedro", "Martínez");
    expect(result.ok).toBe(true);
  });

  it("permite editar el mismo cliente", () => {
    const result = validateUniqueCustomer(sample, "Ana", "García", "2");
    expect(result.ok).toBe(true);
  });
});

describe("ensureCustomerForDocument", () => {
  it("crea cliente nuevo al guardar documento", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Luis",
        lastName: "Fernández",
        nif: "99999999Z",
        phone: "611222333",
      },
      null,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(true);
      expect(result.client.name).toBe("Luis Fernández");
      expect(result.client.nif).toBe("99999999Z");
    }
  });

  it("bloquea duplicado si se escribe manualmente", () => {
    const result = ensureCustomerForDocument(
      sample,
      { firstName: "Ana", lastName: "García" },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Ya existe");
    }
  });

  it("actualiza cliente seleccionado", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Ana",
        lastName: "García",
        phone: "699888777",
      },
      "2",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.customer.phone).toBe("699888777");
    }
  });
});

describe("customerToClient", () => {
  it("combina dirección, CP y ciudad", () => {
    const client = customerToClient(sample[2]);
    expect(client.address).toBe("Calle Mayor 1, 28001 Madrid");
    expect(client.firstName).toBe("Beatriz");
    expect(client.lastName).toBe("López");
  });
});

describe("migrateCustomer", () => {
  it("migra clientes antiguos con solo name", () => {
    const migrated = migrateCustomer({
      id: "x",
      name: "Carlos Ruiz",
      createdAt: "",
      updatedAt: "",
    } as Customer);
    expect(migrated.firstName).toBe("Carlos");
    expect(migrated.lastName).toBe("Ruiz");
    expect(customerFullName(migrated.firstName, migrated.lastName)).toBe(
      "Carlos Ruiz",
    );
  });
});

describe("findCustomerByClient", () => {
  it("encuentra por nombre y apellidos", () => {
    const found = findCustomerByClient(sample, {
      firstName: "Ana",
      lastName: "García",
      name: "Ana García",
    });
    expect(found?.id).toBe("2");
  });

  it("encuentra por identidad", () => {
    const found = findCustomerByIdentity(sample, "Zara", "Servicios");
    expect(found?.id).toBe("1");
  });
});
