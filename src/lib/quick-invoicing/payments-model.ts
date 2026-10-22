import type { QuickReceipt } from "./model";
import { quickTotals } from "./model";

export const QUICK_COLLECTION_FLOW = "factu_quick_collection_v1";

export interface QuickCardPayment {
  status: "open" | "creating" | "paid" | "expired" | "review";
  amount: number;
  url?: string;
  expiresAt?: string;
  paidAt?: string;
  testMode: boolean;
}

export function quickCardAmount(receipt: QuickReceipt): number {
  const doc = receipt.document;
  if (doc.type !== "factura" || doc.paymentStatus === "paid" || doc.status === "pagado"
    || doc.status === "anulada" || doc.status === "rectificada" || doc.receiptDocumentId) {
    throw new Error("Solo se puede preparar el cobro de una factura pendiente sin recibo asociado.");
  }
  const amount = Math.round(quickTotals(doc.items, receipt.profile.vatExempt).total * 100);
  if (!Number.isSafeInteger(amount) || amount < 50 || amount > 99_999_999) {
    throw new Error("El cobro debe estar entre 0,50 € y 999.999,99 €.");
  }
  return amount;
}

export function stripeCheckoutUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname === "checkout.stripe.com" && !url.username && !url.password && !url.port) return url.href;
  } catch { /* Untrusted provider responses never become clickable URLs. */ }
}
