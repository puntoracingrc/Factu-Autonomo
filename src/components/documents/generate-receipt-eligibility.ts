import { isCollectedDocument } from "@/lib/income";
import type { Document } from "@/lib/types";

export function isReceiptGenerationEligible(doc: Document): boolean {
  return Boolean(
    doc.type === "factura" &&
      isCollectedDocument(doc) &&
      !doc.receiptDocumentId &&
      !doc.rectification &&
      !doc.documentSnapshot?.rectification,
  );
}
