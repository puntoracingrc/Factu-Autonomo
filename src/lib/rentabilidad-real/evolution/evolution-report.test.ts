import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type AppData, type Document, type Expense } from "@/lib/types";
import type { RentabilidadRealDocumentAnalysisModesById } from "@/lib/rentabilidad-real/document-analysis-modes";
import { DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS } from "@/lib/rentabilidad-real/reports";
import { buildRentabilidadRealEvolutionReport } from "./evolution-report";
import type { RentabilidadRealEvolutionGrouping } from "./types";

function document(
  overrides: Partial<Document> & Pick<Document, "id" | "type" | "number">,
): Document {
  return {
    id: overrides.id,
    type: overrides.type,
    number: overrides.number,
    date: overrides.date ?? "2026-07-01",
    customerId: overrides.customerId ?? "client_1",
    client: overrides.client ?? { name: "Cliente Demo" },
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
    rectification: overrides.rectification,
    rectifiedById: overrides.rectifiedById,
    createdAt: overrides.createdAt ?? "2026-07-01T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-07-01T10:00:00.000Z",
  };
}

function expense(overrides: Partial<Expense> & Pick<Expense, "id">): Expense {
  return {
    id: overrides.id,
    date: overrides.date ?? "2026-07-02",
    supplierName: overrides.supplierName ?? "Proveedor",
    description: overrides.description ?? "Material",
    amount: overrides.amount ?? 50,
    ivaPercent: overrides.ivaPercent ?? 21,
    category: overrides.category ?? "Material",
    paymentMethod: overrides.paymentMethod ?? "Tarjeta",
    businessKind: overrides.businessKind ?? "purchase",
    origin: overrides.origin,
    workDocumentId: overrides.workDocumentId,
    createdAt: overrides.createdAt ?? "2026-07-02T10:00:00.000Z",
  };
}

function data(input: {
  documents: Document[];
  expenses?: Expense[];
}): AppData {
  return {
    ...EMPTY_DATA,
    documents: input.documents,
    expenses: input.expenses ?? [],
    recurringExpenses: [],
  };
}

function report(input: {
  appData: AppData;
  grouping?: RentabilidadRealEvolutionGrouping;
  documentAnalysisModes?: RentabilidadRealDocumentAnalysisModesById;
  clientId?: string;
  lowMarginOnly?: boolean;
  includeQuotesWithoutInvoice?: boolean;
  includeInternalAdjustments?: boolean;
}) {
  return buildRentabilidadRealEvolutionReport(input.appData, {
    grouping: input.grouping ?? "monthly",
    clientId: input.clientId,
    lowMarginOnly: input.lowMarginOnly,
    documentReportSettings: {
      ...DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
      includeQuotesWithoutInvoice:
        input.includeQuotesWithoutInvoice ??
        DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.includeQuotesWithoutInvoice,
      includeInternalAdjustments:
        input.includeInternalAdjustments ??
        DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.includeInternalAdjustments,
      documentAnalysisModes: input.documentAnalysisModes,
    },
  });
}

