import { describe, expect, it } from "vitest";
import { documentTotals } from "./calculations";
import { ensureCustomerForDocument } from "./customers";
import {
  assignNextDocumentNumberByType,
  compareDocumentsByNumberDesc,
  compareDocumentsByNewest,
  DRAFT_INVOICE_NUMBER,
  filterDocumentsByQuery,
  formatDocumentNumber,
  getDocumentReadOnlyMessage,
  getMaxSequence,
  isDraftInvoiceNumber,
  isDocumentEditable,
  renumberDocumentsForKindYear,
  renumberDocumentsForTypeYear,
  shouldUseDraftInvoiceNumber,
  sortDocumentsByNumberDesc,
  sortDocumentsByNewest,
} from "./documents";
import { issueDocument } from "./document-integrity";
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
  it("usa un número provisional para facturas en borrador sin consumir secuencia", () => {
    const draft = doc("draft", "factura", DRAFT_INVOICE_NUMBER, "Ana García");
    const issued = issueDocument(
      doc("issued", "factura", "F-2026-0001", "Luis Pérez"),
      EMPTY_DATA.profile,
      "2026-06-24T10:00:00.000Z",
    );

    expect(isDraftInvoiceNumber(draft)).toBe(true);
    expect(shouldUseDraftInvoiceNumber(draft)).toBe(true);
    expect(getMaxSequence([draft, issued], "factura", 2026)).toBe(1);
    expect(
      assignNextDocumentNumberByType([draft, issued], "factura", 2026).number,
    ).toBe("F-2026-0002");
  });

  it("ordena documentos del mismo día por número descendente antes de fecha interna", () => {
    const olderCreatedButHigherNumber = {
      ...doc("a", "factura", "F-2026-0010", "Ana García"),
      createdAt: "2026-06-09T08:00:00.000Z",
    };
    const newerCreatedButLowerNumber = {
      ...doc("b", "factura", "F-2026-0002", "Luis Pérez"),
      createdAt: "2026-06-09T20:00:00.000Z",
    };

    expect(
      sortDocumentsByNewest([
        newerCreatedButLowerNumber,
        olderCreatedButHigherNumber,
      ]).map((item) => item.number),
    ).toEqual(["F-2026-0010", "F-2026-0002"]);
  });

  it("ordena listados por número descendente aunque la fecha del documento sea la misma o posterior", () => {
    const documents: Document[] = [
      {
        ...doc("a", "factura", "F-2026-0008", "Ana García"),
        date: "2026-06-10",
        createdAt: "2026-06-10T10:00:00.000Z",
      },
      {
        ...doc("b", "factura", "F-2026-0010", "Luis Pérez"),
        date: "2026-06-09",
        createdAt: "2026-06-09T10:00:00.000Z",
      },
      {
        ...doc("c", "factura", "F-2026-0009", "Eva Gómez"),
        date: "2026-06-10",
        createdAt: "2026-06-10T11:00:00.000Z",
      },
    ];

    expect(sortDocumentsByNumberDesc(documents).map((item) => item.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(compareDocumentsByNumberDesc(documents[0], documents[1])).toBeGreaterThan(
      0,
    );
  });

  it("ordena formatos personalizados usando el último grupo numérico", () => {
    const documents: Document[] = [
      { ...doc("a", "presupuesto", "Presupuesto 9", "Ana") },
      { ...doc("b", "presupuesto", "Presupuesto 11", "Luis") },
      { ...doc("c", "presupuesto", "Borrador", "Eva") },
    ];

    expect(sortDocumentsByNumberDesc(documents).map((item) => item.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("trata sufijos decimales importados como revisión, no como número principal", () => {
    const documents: Document[] = [
      { ...doc("a", "factura", "FD-225585.0", "Ana") },
      { ...doc("b", "factura", "FD-225572.1", "Luis") },
      { ...doc("c", "factura", "FD-225585.1", "Eva") },
    ];

    expect(sortDocumentsByNumberDesc(documents).map((item) => item.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

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

  it("borrar borrador no renumera factura emitida", () => {
    const issued = issueDocument(
      doc("1", "factura", "F-2026-0001", "Ana García"),
      EMPTY_DATA.profile,
      "2026-06-24T10:00:00.000Z",
    );
    const documents = [
      issued,
      doc("2", "factura", "F-2026-0002", "Luis Pérez"),
      doc("3", "factura", "F-2026-0003", "Elena Santos"),
    ];

    const remaining = documents.filter((d) => d.id !== "2");
    const renumbered = renumberDocumentsForTypeYear(remaining, "factura", 2026);

    expect(renumbered.find((d) => d.id === issued.id)?.number).toBe(
      "F-2026-0001",
    );
    expect(renumbered.find((d) => d.id === "3")?.number).toBe("F-2026-0002");
  });

  it("borrar borrador no renumera presupuesto emitido", () => {
    const issued = issueDocument(
      doc("1", "presupuesto", "P-2026-0001", "Ana García"),
      EMPTY_DATA.profile,
      "2026-06-24T10:00:00.000Z",
    );
    const documents = [
      issued,
      doc("2", "presupuesto", "P-2026-0002", "Luis Pérez"),
      doc("3", "presupuesto", "P-2026-0003", "Elena Santos"),
    ];

    const remaining = documents.filter((d) => d.id !== "2");
    const renumbered = renumberDocumentsForTypeYear(
      remaining,
      "presupuesto",
      2026,
    );

    expect(renumbered.find((d) => d.id === issued.id)?.number).toBe(
      "P-2026-0001",
    );
    expect(renumbered.find((d) => d.id === "3")?.number).toBe("P-2026-0002");
  });

  it("borrar borrador no renumera recibo emitido", () => {
    const issued = issueDocument(
      doc("1", "recibo", "R-2026-0001", "Ana García"),
      EMPTY_DATA.profile,
      "2026-06-24T10:00:00.000Z",
    );
    const documents = [
      issued,
      doc("2", "recibo", "R-2026-0002", "Luis Pérez"),
      doc("3", "recibo", "R-2026-0003", "Elena Santos"),
    ];

    const remaining = documents.filter((d) => d.id !== "2");
    const renumbered = renumberDocumentsForTypeYear(remaining, "recibo", 2026);

    expect(renumbered.find((d) => d.id === issued.id)?.number).toBe(
      "R-2026-0001",
    );
    expect(renumbered.find((d) => d.id === "3")?.number).toBe("R-2026-0002");
  });

  it("renumberDocumentsForKindYear ignora locked/issued", () => {
    const issued = issueDocument(
      doc("1", "factura", "F-2026-0001", "Ana García"),
      EMPTY_DATA.profile,
      "2026-06-24T10:00:00.000Z",
    );
    const locked = {
      ...doc("2", "factura", "F-2026-0003", "Luis Pérez"),
      documentLifecycle: "issued" as const,
      integrityLock: "locked" as const,
      deliveryStatus: "not_sent" as const,
    };
    const draft = doc("3", "factura", "F-2026-0004", "Elena Santos");

    const renumbered = renumberDocumentsForKindYear(
      [issued, locked, draft],
      "factura",
      2026,
    );

    expect(renumbered.map((d) => d.number)).toEqual([
      "F-2026-0001",
      "F-2026-0003",
      "F-2026-0004",
    ]);
  });

  it("renumberDocumentsForKindYear ignora documentos con snapshot", () => {
    const snapshot = {
      ...issueDocument(
        doc("2", "factura", "F-2026-0002", "Luis Pérez"),
        EMPTY_DATA.profile,
        "2026-06-24T10:00:00.000Z",
      ),
      status: "borrador" as const,
      documentLifecycle: "draft" as const,
      integrityLock: "unlocked" as const,
    };
    const draft = doc("3", "factura", "F-2026-0003", "Elena Santos");

    const renumbered = renumberDocumentsForKindYear(
      [snapshot, draft],
      "factura",
      2026,
    );

    expect(renumbered.map((d) => d.number)).toEqual([
      "F-2026-0002",
      "F-2026-0003",
    ]);
  });

  it("conserva huecos entre documentos emitidos", () => {
    const first = issueDocument(
      doc("1", "factura", "F-2026-0001", "Ana García"),
      EMPTY_DATA.profile,
      "2026-06-24T10:00:00.000Z",
    );
    const third = issueDocument(
      doc("3", "factura", "F-2026-0003", "Elena Santos"),
      EMPTY_DATA.profile,
      "2026-06-24T10:00:00.000Z",
    );
    const draft = doc("4", "factura", "F-2026-0004", "Nuevo borrador");

    const renumbered = renumberDocumentsForKindYear(
      [first, third, draft],
      "factura",
      2026,
    );

    expect(renumbered.map((d) => d.number)).toEqual([
      "F-2026-0001",
      "F-2026-0003",
      "F-2026-0004",
    ]);
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

  it("busca por NIF, dirección e importe", () => {
    const richDocs: Document[] = [
      {
        ...doc("10", "factura", "F-2026-0100", "Beatriz López"),
        client: {
          name: "Beatriz López",
          firstName: "Beatriz",
          lastName: "López",
          nif: "12345678Z",
          streetType: "calle",
          address: "C/ Mayor 1, 28001 Madrid",
        },
        items: [
          {
            id: "line-1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
    ];

    expect(filterDocumentsByQuery(richDocs, "12345678z")).toHaveLength(1);
    expect(filterDocumentsByQuery(richDocs, "mayor")).toHaveLength(1);
    expect(filterDocumentsByQuery(richDocs, "121")).toHaveLength(1);
    expect(filterDocumentsByQuery(richDocs, "121,00")).toHaveLength(1);
  });

  it("ordena de más nueva a más antigua por fecha", () => {
    const dated: Document[] = [
      { ...doc("a", "factura", "F-2026-0001", "A"), date: "2026-01-01", createdAt: "2026-01-01T10:00:00.000Z" },
      { ...doc("b", "factura", "F-2026-0002", "B"), date: "2026-06-01", createdAt: "2026-06-01T10:00:00.000Z" },
      { ...doc("c", "factura", "F-2026-0003", "C"), date: "2026-03-01", createdAt: "2026-03-01T10:00:00.000Z" },
    ];

    expect(sortDocumentsByNewest(dated).map((item) => item.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(compareDocumentsByNewest(dated[0], dated[1])).toBeGreaterThan(0);
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

      let customerId = "";
      if (ensured.created) {
        customerId = `cust-${customers.length + 1}`;
        customers = [
          ...customers,
          { ...ensured.customer, id: customerId },
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
        customerId,
        client: ensured.client,
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
    expect(documents.map((d) => d.customerId)).toEqual([
      "cust-1",
      "cust-2",
      "cust-3",
    ]);
    expect(documents.map((d) => d.client.nif)).toEqual([
      "11111111H",
      "22222222J",
      "33333333E",
    ]);
  });

  it("evita duplicar clientes existentes al crear documentos", () => {
    const customers = [
      {
        id: "cust-1",
        firstName: "Ana",
        lastName: "García",
        name: "Ana García",
        nif: "12345678A",
        createdAt: "",
        updatedAt: "",
      },
    ];

    for (const type of ["factura", "presupuesto", "recibo"] as DocumentType[]) {
      const byName = ensureCustomerForDocument(
        customers,
        { firstName: "Ana", lastName: "García" },
        null,
      );
      expect(byName.ok, `${type} duplica por nombre`).toBe(false);

      const byNif = ensureCustomerForDocument(
        customers,
        { firstName: "Ana", lastName: "Nueva", nif: "12345678a" },
        null,
      );
      expect(byNif.ok, `${type} duplica por NIF`).toBe(false);
    }
  });
});

describe("isDocumentEditable", () => {
  it("permite editar borradores de presupuesto y recibo", () => {
    expect(isDocumentEditable(doc("1", "presupuesto", "P-1", "Ana"))).toBe(true);
    expect(isDocumentEditable(doc("2", "recibo", "R-1", "Ana"))).toBe(true);
  });

  it("permite editar una factura en borrador creada desde un presupuesto", () => {
    const invoiceFromQuote = {
      ...doc("5", "factura", "F-1", "Ana"),
      sourceQuoteDocumentId: "quote-1",
      sourceQuoteNumber: "P-1",
      status: "borrador" as const,
    };

    expect(isDocumentEditable(invoiceFromQuote)).toBe(true);
  });

  it("permite editar una rectificativa en borrador y bloquea la emitida", () => {
    const draftRectificativa = {
      ...doc("6", "factura", "BORRADOR", "Ana"),
      status: "borrador" as const,
      rectification: {
        originalDocumentId: "1",
        originalNumber: "F-1",
        originalDate: "2026-07-01",
        reason: "Error en datos",
        type: "correccion" as const,
      },
    };
    const issuedRectificativa = {
      ...draftRectificativa,
      number: "FR-2026-0001",
      status: "enviado" as const,
    };

    expect(isDocumentEditable(draftRectificativa)).toBe(true);
    expect(isDocumentEditable(issuedRectificativa)).toBe(false);
  });

  it("permite editar presupuestos enviados y bloquea recibos emitidos", () => {
    const sent = { ...doc("3", "presupuesto", "P-2", "Ana"), status: "enviado" as const };
    const receipt = { ...doc("4", "recibo", "R-2", "Ana"), status: "pagado" as const };
    expect(isDocumentEditable(sent)).toBe(true);
    expect(isDocumentEditable(receipt)).toBe(false);
    expect(getDocumentReadOnlyMessage(receipt)).toContain("recibo");
  });
});
