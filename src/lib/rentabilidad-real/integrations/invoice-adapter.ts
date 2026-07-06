import { documentTotals, roundMoney } from "@/lib/calculations";
import { rentabilidadRealDocumentClientName } from "@/lib/rentabilidad-real/document-client";
import type { Document } from "@/lib/types";
import type { ProfitabilityIncomeSource } from "./types";

export function mapExistingInvoiceToProfitabilityIncome(
  invoice: Document,
): ProfitabilityIncomeSource {
  if (invoice.type !== "factura") {
    throw new Error("Solo se pueden mapear facturas como ingresos.");
  }

  const totals = documentTotals(invoice);
  const isTotalRectification = invoice.rectification?.type === "anulacion";
  const subtotal = isTotalRectification ? 0 : roundMoney(totals.subtotal);
  const iva = isTotalRectification ? 0 : roundMoney(totals.iva);
  const total = isTotalRectification ? 0 : roundMoney(totals.total);

  return {
    id: invoice.id,
    number: invoice.number,
    date: invoice.date,
    customerId: invoice.customerId,
    customerName: rentabilidadRealDocumentClientName(invoice),
    status: invoice.status,
    paymentStatus: invoice.paymentStatus,
    acceptanceStatus: invoice.acceptanceStatus,
    sourceQuoteDocumentId: invoice.sourceQuoteDocumentId,
    sourceQuoteNumber: invoice.sourceQuoteNumber,
    subtotal,
    iva,
    total,
    lineCount: invoice.items.length,
    sourceLink: {
      sourceType: "invoice",
      sourceId: invoice.id,
      label: `Factura ${invoice.number}`,
      href: `/facturas/${invoice.id}`,
    },
  };
}
