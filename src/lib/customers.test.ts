import { describe, expect, it } from "vitest";
import {
  customerToClient,
  filterCustomers,
  findCustomerByClient,
  sortCustomersByName,
} from "./customers";
import type { Customer } from "./types";

const sample: Customer[] = [
  {
    id: "1",
    name: "Zara Servicios",
    nif: "B11111111",
    phone: "600111111",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "2",
    name: "Ana García",
    nif: "12345678A",
    email: "ana@test.com",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "3",
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

  it("filtra por NIF", () => {
    expect(filterCustomers(sample, "B111").map((c) => c.name)).toEqual([
      "Zara Servicios",
    ]);
  });

  it("filtra por teléfono", () => {
    expect(filterCustomers(sample, "600111").map((c) => c.name)).toEqual([
      "Zara Servicios",
    ]);
  });
});

describe("customerToClient", () => {
  it("combina dirección, CP y ciudad", () => {
    const client = customerToClient(sample[2]);
    expect(client.address).toBe("Calle Mayor 1, 28001 Madrid");
  });
});

describe("findCustomerByClient", () => {
  it("encuentra por NIF", () => {
    const found = findCustomerByClient(sample, {
      name: "Otro nombre",
      nif: "12345678A",
    });
    expect(found?.name).toBe("Ana García");
  });

  it("encuentra por nombre", () => {
    const found = findCustomerByClient(sample, { name: "Zara Servicios" });
    expect(found?.id).toBe("1");
  });
});