describe("buildRentabilidadRealEvolutionReport", () => {
  it("agrupa por mes y suma ingresos, costes y beneficios", () => {
    const result = report({
      appData: data({
        documents: [
          document({ id: "jul", type: "factura", number: "F-1" }),
          document({
            id: "aug",
            type: "factura",
            number: "F-2",
            date: "2026-08-10",
            items: [
              {
                id: "line_2",
                description: "Servicio agosto",
                quantity: 1,
                unitPrice: 200,
                ivaPercent: 21,
              },
            ],
          }),
        ],
        expenses: [
          expense({ id: "e1", amount: 20, workDocumentId: "jul" }),
          expense({ id: "e2", amount: 50, workDocumentId: "aug" }),
        ],
      }),
    });

    expect(result.rows.map((row) => row.periodId)).toEqual([
      "2026-08",
      "2026-07",
    ]);
    expect(result.rows[0]).toMatchObject({
      documentCount: 1,
      incomeWithoutIndirectTax: 200,
      totalDirectCosts: 50,
      operatingProfit: 150,
    });
    expect(result.summary).toMatchObject({
      periodCount: 2,
      documentCount: 2,
      incomeWithoutIndirectTax: 300,
      totalDirectCosts: 70,
      operatingProfit: 230,
    });
  });

  it("agrupa por trimestre", () => {
    const result = report({
      grouping: "quarterly",
      appData: data({
        documents: [
          document({ id: "jan", type: "factura", number: "F-1", date: "2026-01-10" }),
          document({ id: "mar", type: "factura", number: "F-2", date: "2026-03-20" }),
          document({ id: "apr", type: "factura", number: "F-3", date: "2026-04-05" }),
        ],
      }),
    });

    expect(result.rows.map((row) => row.periodId)).toEqual([
      "2026-Q2",
      "2026-Q1",
    ]);
    expect(result.rows.find((row) => row.periodId === "2026-Q1")).toMatchObject({
      documentCount: 2,
      incomeWithoutIndirectTax: 200,
    });
  });

  it("agrupa por cliente", () => {
    const result = report({
      grouping: "client",
      appData: data({
        documents: [
          document({
            id: "c1",
            type: "factura",
            number: "F-1",
            customerId: "client_a",
            client: { name: "Cliente A" },
          }),
          document({
            id: "c2",
            type: "factura",
            number: "F-2",
            customerId: "client_b",
            client: { name: "Cliente B" },
          }),
          document({
            id: "c3",
            type: "factura",
            number: "F-3",
            customerId: "client_a",
            client: { name: "Cliente A" },
          }),
        ],
      }),
    });

    expect(result.rows.map((row) => row.periodLabel)).toEqual([
      "Cliente A",
      "Cliente B",
    ]);
    expect(result.rows[0]).toMatchObject({
      documentCount: 2,
      incomeWithoutIndirectTax: 200,
    });
  });

  it("agrupa por modo de analisis", () => {
    const result = report({
      grouping: "analysis_mode",
      appData: data({
        documents: [
          document({ id: "work", type: "factura", number: "F-1" }),
          document({ id: "hours", type: "factura", number: "F-2" }),
        ],
      }),
      documentAnalysisModes: {
        work: "fixed_price_work",
        hours: "hours_project",
      },
    });

    expect(result.rows.map((row) => row.periodId)).toEqual([
      "fixed_price_work",
      "hours_project",
    ]);
    expect(result.rows.every((row) => row.documentCount === 1)).toBe(true);
  });

  it("filtra por cliente y margen bajo", () => {
    const result = report({
      grouping: "client",
      clientId: "client_a",
      lowMarginOnly: true,
      appData: data({
        documents: [
          document({
            id: "low",
            type: "factura",
            number: "F-1",
            customerId: "client_a",
            client: { name: "Cliente A" },
          }),
          document({
            id: "ok",
            type: "factura",
            number: "F-2",
            customerId: "client_b",
            client: { name: "Cliente B" },
          }),
        ],
        expenses: [expense({ id: "e1", amount: 120, workDocumentId: "low" })],
      }),
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      periodId: "client_a",
      lowMarginDocumentsCount: 1,
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

    const result = report({
      appData: data({ documents: [quote, invoice] }),
      documentAnalysisModes: { q1: "fixed_price_work" },
    });

    expect(result.summary.documentCount).toBe(1);
    expect(result.rows[0].modeBreakdown).toMatchObject([
      {
        analysisMode: "fixed_price_work",
        documentCount: 1,
      },
    ]);
  });

  it("usa rectificativa vigente sin duplicar ingresos en evolucion", () => {
    const original = document({
      id: "i1",
      type: "factura",
      number: "F-1",
      status: "rectificada",
      rectifiedById: "r1",
    });
    const rectification = document({
      id: "r1",
      type: "factura",
      number: "FR-1",
      date: "2026-07-02",
      items: [
        {
          id: "line_rect",
          description: "Servicio corregido",
          quantity: 1,
          unitPrice: 80,
          ivaPercent: 21,
        },
      ],
      rectification: {
        originalDocumentId: "i1",
        originalNumber: "F-1",
        originalDate: "2026-07-01",
        reason: "Error en datos",
        type: "correccion",
      },
    });

    const result = report({
      appData: data({
        documents: [original, rectification],
        expenses: [expense({ id: "e1", amount: 20, workDocumentId: "i1" })],
      }),
    });

    expect(result.summary).toMatchObject({
      documentCount: 1,
      incomeWithoutIndirectTax: 80,
      totalDirectCosts: 20,
      operatingProfit: 60,
    });
    expect(result.rows).toHaveLength(1);
  });

  it("soporta documentos sin cliente y sin modo de analisis", () => {
    const invoice = document({ id: "i1", type: "factura", number: "F-1" });
    const invoiceWithoutClient: Partial<Document> = { ...invoice };
    delete invoiceWithoutClient.customerId;
    delete invoiceWithoutClient.client;
    const source: AppData = {
      ...EMPTY_DATA,
      documents: [invoiceWithoutClient as Document],
    };

    const result = report({ appData: source });
    const numericValues = Object.values(result.summary).filter(
      (value): value is number => typeof value === "number",
    );

    expect(result.summary.documentsWithoutAnalysisMode).toBe(1);
    expect(numericValues.every(Number.isFinite)).toBe(true);
  });

  it("no muta AppData", () => {
    const source = data({
      documents: [document({ id: "i1", type: "factura", number: "F-1" })],
    });
    const before = JSON.parse(JSON.stringify(source));

    report({ appData: source });

    expect(source).toEqual(before);
  });
});
