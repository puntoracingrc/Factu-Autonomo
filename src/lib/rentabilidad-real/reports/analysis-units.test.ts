import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type AppData, type Document } from "@/lib/types";
import {
  buildRentabilidadRealAnalysisUnits,
  getRelatedDocumentIdsForAnalysisUnit,
} from "./analysis-units";

function document(
  overrides: Partial<Document> & Pick<Document, "id" | "type" | "number">,
): Document {
  return {
    id: overrides.id,
    type: overrides.type,
    number: overrides.number,
    date: overrides.date ?? "2026-07-01",
    client: overrides.client ?? { name: "Cliente Demo" },
    customerId: overrides.customerId ?? "client_1",
    items: overrides.items ?? [
      {
        id: "line_1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: overrides.status ?? "enviado",
    sourceQuoteDocumentId: overrides.sourceQuoteDocumentId,
    createdAt: overrides.createdAt ?? "2026-07-01T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-07-01T10:00:00.000Z",
  };
}

function documentWithoutClient(
  overrides: Partial<Document> & Pick<Document, "id" | "type" | "number">,
): Document {
  const withClient = document(overrides);
  const copy: Partial<Document> = { ...withClient };
  delete copy.client;
  delete copy.customerId;
  return copy as Document;
}

function appData(documents: Document[]): AppData {
  return {
    ...EMPTY_DATA,
    documents,
    expenses: [],
    recurringExpenses: [],
  };
}

describe("buildRentabilidadRealAnalysisUnits", () => {
  it("presupuesto sin factura crea unidad quote", () => {
    const data = appData([document({ id: "q1", type: "presupuesto", number: "P-1" })]);

    const units = buildRentabilidadRealAnalysisUnits(data);

    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      sourceType: "quote",
      quoteDocumentId: "q1",
      hasQuote: true,
      hasInvoice: false,
    });
  });

  it("factura sin presupuesto crea unidad invoice", () => {
    const data = appData([document({ id: "i1", type: "factura", number: "F-1" })]);

    const units = buildRentabilidadRealAnalysisUnits(data);

    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      sourceType: "invoice",
      invoiceDocumentId: "i1",
      hasInvoice: true,
      hasQuote: false,
    });
  });

  it("factura con sourceQuoteDocumentId crea unidad quote_invoice_pair", () => {
    const quote = document({ id: "q1", type: "presupuesto", number: "P-1" });
    const invoice = document({
      id: "i1",
      type: "factura",
      number: "F-1",
      sourceQuoteDocumentId: "q1",
    });

    const units = buildRentabilidadRealAnalysisUnits(appData([quote, invoice]));

    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      sourceType: "quote_invoice_pair",
      primaryDocumentId: "i1",
      quoteDocumentId: "q1",
      invoiceDocumentId: "i1",
    });
  });

  it("no duplica presupuesto y factura vinculados", () => {
    const quote = document({ id: "q1", type: "presupuesto", number: "P-1" });
    const invoice = document({
      id: "i1",
      type: "factura",
      number: "F-1",
      sourceQuoteDocumentId: "q1",
    });

    const units = buildRentabilidadRealAnalysisUnits(appData([quote, invoice]));

    expect(units.map((unit) => unit.primaryDocumentId)).toEqual(["i1"]);
  });

  it("relatedDocumentIds incluye presupuesto y factura si ambos existen", () => {
    const quote = document({ id: "q1", type: "presupuesto", number: "P-1" });
    const invoice = document({
      id: "i1",
      type: "factura",
      number: "F-1",
      sourceQuoteDocumentId: "q1",
    });

    const [unit] = buildRentabilidadRealAnalysisUnits(appData([quote, invoice]));

    expect(getRelatedDocumentIdsForAnalysisUnit(unit)).toEqual(["q1", "i1"]);
  });

  it("no muta AppData", () => {
    const data = appData([
      document({ id: "q1", type: "presupuesto", number: "P-1" }),
    ]);
    const before = JSON.parse(JSON.stringify(data));

    buildRentabilidadRealAnalysisUnits(data);

    expect(data).toEqual(before);
  });

  it("documento sin client usa fallback y no rompe", () => {
    const data = appData([
      documentWithoutClient({ id: "i1", type: "factura", number: "F-1" }),
    ]);

    const units = buildRentabilidadRealAnalysisUnits(data);

    expect(units[0]).toMatchObject({
      clientId: "client_unassigned",
      clientName: "Cliente sin asignar",
    });
  });
});
