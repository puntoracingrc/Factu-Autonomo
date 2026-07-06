import type { AppData, Document } from "@/lib/types";
import {
  rentabilidadRealDocumentClientId,
  rentabilidadRealDocumentClientName,
} from "@/lib/rentabilidad-real/document-client";
import {
  isSupersededRentabilidadRealDocument,
  rectificationChainDocumentIds,
  sourceQuoteDocumentIdForRentabilidadInvoice,
} from "@/lib/rentabilidad-real/document-chain";
import type {
  RentabilidadRealAnalysisUnit,
  RentabilidadRealAnalysisUnitSourceType,
} from "./types";

function clientIdForDocument(document: Document): string {
  return rentabilidadRealDocumentClientId(document);
}

function clientNameForDocument(document: Document): string {
  return rentabilidadRealDocumentClientName(document);
}

function hasLinkedExpenses(appData: AppData, documentIds: readonly string[]) {
  const ids = new Set(documentIds);
  return appData.expenses.some(
    (expense) => expense.workDocumentId && ids.has(expense.workDocumentId),
  );
}

function unitId(
  sourceType: RentabilidadRealAnalysisUnitSourceType,
  primaryDocumentId: string,
) {
  return `${sourceType}:${primaryDocumentId}`;
}

function invoiceUnit(appData: AppData, invoice: Document): RentabilidadRealAnalysisUnit {
  const relatedDocumentIds = rectificationChainDocumentIds(
    invoice,
    appData.documents,
  );
  const sourceQuoteDocumentId = sourceQuoteDocumentIdForRentabilidadInvoice(
    invoice,
    appData.documents,
  );
  return {
    id: unitId("invoice", invoice.id),
    primaryDocumentId: invoice.id,
    sourceType: "invoice",
    invoiceDocumentId: invoice.id,
    sourceQuoteDocumentId,
    clientId: clientIdForDocument(invoice),
    clientName: clientNameForDocument(invoice),
    date: invoice.date,
    documentNumber: invoice.number,
    title: `Factura ${invoice.number}`,
    status: invoice.status,
    relatedDocumentIds,
    hasInvoice: true,
    hasQuote: false,
    hasLinkedExpenses: hasLinkedExpenses(appData, relatedDocumentIds),
    hasInternalAdjustments: false,
    warnings: [
      {
        code: sourceQuoteDocumentId
          ? "invoice_source_quote_not_found"
          : "invoice_without_quote",
        message: sourceQuoteDocumentId
          ? "Esta factura declara un presupuesto origen que no se ha encontrado."
          : "Esta factura no tiene presupuesto origen y se analizará como independiente.",
        severity: sourceQuoteDocumentId ? "risk" : "info",
      },
    ],
  };
}

function quoteUnit(appData: AppData, quote: Document): RentabilidadRealAnalysisUnit {
  const relatedDocumentIds = [quote.id];
  return {
    id: unitId("quote", quote.id),
    primaryDocumentId: quote.id,
    sourceType: "quote",
    quoteDocumentId: quote.id,
    clientId: clientIdForDocument(quote),
    clientName: clientNameForDocument(quote),
    date: quote.date,
    documentNumber: quote.number,
    title: `Presupuesto ${quote.number}`,
    status: quote.status,
    relatedDocumentIds,
    hasInvoice: false,
    hasQuote: true,
    hasLinkedExpenses: hasLinkedExpenses(appData, relatedDocumentIds),
    hasInternalAdjustments: false,
    warnings: [
      {
        code: "quote_without_invoice",
        message:
          "Este presupuesto no tiene factura vinculada y se analizará como rentabilidad prevista.",
        severity: "info",
      },
    ],
  };
}

function pairUnit(
  appData: AppData,
  quote: Document,
  invoice: Document,
): RentabilidadRealAnalysisUnit {
  const relatedDocumentIds = [
    quote.id,
    ...rectificationChainDocumentIds(invoice, appData.documents),
  ];
  return {
    id: unitId("quote_invoice_pair", invoice.id),
    primaryDocumentId: invoice.id,
    sourceType: "quote_invoice_pair",
    quoteDocumentId: quote.id,
    invoiceDocumentId: invoice.id,
    sourceQuoteDocumentId: quote.id,
    clientId: clientIdForDocument(invoice),
    clientName: clientNameForDocument(invoice),
    date: invoice.date,
    documentNumber: `${quote.number} -> ${invoice.number}`,
    title: `Presupuesto ${quote.number} / Factura ${invoice.number}`,
    status: invoice.status,
    relatedDocumentIds,
    hasInvoice: true,
    hasQuote: true,
    hasLinkedExpenses: hasLinkedExpenses(appData, relatedDocumentIds),
    hasInternalAdjustments: false,
    warnings: [],
  };
}

export function dedupeQuoteInvoicePairs(appData: AppData): {
  units: RentabilidadRealAnalysisUnit[];
  pairedQuoteIds: Set<string>;
  pairedInvoiceIds: Set<string>;
} {
  const quotesById = new Map(
    appData.documents
      .filter((document) => document.type === "presupuesto")
      .map((quote) => [quote.id, quote]),
  );
  const pairedQuoteIds = new Set<string>();
  const pairedInvoiceIds = new Set<string>();
  const units: RentabilidadRealAnalysisUnit[] = [];

  for (const invoice of appData.documents.filter(
    (document) =>
      document.type === "factura" &&
      !isSupersededRentabilidadRealDocument(document),
  )) {
    const sourceQuoteDocumentId = sourceQuoteDocumentIdForRentabilidadInvoice(
      invoice,
      appData.documents,
    );
    const quote = sourceQuoteDocumentId
      ? quotesById.get(sourceQuoteDocumentId)
      : undefined;

    if (!quote) continue;
    pairedQuoteIds.add(quote.id);
    pairedInvoiceIds.add(invoice.id);
    units.push(pairUnit(appData, quote, invoice));
  }

  return {
    units,
    pairedQuoteIds,
    pairedInvoiceIds,
  };
}

export function buildRentabilidadRealAnalysisUnits(
  appData: AppData,
): RentabilidadRealAnalysisUnit[] {
  const { units, pairedQuoteIds, pairedInvoiceIds } =
    dedupeQuoteInvoicePairs(appData);
  const result = [...units];

  for (const invoice of appData.documents.filter(
    (document) =>
      document.type === "factura" &&
      !isSupersededRentabilidadRealDocument(document) &&
      !pairedInvoiceIds.has(document.id),
  )) {
    result.push(invoiceUnit(appData, invoice));
  }

  for (const quote of appData.documents.filter(
    (document) =>
      document.type === "presupuesto" && !pairedQuoteIds.has(document.id),
  )) {
    result.push(quoteUnit(appData, quote));
  }

  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export function getRelatedDocumentIdsForAnalysisUnit(
  unit: RentabilidadRealAnalysisUnit,
): string[] {
  return [...unit.relatedDocumentIds];
}

export function getAnalysisUnitDisplayName(
  unit: RentabilidadRealAnalysisUnit,
): string {
  return unit.title;
}
