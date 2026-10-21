import { editableQuoteWithLocalStatus } from "@/lib/document-integrity/quote-status";
import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import type { BusinessProfile, Document } from "@/lib/types";
import { quickClientSnapshot } from "./client-snapshot";
import { quickPdfContext } from "./context";
import { quickPaymentTerms, type QuickIntent } from "./model";

/** The authority supplies the number; quotes keep the normal editable lifecycle. */
export function buildQuickDocumentPayload(
  intent: QuickIntent,
  profile: BusinessProfile,
  createdAt: string,
): Omit<Document, "number"> {
  const id = `quick-${intent.operationId}`;
  const base: Omit<Document, "number"> = {
    id,
    type: intent.kind,
    date: intent.date,
    customerId: intent.customerId ?? id,
    client: quickClientSnapshot(intent.client),
    items: intent.items,
    notes: intent.notes,
    status: intent.kind === "factura" && intent.paid ? "pagado" : "enviado",
    salesTerms: quickPaymentTerms(intent.paymentMethod, intent.paid, profile.iban ?? ""),
    quickPdfContext: quickPdfContext(profile),
    createdAt,
    updatedAt: createdAt,
  };
  if (intent.kind === "factura") {
    return {
      ...base,
      issuer: captureIssuerSnapshot(profile, createdAt),
      issuedAt: createdAt,
      paymentStatus: intent.paid ? "paid" : "pending",
      ...(intent.paid ? { paidAt: createdAt } : {}),
    };
  }

  // Issuer/issuedAt belong to the invoice emission contract. On an ordinary
  // quote they would be interpreted as protected historical evidence by Factu.
  const quote: Omit<Document, "number"> & { number?: string } =
    editableQuoteWithLocalStatus({ ...base, number: "CENTRAL-PENDING" }, createdAt);
  delete quote.number;
  if ((profile.quoteValidityDays ?? 0) > 0) {
    const until = new Date(`${intent.date}T12:00:00Z`);
    until.setUTCDate(until.getUTCDate() + (profile.quoteValidityDays ?? 0));
    quote.dueDate = until.toISOString().slice(0, 10);
  }
  return quote;
}
