import { describe, expect, it } from "vitest";
import { documentTotals } from "./calculations";
import {
  clientInputToSnapshot,
  ensureCustomerForDocument,
} from "./customers";
import { nextDocumentNumber } from "./storage";
import type { AppData, Document, DocumentType } from "./types";
import { EMPTY_DATA } from "./types";

function createDocument(
  type: DocumentType,
  clientName: { firstName: string; lastName: string },
  counters: AppData["counters"],
): { doc: Omit<Document, "id" | "createdAt" | "updatedAt">; counters: AppData["counters"] } {
  const { number, counters: nextCounters } = nextDocumentNumber(type, counters);
  const client = clientInputToSnapshot({
    firstName: clientName.firstName,
    lastName: clientName.lastName,
    nif: "12345678A",
  });

  return {
    counters: nextCounters,
    doc: {
      type,
      number,
      date: "2026-06-09",
      client,
      items: [
        {
          id: "line-1",
          description: "Servicio de prueba",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "borrador",
    },
  };
}

describe("flujo factura, presupuesto y recibo con clientes", () => {
  it("incorpora clientes nuevos a la base de datos al crear documentos", () => {
    let customers = [...EMPTY_DATA.customers];
    let counters = { ...EMPTY_DATA.counters };
    const documents: Document[] = [];

    const flows: Array<{
      type: DocumentType;
      firstName: string;
      lastName: string;
    }> = [
      { type: "factura", firstName: "María", lastName: "López" },
      { type: "presupuesto", firstName: "Juan", lastName: "Pérez" },
      { type: "recibo", firstName: "Elena", lastName: "Santos" },
    ];

    for (const flow of flows) {
      const ensured = ensureCustomerForDocument(
        customers,
        {
          firstName: flow.firstName,
          lastName: flow.lastName,
          nif: "11111111H",
        },
        null,
      );
      expect(ensured.ok).toBe(true);
      if (!ensured.ok) return;

      if (ensured.created) {
        customers = [
          ...customers,
          { ...ensured.customer, id: `cust-${customers.length + 1}` },
        ];
      }

      const built = createDocument(flow.type, flow, counters);
      counters = built.counters;
      documents.push({
        ...built.doc,
        id: `doc-${documents.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    expect(customers).toHaveLength(3);
    expect(documents).toHaveLength(3);
    expect(documents.map((d) => d.type)).toEqual([
      "factura",
      "presupuesto",
      "recibo",
    ]);
    expect(documents.every((d) => documentTotals(d).total > 0)).toBe(true);
  });

  it("reutiliza cliente existente al seleccionarlo", () => {
    const customers = [
      {
        id: "c1",
        firstName: "Ana",
        lastName: "García",
        name: "Ana García",
        createdAt: "",
        updatedAt: "",
      },
    ];

    const ensured = ensureCustomerForDocument(
      customers,
      { firstName: "Ana", lastName: "García", phone: "600000001" },
      "c1",
    );

    expect(ensured.ok).toBe(true);
    if (ensured.ok) {
      expect(ensured.created).toBe(false);
      expect(ensured.client.phone).toBe("600000001");
    }
  });

  it("no permite crear el mismo nombre y apellidos dos veces", () => {
    const customers = [
      {
        id: "c1",
        firstName: "Ana",
        lastName: "García",
        name: "Ana García",
        createdAt: "",
        updatedAt: "",
      },
    ];

    const duplicate = ensureCustomerForDocument(
      customers,
      { firstName: "Ana", lastName: "García" },
      null,
    );

    expect(duplicate.ok).toBe(false);
  });
});
