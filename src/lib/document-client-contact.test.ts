import { describe, expect, it } from "vitest";
import { documentWithCurrentCustomerContact } from "./document-client-contact";
import type { Customer, Document } from "./types";

const doc: Document = {
  id: "doc-1",
  type: "factura",
  number: "Factura/2940/",
  date: "2026-06-12",
  customerId: "customer-1",
  client: {
    name: "Jordi Vinardell",
  },
  items: [],
  status: "pagado",
  createdAt: "",
  updatedAt: "",
};

const customers: Customer[] = [
  {
    id: "customer-1",
    firstName: "Jordi",
    lastName: "Vinardell",
    name: "Jordi Vinardell",
    email: "jordi@example.com",
    phone: "687454250",
    createdAt: "",
    updatedAt: "",
  },
];

describe("documentWithCurrentCustomerContact", () => {
  it("usa email y teléfono de la ficha actual si el snapshot antiguo no los tiene", () => {
    const hydrated = documentWithCurrentCustomerContact(doc, customers);

    expect(hydrated.client.email).toBe("jordi@example.com");
    expect(hydrated.client.phone).toBe("687454250");
    expect(doc.client.email).toBeUndefined();
  });

  it("no pisa un contacto válido que ya esté congelado en el documento", () => {
    const hydrated = documentWithCurrentCustomerContact(
      {
        ...doc,
        client: {
          ...doc.client,
          email: "snapshot@example.com",
          phone: "+34 600 111 222",
        },
      },
      customers,
    );

    expect(hydrated.client.email).toBe("snapshot@example.com");
    expect(hydrated.client.phone).toBe("+34 600 111 222");
  });
});
