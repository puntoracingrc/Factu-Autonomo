import { documentTotals, roundMoney } from "@/lib/calculations";
import { findInvoiceCreatedFromQuote } from "@/lib/quote-to-invoice";
import { rentabilidadRealDocumentClientName } from "@/lib/rentabilidad-real/document-client";
import type { Document } from "@/lib/types";
import type { ProfitabilityQuoteSource } from "./types";

export function mapExistingQuoteToProfitabilityQuote(
  quote: Document,
  documents: Document[] = [],
): ProfitabilityQuoteSource {
  if (quote.type !== "presupuesto") {
    throw new Error("Solo se pueden mapear presupuestos como trabajos previstos.");
  }

  const totals = documentTotals(quote);
  const linkedInvoice = findInvoiceCreatedFromQuote(documents, quote.id);

  return {
    id: quote.id,
    number: quote.number,
    date: quote.date,
    customerId: quote.customerId,
    customerName: rentabilidadRealDocumentClientName(quote),
    status: quote.status,
    acceptanceStatus: quote.acceptanceStatus,
    linkedInvoiceId: linkedInvoice?.id,
    subtotal: roundMoney(totals.subtotal),
    iva: roundMoney(totals.iva),
    total: roundMoney(totals.total),
    lineCount: quote.items.length,
    sourceLink: {
      sourceType: "quote",
      sourceId: quote.id,
      label: `Presupuesto ${quote.number}`,
      href: `/presupuestos/${quote.id}`,
    },
  };
}
