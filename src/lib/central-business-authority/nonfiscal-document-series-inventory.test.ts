import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type AppData,
  type Document,
} from "@/lib/types";

import { buildCentralBusinessNonfiscalSeriesInventory } from "./nonfiscal-document-series-inventory";

function document(input: {
  id: string;
  type?: "presupuesto" | "recibo";
  number: string;
  date: string;
}): Document {
  return {
    id: input.id,
    type: input.type ?? "presupuesto",
    number: input.number,
    date: input.date,
    client: { name: "Cliente que no debe salir en la huella" },
    items: [],
    status: "borrador",
    createdAt: `${input.date}T10:00:00.000Z`,
    updatedAt: `${input.date}T10:00:00.000Z`,
  };
}

function data(input: {
  documents: Document[];
  year?: number;
  quoteFloor?: number;
  receiptFloor?: number;
  quoteTemplate?: string;
}): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...DEFAULT_PROFILE,
      numbering: {
        ...DEFAULT_PROFILE.numbering,
        year: input.year ?? 2026,
        lastSequence: {
          ...DEFAULT_PROFILE.numbering.lastSequence,
          presupuesto: input.quoteFloor ?? 8,
          recibo: input.receiptFloor ?? 2,
        },
        formats: {
          ...DEFAULT_PROFILE.numbering.formats,
          presupuesto: {
            template: input.quoteTemplate ?? "P-{year}-{num}",
            padding: 4,
          },
        },
      },
    },
    documents: input.documents,
  };
}

describe("central business non-fiscal series inventory", () => {
  it("resume solo la plantilla configurada y conserva el contador local como suelo", () => {
    const summary = buildCentralBusinessNonfiscalSeriesInventory({
      data: data({
        documents: [
          document({
            id: "quote-7",
            number: "P-2026-0007",
            date: "2026-01-02",
          }),
          document({
            id: "quote-12",
            number: "P-2026-0012",
            date: "2026-03-04",
          }),
          document({
            id: "legacy",
            number: "Pto/6402/",
            date: "2026-04-05",
          }),
        ],
      }),
      entityType: "quote",
      fiscalYear: 2026,
    });

    expect(summary).toMatchObject({
      entityType: "quote",
      numberTemplate: "P-{year}-{num}",
      padding: 4,
      fiscalYear: 2026,
      scopeYear: 2026,
      observedMaxSequence: 12,
      sourceDocumentCount: 2,
      ignoredDocumentCount: 1,
    });
    expect(summary.sourceDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(summary)).not.toContain(
      "Cliente que no debe salir en la huella",
    );

    const floorSummary = buildCentralBusinessNonfiscalSeriesInventory({
      data: data({
        documents: [
          document({
            id: "quote-7",
            number: "P-2026-0007",
            date: "2026-01-02",
          }),
        ],
      }),
      entityType: "quote",
      fiscalYear: 2026,
    });
    expect(floorSummary.observedMaxSequence).toBe(8);
  });

  it("no arrastra el suelo de otro ejercicio y usa el numero del ejercicio pedido", () => {
    const summary = buildCentralBusinessNonfiscalSeriesInventory({
      data: data({
        year: 2026,
        quoteFloor: 91,
        documents: [
          document({
            id: "quote-2027",
            number: "P-2027-0003",
            date: "2027-01-02",
          }),
          document({
            id: "quote-2026",
            number: "P-2026-0090",
            date: "2026-12-30",
          }),
        ],
      }),
      entityType: "quote",
      fiscalYear: 2027,
    });

    expect(summary).toMatchObject({
      scopeYear: 2027,
      observedMaxSequence: 3,
      sourceDocumentCount: 1,
      ignoredDocumentCount: 1,
    });
  });

  it("inspecciona todos los ejercicios cuando la plantilla no lleva ano", () => {
    const summary = buildCentralBusinessNonfiscalSeriesInventory({
      data: data({
        quoteTemplate: "P-{num}",
        documents: [
          document({
            id: "quote-old",
            number: "P-0042",
            date: "2025-12-31",
          }),
          document({
            id: "quote-new",
            number: "P-0003",
            date: "2026-01-01",
          }),
        ],
      }),
      entityType: "quote",
      fiscalYear: 2026,
    });

    expect(summary).toMatchObject({
      scopeYear: 0,
      observedMaxSequence: 42,
      sourceDocumentCount: 2,
      ignoredDocumentCount: 0,
    });
  });

  it("mapea recibos y genera la misma huella con cualquier orden de entrada", () => {
    const first = document({
      id: "receipt-2",
      type: "recibo",
      number: "R-2026-0002",
      date: "2026-01-03",
    });
    const second = document({
      id: "receipt-9",
      type: "recibo",
      number: "R-2026-0009",
      date: "2026-02-04",
    });
    const left = buildCentralBusinessNonfiscalSeriesInventory({
      data: data({ documents: [first, second] }),
      entityType: "receipt",
      fiscalYear: 2026,
    });
    const right = buildCentralBusinessNonfiscalSeriesInventory({
      data: data({ documents: [second, first] }),
      entityType: "receipt",
      fiscalYear: 2026,
    });

    expect(left).toMatchObject({
      entityType: "receipt",
      observedMaxSequence: 9,
      sourceDocumentCount: 2,
    });
    expect(right.sourceDigest).toBe(left.sourceDigest);
  });
});
