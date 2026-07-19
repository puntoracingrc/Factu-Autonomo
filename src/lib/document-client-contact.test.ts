import { describe, expect, it } from "vitest";
import {
  documentHasLinkedCustomerNameMismatch,
  documentWithCurrentCustomerContact,
  findLinkedCustomerForDocument,
} from "./document-client-contact";
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

  it("recupera el contacto actualizado de un duplicado histórico inequívoco", () => {
    const hydrated = documentWithCurrentCustomerContact(
      {
        ...doc,
        client: { name: "Antonio Muñoz Guerra" },
      },
      [
        {
          ...customers[0],
          id: "customer-1",
          firstName: "Antonio",
          lastName: "Muñoz Guerra",
          name: "Antonio Muñoz Guerra",
          email: undefined,
          phone: undefined,
        },
        {
          ...customers[0],
          id: "customer-current",
          firstName: "Antonio",
          lastName: "Muñoz Guerra",
          name: "Antonio Muñoz Guerra",
          email: undefined,
          phone: "612 345 678",
        },
      ],
    );

    expect(hydrated.client.phone).toBe("612 345 678");
  });

  it("no elige un contacto si los duplicados históricos discrepan", () => {
    const hydrated = documentWithCurrentCustomerContact(
      {
        ...doc,
        client: { name: "Antonio Muñoz Guerra" },
      },
      [
        {
          ...customers[0],
          id: "customer-1",
          firstName: "Antonio",
          lastName: "Muñoz Guerra",
          name: "Antonio Muñoz Guerra",
          email: undefined,
          phone: undefined,
        },
        {
          ...customers[0],
          id: "customer-a",
          firstName: "Antonio",
          lastName: "Muñoz Guerra",
          name: "Antonio Muñoz Guerra",
          email: undefined,
          phone: "612 345 678",
        },
        {
          ...customers[0],
          id: "customer-b",
          firstName: "Antonio",
          lastName: "Muñoz Guerra",
          name: "Antonio Muñoz Guerra",
          email: undefined,
          phone: "687 654 321",
        },
      ],
    );

    expect(hydrated.client.phone).toBeUndefined();
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

  it("no actualiza nombre, NIF ni dirección fiscal desde la ficha viva", () => {
    const hydrated = documentWithCurrentCustomerContact(
      {
        ...doc,
        client: {
          ...doc.client,
          nif: "11111111H",
          address: "Calle congelada 1",
        },
      },
      [
        {
          ...customers[0],
          name: "Cliente cambiado",
          firstName: "Cliente",
          lastName: "Cambiado",
          nif: "22222222J",
          address: "Direccion viva cambiada",
        },
      ],
    );

    expect(hydrated.client.name).toBe("Jordi Vinardell");
    expect(hydrated.client.nif).toBe("11111111H");
    expect(hydrated.client.address).toBe("Calle congelada 1");
    expect(hydrated.client.email).toBe("jordi@example.com");
  });

  it("resuelve enlaces hacia la ficha viva aunque el documento guarde un id absorbido", () => {
    const customer = findLinkedCustomerForDocument(
      { customerId: "customer-old" },
      [
        {
          ...customers[0],
          mergedCustomerIds: ["customer-old"],
        },
      ],
    );

    expect(customer?.id).toBe("customer-1");
  });

  it("marca documentos cuyo titular congelado no coincide con la ficha vinculada", () => {
    const mismatch = documentHasLinkedCustomerNameMismatch(
      {
        ...doc,
        client: {
          name: "Carmen Camí",
          nif: "B60422417",
        },
      },
      [
        {
          ...customers[0],
          customerType: "company",
          firstName: "Llefisa SL",
          lastName: "",
          name: "Llefisa SL",
          nif: "B60422417",
        },
      ],
    );

    expect(mismatch).toBe(true);
  });
});
