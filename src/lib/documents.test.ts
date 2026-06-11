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
  getDocumentReadOnlyMessage,
  getMaxSequence,
  isDocumentEditable,
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
  it("respeta el último número configurado al migrar", () => {
    const next = assignNextDocumentNumberByType([], "recibo", 2026, 99);
    expect(next.number).toBe("R-2026-0100");
  });

  it("usa el formato personalizado al crear documentos", () => {
    const numbering = {
      year: 2026,
      lastSequence: {
        factura: 0,
        factura_rectificativa: 0,
        presupuesto: 0,
        recibo: 0,
      },
      formats: {
        factura: { template: "Fact {num}", padding: 4 },
        factura_rectificativa: { template: "FR-{year}-{num}", padding: 4 },
        presupuesto: { template: "Presupuesto - {num}", padding: 4 },
        recibo: { template: "R-{year}-{num}", padding: 4 },
      },
    };

    const factura = assignNextDocumentNumberByType(
      [],
      "factura",
      2026,
      10,
      numbering,
    );
    expect(factura.number).toBe("Fact 0011");

    const presupuesto = assignNextDocumentNumberByType(
      [],
      "presupuesto",
      2026,
      0,
      numbering,
    );
    expect(presupuesto.number).toBe("Presupuesto - 0001");
  });

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
      nif: string;
    }> = [
      { type: "factura", firstName: "María", lastName: "López", nif: "11111111H" },
      { type: "presupuesto", firstName: "Juan", lastName: "Pérez", nif: "22222222J" },
      { type: "recibo", firstName: "Elena", lastName: "Santos", nif: "33333333E" },
    ];

    for (const flow of flows) {
      const ensured = ensureCustomerForDocument(
        customers,
        {
          firstName: flow.firstName,
          lastName: flow.lastName,
          nif: flow.nif,
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

describe("isDocumentEditable", () => {
  it("permite editar borradores de presupuesto y recibo", () => {
    expect(isDocumentEditable(doc("1", "presupuesto", "P-1", "Ana"))).toBe(true);
    expect(isDocumentEditable(doc("2", "recibo", "R-1", "Ana"))).toBe(true);
  });

  it("bloquea documentos enviados o rectificados", () => {
    const sent = { ...doc("3", "presupuesto", "P-2", "Ana"), status: "enviado" as const };
    const receipt = { ...doc("4", "recibo", "R-2", "Ana"), status: "pagado" as const };
    expect(isDocumentEditable(sent)).toBe(false);
    expect(isDocumentEditable(receipt)).toBe(false);
    expect(getDocumentReadOnlyMessage(sent)).toContain("presupuesto");
    expect(getDocumentReadOnlyMessage(receipt)).toContain("recibo");
  });
});
