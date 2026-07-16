import { describe, expect, it } from "vitest";
import { documentTotals } from "./calculations";
import { ensureCustomerForDocument } from "./customers";
import {
  assignNextDocumentNumberByType,
  compareInvoicesByPeriodAndNumberDesc,
  compareInvoicesBySeriesAndNumberDesc,
  compareDocumentsByNumberDesc,
  compareDocumentsByNewest,
  describeInvoiceDocumentSeries,
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
  sortInvoicesByPeriodAndNumberDesc,
  sortInvoicesBySeriesAndNumberDesc,
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

function issuedInvoice(document: Document): Document {
  return {
    ...document,
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
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

  it("mantiene contiguas las series actuales, rectificativas e históricas y ordena cada una por número", () => {
    const asHistoricalImport = (document: Document): Document => ({
      ...issuedInvoice(document),
      legacyImportProvenance: {
        schemaVersion: 1,
        kind: "external_import",
        importer: "pcfacturacion",
        importedAt: "2026-07-01T10:00:00.000Z",
      },
    });
    const mixedSeries: Document[] = [
      asHistoricalImport({
        ...doc("legacy-june", "factura", "Factura/2949/", "Histórica junio"),
        date: "2026-06-27",
        createdAt: "2026-06-27T10:00:00.000Z",
      }),
      issuedInvoice({
        ...doc("app-july", "factura", "F-2026-2955", "Nueva julio"),
        date: "2026-07-11",
        createdAt: "2026-07-11T10:00:00.000Z",
      }),
      issuedInvoice({
        ...doc("app-june-1", "factura", "F-2026-0001", "Nueva junio 1"),
        date: "2026-06-10",
        createdAt: "2026-06-10T09:00:00.000Z",
      }),
      issuedInvoice({
        ...doc("rect-july", "factura", "FR-2026-0001", "Rectificativa julio"),
        date: "2026-07-06",
        createdAt: "2026-07-06T10:00:00.000Z",
        rectification: {
          originalDocumentId: "app-original",
          originalNumber: "F-2026-2951",
          originalDate: "2026-07-06",
          reason: "Corrección de datos",
          type: "correccion",
        },
      }),
      issuedInvoice({
        ...doc("app-june-2", "factura", "F-2026-0002", "Nueva junio 2"),
        date: "2026-06-10",
        createdAt: "2026-06-10T08:00:00.000Z",
      }),
      asHistoricalImport({
        ...doc("legacy-january", "factura", "Factura/6401/", "Histórica enero"),
        date: "2026-01-15",
        createdAt: "2026-01-15T10:00:00.000Z",
      }),
      asHistoricalImport({
        ...doc(
          "legacy-december",
          "factura",
          "Factura/6399/",
          "Histórica diciembre",
        ),
        date: "2025-12-31",
        createdAt: "2025-12-31T10:00:00.000Z",
      }),
    ];
    const originalDocuments = structuredClone(mixedSeries);
    const sorted = sortInvoicesBySeriesAndNumberDesc(mixedSeries);

    expect(sorted.map((item) => item.id)).toEqual([
      "app-july",
      "app-june-2",
      "app-june-1",
      "rect-july",
      "legacy-january",
      "legacy-december",
      "legacy-june",
    ]);
    expect(
      sorted.map((item) => describeInvoiceDocumentSeries(item).label),
    ).toEqual([
      "Facturas actuales · Serie F-2026-…",
      "Facturas actuales · Serie F-2026-…",
      "Facturas actuales · Serie F-2026-…",
      "Rectificativas · Serie FR-2026-…",
      "Históricas importadas · Serie Factura/…/",
      "Históricas importadas · Serie Factura/…/",
      "Históricas importadas · Serie Factura/…/",
    ]);
    expect(mixedSeries).toEqual(originalDocuments);
  });

  it("mantiene los meses contiguos y evita que una factura antigua con secuencia alta aparezca en un periodo moderno", () => {
    const julyRectification = {
      originalDocumentId: "app-july",
      originalNumber: "F-2026-2954",
      originalDate: "2026-07-09",
      reason: "Corrección",
      type: "correccion" as const,
    };
    const historicalJune = {
      ...issuedInvoice(
        doc("legacy-june", "factura", "Factura/2949/", "Histórica junio"),
      ),
      date: "2026-06-27",
      legacyImportProvenance: {
        schemaVersion: 1 as const,
        kind: "external_import" as const,
        importer: "pcfacturacion" as const,
        importedAt: "2026-07-01T10:00:00.000Z",
      },
    };
    const mixedPeriods: Document[] = [
      historicalJune,
      issuedInvoice({
        ...doc("app-july", "factura", "F-2026-2954", "Nueva julio"),
        date: "2026-07-09",
      }),
      issuedInvoice({
        ...doc("app-june", "factura", "F-2026-0002", "Nueva junio"),
        date: "2026-06-10",
      }),
      issuedInvoice({
        ...doc("rect-july", "factura", "FR-2026-0001", "Rectificativa"),
        date: "2026-07-06",
        rectification: julyRectification,
      }),
      issuedInvoice({
        ...doc("old-high", "factura", "ZZ-2099-999999", "Antigua"),
        date: "2009-12-31",
      }),
    ];

    expect(
      sortInvoicesByPeriodAndNumberDesc(mixedPeriods).map((item) => item.id),
    ).toEqual([
      "app-july",
      "rect-july",
      "legacy-june",
      "app-june",
      "old-high",
    ]);
    expect(
      sortInvoicesByPeriodAndNumberDesc(mixedPeriods).map((item) =>
        item.date.slice(0, 7),
      ),
    ).toEqual(["2026-07", "2026-07", "2026-06", "2026-06", "2009-12"]);
  });

  it("ignora cualquier prefijo y el año del formato al priorizar la secuencia final dentro del mismo mes", () => {
    const arbitraryPrefixes = [
      issuedInvoice(
        doc("plain", "factura", "CUALQUIER-PREFIJO/1111", "A"),
      ),
      issuedInvoice(doc("short", "factura", "FX/2222", "B")),
      issuedInvoice(doc("year-prefix", "factura", "ABC-2026-3333", "C")),
      issuedInvoice(doc("legacy-shape", "factura", "Factura/4444/", "D")),
      issuedInvoice(doc("year-suffix", "factura", "OTRO5555-2026", "E")),
      issuedInvoice(doc("embedded", "factura", "R2D2-FX/6666", "F")),
    ];

    expect(
      sortInvoicesByPeriodAndNumberDesc(arbitraryPrefixes).map(
        (item) => item.id,
      ),
    ).toEqual([
      "embedded",
      "year-suffix",
      "legacy-shape",
      "year-prefix",
      "short",
      "plain",
    ]);
  });

  it("preserva secuencias exactas, deja números no interpretables al final del mes y no muta la entrada", () => {
    const documents = [
      issuedInvoice(
        doc("huge-low", "factura", "INV-9007199254740992", "A"),
      ),
      issuedInvoice(
        doc("huge-high", "factura", "OTRA/9007199254740993", "B"),
      ),
      issuedInvoice(doc("unparseable", "factura", "SIN-NUMERO", "C")),
      issuedInvoice({
        ...doc("invalid-date", "factura", "ZZ/9999999999999999", "D"),
        date: "fecha-desconocida",
      }),
    ];
    const original = structuredClone(documents);

    expect(
      sortInvoicesByPeriodAndNumberDesc(documents).map((item) => item.id),
    ).toEqual(["huge-high", "huge-low", "unparseable", "invalid-date"]);
    expect(
      compareInvoicesByPeriodAndNumberDesc(documents[0]!, documents[1]!),
    ).toBeGreaterThan(0);
    expect(documents).toEqual(original);
  });

  it("respeta año, ceros, revisiones y deja los números no definitivos al final", () => {
    const rectification = {
      originalDocumentId: "original",
      originalNumber: "F-2026-0001",
      originalDate: "2026-01-01",
      reason: "Corrección",
      type: "correccion" as const,
    };
    const invoices: Document[] = [
      issuedInvoice(doc("f-2", "factura", "F-2026-0002", "A")),
      issuedInvoice(doc("f-9", "factura", "F-2026-9", "B")),
      issuedInvoice(doc("f-10", "factura", "F-2026-0010", "C")),
      issuedInvoice(doc("f-2025", "factura", "F-2025-9999", "D")),
      issuedInvoice({
        ...doc("fr-2", "factura", "FR-2026-0002", "E"),
        rectification,
      }),
      issuedInvoice({
        ...doc("fr-10", "factura", "FR-2026-0010", "F"),
        rectification,
      }),
      issuedInvoice(doc("revision-0", "factura", "FD-225585.0", "G")),
      issuedInvoice(doc("revision-1", "factura", "FD-225585.1", "H")),
      { ...doc("draft", "factura", DRAFT_INVOICE_NUMBER, "I") },
    ];

    expect(
      sortInvoicesBySeriesAndNumberDesc(invoices).map((item) => item.id),
    ).toEqual([
      "f-10",
      "f-9",
      "f-2",
      "f-2025",
      "revision-1",
      "revision-0",
      "fr-10",
      "fr-2",
      "draft",
    ]);
  });

  it("no confunde secuencias personalizadas entre 2000 y 2100 con años", () => {
    const customSeries: Document[] = [
      issuedInvoice(doc("custom-1999", "factura", "F26 001999", "A")),
      issuedInvoice(doc("custom-2000", "factura", "F26 002000", "B")),
      issuedInvoice(doc("custom-2100", "factura", "F26 002100", "C")),
      issuedInvoice(doc("custom-2101", "factura", "F26 002101", "D")),
    ];

    expect(
      sortInvoicesBySeriesAndNumberDesc(customSeries).map((item) => item.id),
    ).toEqual(["custom-2101", "custom-2100", "custom-2000", "custom-1999"]);
    expect(
      customSeries.map((item) => describeInvoiceDocumentSeries(item).key),
    ).toEqual(["0:f26 …", "0:f26 …", "0:f26 …", "0:f26 …"]);
    expect(
      describeInvoiceDocumentSeries(
        issuedInvoice(
          doc("custom-revision", "factura", "F26 2000.2", "Revisión"),
        ),
      ),
    ).toMatchObject({
      label: "Facturas actuales · Serie F26 ….x",
      explicitYear: 0,
      sequence: 2000,
      revision: 2,
    });
  });

  it("reconoce años prefijados y sufijados sin convertirlos en secuencia", () => {
    const prefixYear = issuedInvoice(
      doc("prefix-year", "factura", "INV-2026-0012", "Prefijo"),
    );
    const suffixYear = issuedInvoice(
      doc("suffix-year", "factura", "INV0012-2026", "Sufijo"),
    );

    expect(describeInvoiceDocumentSeries(prefixYear)).toMatchObject({
      label: "Facturas actuales · Serie INV-2026-…",
      explicitYear: 2026,
      sequence: 12,
    });
    expect(describeInvoiceDocumentSeries(suffixYear)).toMatchObject({
      label: "Facturas actuales · Serie INV…-2026",
      explicitYear: 2026,
      sequence: 12,
    });
    expect(
      describeInvoiceDocumentSeries(
        issuedInvoice(doc("short-suffix", "factura", "INV12-2026", "C")),
      ),
    ).toMatchObject({
      label: "Facturas actuales · Serie INV…-2026",
      explicitYear: 2026,
      sequence: 12,
    });
  });

  it("ordena revisiones decimales cortas y largas dentro de su serie", () => {
    const revisions = [
      issuedInvoice(doc("revision-12", "factura", "INV-2026-12.1", "A")),
      issuedInvoice(doc("revision-13", "factura", "INV-2026-13.1", "B")),
      issuedInvoice(doc("revision-99", "factura", "INV-2026-0012.99", "C")),
      issuedInvoice(doc("revision-100", "factura", "INV-2026-0012.100", "D")),
    ];

    expect(
      sortInvoicesBySeriesAndNumberDesc(revisions).map((item) => item.id),
    ).toEqual(["revision-13", "revision-100", "revision-99", "revision-12"]);
    expect(describeInvoiceDocumentSeries(revisions[3]!)).toMatchObject({
      label: "Facturas actuales · Serie INV-2026-….x",
      sequence: 12,
      revision: 100,
    });
  });

  it("usa el formato configurado cuando año y secuencia no tienen separador", () => {
    const prefixYearNumbering = structuredClone(EMPTY_DATA.profile.numbering);
    prefixYearNumbering.formats.factura = {
      template: "{year}{num}",
      padding: 4,
    };
    const suffixYearNumbering = structuredClone(EMPTY_DATA.profile.numbering);
    suffixYearNumbering.formats.factura = {
      template: "{num}{year}",
      padding: 4,
    };
    const prefixYearInvoices = [
      issuedInvoice(doc("prefix-12", "factura", "20260012", "A")),
      issuedInvoice(doc("prefix-13", "factura", "20260013", "B")),
    ];
    const suffixYear = issuedInvoice(
      doc("suffix-12", "factura", "00122026", "C"),
    );

    expect(
      sortInvoicesBySeriesAndNumberDesc(
        prefixYearInvoices,
        prefixYearNumbering,
      ).map((item) => item.id),
    ).toEqual(["prefix-13", "prefix-12"]);
    expect(
      describeInvoiceDocumentSeries(
        prefixYearInvoices[0]!,
        prefixYearNumbering,
      ),
    ).toMatchObject({
      label: "Facturas actuales · Serie 2026…",
      explicitYear: 2026,
      sequence: 12,
    });
    expect(
      describeInvoiceDocumentSeries(suffixYear, suffixYearNumbering),
    ).toMatchObject({
      label: "Facturas actuales · Serie …2026",
      explicitYear: 2026,
      sequence: 12,
    });
  });

  it("mantiene una sola serie cuando la plantilla repite el contador", () => {
    const separatedNumbering = structuredClone(EMPTY_DATA.profile.numbering);
    separatedNumbering.formats.factura = {
      template: "INV-{num}-{num}",
      padding: 2,
    };
    const adjacentNumbering = structuredClone(EMPTY_DATA.profile.numbering);
    adjacentNumbering.formats.factura = {
      template: "{num}{num}",
      padding: 2,
    };
    const repeated = [
      issuedInvoice(doc("repeated-12", "factura", "INV-12-12", "A")),
      issuedInvoice(doc("repeated-13", "factura", "INV-13-13", "B")),
    ];
    const adjacent = issuedInvoice(
      doc("adjacent-12", "factura", "1212", "C"),
    );

    expect(
      sortInvoicesBySeriesAndNumberDesc(repeated, separatedNumbering).map(
        (item) => item.id,
      ),
    ).toEqual(["repeated-13", "repeated-12"]);
    expect(
      repeated.map(
        (item) => describeInvoiceDocumentSeries(item, separatedNumbering).key,
      ),
    ).toEqual(["0:inv-…-…", "0:inv-…-…"]);
    expect(
      describeInvoiceDocumentSeries(adjacent, adjacentNumbering),
    ).toMatchObject({
      label: "Facturas actuales · Serie ……",
      sequence: 12,
    });
  });

  it("ordena secuencias exactas aunque superen la precisión segura de Number", () => {
    const smaller = issuedInvoice({
      ...doc("huge-smaller", "factura", "INV-9007199254740992", "A"),
      date: "2026-07-02",
    });
    const larger = issuedInvoice({
      ...doc("huge-larger", "factura", "INV-9007199254740993", "B"),
      date: "2026-07-01",
    });

    expect(
      sortInvoicesBySeriesAndNumberDesc([smaller, larger]).map(
        (item) => item.id,
      ),
    ).toEqual(["huge-larger", "huge-smaller"]);
  });

  it("mantiene un borrador importado numerado dentro del bloque de borradores", () => {
    const importedDraft = {
      ...doc("pcfacturacion:factura:draft", "factura", "Factura/3001/", "A"),
      legacyImportProvenance: {
        schemaVersion: 2 as const,
        kind: "external_import" as const,
        importer: "pcfacturacion" as const,
        importedAt: null,
        provenanceRecordedAt: "2026-07-01T10:00:00.000Z",
        issuerOrigin: "unknown_legacy_import" as const,
        documentStateAtImport: "draft" as const,
      },
    };

    expect(describeInvoiceDocumentSeries(importedDraft)).toMatchObject({
      label: "Borradores sin número definitivo",
      rank: 6,
      hasNumber: false,
    });
  });

  it("no presenta un namespace provisional como histórico importado aceptado", () => {
    const provisional = {
      ...doc(
        "pcfacturacion:factura:pending",
        "factura",
        "Factura/3000/",
        "Pendiente",
      ),
      status: "pagado" as const,
      documentLifecycle: "issued" as const,
      integrityLock: "locked" as const,
    };

    const series = describeInvoiceDocumentSeries(provisional);
    expect(series.label).toBe(
      "Importaciones protegidas pendientes de revisar · Serie Factura/…/",
    );
    expect(series.label).not.toContain("Históricas importadas");
  });

  it("produce un orden total estable sin mutar la entrada", () => {
    const sameSeries: Document[] = [
      issuedInvoice({
        ...doc("b", "factura", "F-2026-0001", "A"),
        date: "2026-06-01",
        createdAt: "2026-06-01T10:00:00.000Z",
      }),
      issuedInvoice({
        ...doc("a", "factura", "F-2026-0001", "B"),
        date: "2026-06-01",
        createdAt: "2026-06-01T10:00:00.000Z",
      }),
    ];
    const original = structuredClone(sameSeries);
    const expected = ["a", "b"];

    expect(
      sortInvoicesBySeriesAndNumberDesc(sameSeries).map((item) => item.id),
    ).toEqual(expected);
    expect(
      sortInvoicesBySeriesAndNumberDesc([...sameSeries].reverse()).map(
        (item) => item.id,
      ),
    ).toEqual(expected);
    expect(
      compareInvoicesBySeriesAndNumberDesc(sameSeries[0]!, sameSeries[1]!),
    ).toBeGreaterThan(0);
    expect(sameSeries).toEqual(original);

    const collatorEquivalent: Document[] = [
      issuedInvoice({
        ...doc("id-a", "factura", "F-2026-0001", "A"),
        date: "2026-06-01",
        createdAt: "2026-06-01T10:00:00.000Z",
      }),
      issuedInvoice({
        ...doc("id-A", "factura", "F-2026-0001", "B"),
        date: "2026-06-01",
        createdAt: "2026-06-01T10:00:00.000Z",
      }),
    ];
    const collatorExpected = ["id-A", "id-a"];
    expect(
      sortInvoicesBySeriesAndNumberDesc(collatorEquivalent).map(
        (item) => item.id,
      ),
    ).toEqual(collatorExpected);
    expect(
      sortInvoicesBySeriesAndNumberDesc([...collatorEquivalent].reverse()).map(
        (item) => item.id,
      ),
    ).toEqual(collatorExpected);
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

  it("reutiliza clientes existentes al crear documentos", () => {
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
      expect(byName.ok, `${type} reutiliza por nombre`).toBe(true);
      if (byName.ok) {
        expect(byName.created).toBe(false);
        expect(byName.customer.id).toBe("cust-1");
      }

      const byNif = ensureCustomerForDocument(
        customers,
        { firstName: "Ana", lastName: "García", nif: "12345678a" },
        null,
      );
      expect(byNif.ok, `${type} reutiliza por NIF`).toBe(true);
      if (byNif.ok) {
        expect(byNif.created).toBe(false);
        expect(byNif.customer.id).toBe("cust-1");
        expect(byNif.customer.nif).toBe("12345678A");
      }
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
    expect(
      isDocumentEditable({
        ...draftRectificativa,
        number: "FR-2026-0001",
      }),
    ).toBe(false);
  });

  it("permite editar presupuestos enviados y bloquea recibos emitidos", () => {
    const sent = { ...doc("3", "presupuesto", "P-2", "Ana"), status: "enviado" as const };
    const receipt = { ...doc("4", "recibo", "R-2", "Ana"), status: "pagado" as const };
    expect(isDocumentEditable(sent)).toBe(true);
    expect(isDocumentEditable(receipt)).toBe(false);
    expect(getDocumentReadOnlyMessage(receipt)).toContain("recibo");
  });
});
