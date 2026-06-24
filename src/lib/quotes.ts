import { deriveDocumentLifecycle } from "./document-integrity";
import type { Document } from "./types";

export function canMarkQuoteAsAccepted(doc: Document): boolean {
  return (
    doc.type === "presupuesto" &&
    doc.status !== "anulada" &&
    deriveDocumentLifecycle(doc) === "issued"
  );
}

export function isAcceptedQuote(doc: Document): boolean {
  return (
    doc.type === "presupuesto" &&
    (doc.status === "aceptado" || doc.status === "pagado")
  );
}

export function statusAfterUnmarkingQuoteAcceptance(): Document["status"] {
  return "enviado";
}

/** Presupuestos antiguos podían quedar como «pagado»; los normalizamos a «aceptado». */
export function normalizeQuoteDocument(doc: Document): Document {
  if (doc.type !== "presupuesto" || doc.status !== "pagado") return doc;
  return { ...doc, status: "aceptado" };
}
