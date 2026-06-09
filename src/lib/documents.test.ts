import { describe, expect, it } from "vitest";
import { documentTotals } from "./calculations";
import {
  clientInputToSnapshot,
  ensureCustomerForDocument,
} from "./customers";
import {
  assignNextDocumentNumberByType,
  filterDocumentsByQuery,
  formatDocumentNumber,
  getMaxSequence,
  renumberDocumentsForTypeYear,
} from "./documents";
import type { Document, DocumentType } from "./types";
import { EMPTY_DATA } from "./types";

function doc(
  id: string,
  type: DocumentType,
  number: string,
  clientName: string,
): Document {
  return {
    id,
    type,
    number,
    date: "2026-06-09",
    client: { name: clientName, firstName: clientName.split(" ")[0], lastName: clientName.split(" ").slice(1).join(" ") },
    items: [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    createdAt: "",
    updatedAt: "",
  };
}

describe("numeración automática", () => {
  it("asigna el siguiente número correlativo", () => {
    const documents = [
      doc("1", "factura", "F-2026-0001", "Ana García"),
      doc("2", "factura", "F-2026-0002", "Luis Pérez"),
    ];
    const next = assignNextDocumentNumberByType(documents, "factura", 2026);
    expect(next.number).toBe("F-2026-0003");
    expect(next.sequence).toBe(3);
  });

  it("renumerar al borrar para que cuadre la secuencia", () => {
    const documents = [
      doc("1", "factura", "F-2026-0001", "Ana García"),
      doc("2", "factura", "F-2026-0002", "Luis Pérez"),
      doc("3", "factura", "F-2026-0003", "Elena Santos"),
    ];

    const remaining = documents.filter((d) => d.id !== "2");
    const renumbered = renumberDocumentsForTypeYear(remaining, "factura", 2026);

    expect(renumbered.map((d) => d.number)).toEqual([
      "F-2026-0001",
      "F-2026-0002",
    ]);
    expect(getMaxSequence(renumbered, "factura", 2026)).toBe(2);

    const nextAfterDelete = assignNextDocumentNumberByType(
      renumbered,
      "factura",
      2026,
    );
    expect(nextAfterDelete.number).toBe("F-2026-0003");
  });

  it("mantiene numeración separada por tipo", () => {
    const documents = [
      doc("1", "factura", "F-2026-0001", "Ana"),
      doc("2", "presupuesto", "P-2026-0001", "Ana"),
      doc("3", "recibo", "R-2026-0001", "Ana"),
    ];

    expect(
      assignNextDocumentNumberByType(documents, "factura", 2026).number,
    ).toBe("F-2026-0002");
    expect(
      assignNextDocumentNumberByType(documents, "presupuesto", 2026).number,
    ).toBe("P-2026-0002");
    expect(
      assignNextDocumentNumberByType(documents, "recibo", 2026).number,
    ).toBe("R-2026-0002");
  });

  it("formatea números con ceros a la izquierda", () => {
    expect(formatDocumentNumber("recibo", 2026, 12)).toBe("R-2026-0012");
  });
});

describe("buscador de documentos", () => {
  const documents = [
    doc("1", "factura", "F-2026-0001", "Ana García"),
    doc("2", "factura", "F-2026-0002", "Luis Pérez"),
    doc("3", "factura", "F-2026-0010", "María López"),
  ];

  it("busca por número", () => {
    expect(filterDocumentsByQuery(documents, "0002")).toHaveLength(1);
    expect(filterDocumentsByQuery(documents, "F-2026-0010")[0].client.name).toBe(
      "María López",
    );
  });

  it("busca por cliente", () => {
    expect(filterDocumentsByQuery(documents, "garcía")).toHaveLength(1);
    expect(filterDocumentsByQuery(documents, "Luis")).toHaveLength(1);
  });
});

describe("flujo factura, presupuesto y recibo con clientes", () => {
  it("incorpora clientes nuevos a la base de datos al crear documentos", () => {
    let customers = [...EMPTY_DATA.customers];
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

      const { number } = assignNextDocumentNumberByType(
        documents,
        flow.type,
        2026,
      );
      documents.push({
        id: `doc-${documents.length + 1}`,
        type: flow.type,
        number,
        date: "2026-06-09",
        client: clientInputToSnapshot({
          firstName: flow.firstName,
          lastName: flow.lastName,
          nif: "12345678A",
        }),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    expect(customers).toHaveLength(3);
    expect(documents).toHaveLength(3);
    expect(documents.map((d) => d.number)).toEqual([
      "F-2026-0001",
      "P-2026-0001",
      "R-2026-0001",
    ]);
    expect(documents.every((d) => documentTotals(d).total > 0)).toBe(true);
  });
});
