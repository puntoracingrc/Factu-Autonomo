import { documentTotals, roundMoney } from "@/lib/calculations";
import type { Document } from "@/lib/types";
import type { ProfitabilityIncomeSource } from "./types";

export function mapExistingInvoiceToProfitabilityIncome(
  invoice: Document,
): ProfitabilityIncomeSource {
  if (invoice.type !== "factura") {
    throw new Error("Solo se pueden mapear facturas como ingresos.");
  }

  const totals = documentTotals(invoice);

  return {
    id: invoice.id,
    number: invoice.number,
    date: invoice.date,
    customerId: invoice.customerId,
    customerName: invoice.client.name,
    status: invoice.status,
    paymentStatus: invoice.paymentStatus,
    acceptanceStatus: invoice.acceptanceStatus,
    sourceQuoteDocumentId: invoice.sourceQuoteDocumentId,
    sourceQuoteNumber: invoice.sourceQuoteNumber,
    subtotal: roundMoney(totals.subtotal),
    iva: roundMoney(totals.iva),
    total: roundMoney(totals.total),
    lineCount: invoice.items.length,
    sourceLink: {
      sourceType: "invoice",
      sourceId: invoice.id,
      label: `Factura ${invoice.number}`,
      href: `/facturas/${invoice.id}`,
    },
  };
}
