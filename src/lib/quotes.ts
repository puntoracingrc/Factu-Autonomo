import type { Document } from "./types";
import { isUsableLegacyImportedDocument } from "./document-integrity/legacy-import-attestation";

export function canMarkQuoteAsAccepted(doc: Document): boolean {
  return (
    doc.type === "presupuesto" &&
    !isUsableLegacyImportedDocument(doc) &&
    doc.status !== "borrador" &&
    doc.status !== "anulada"
  );
}

export function canMarkQuoteAsRejected(doc: Document): boolean {
  return (
    doc.type === "presupuesto" &&
    !isUsableLegacyImportedDocument(doc) &&
    doc.status !== "borrador" &&
    doc.status !== "anulada"
  );
}

export function isAcceptedQuote(doc: Document): boolean {
  return (
    doc.type === "presupuesto" &&
    (doc.status === "aceptado" || doc.status === "pagado")
  );
}

export function isRejectedQuote(doc: Document): boolean {
  return doc.type === "presupuesto" && doc.status === "rechazado";
}

export function statusAfterUnmarkingQuoteAcceptance(): Document["status"] {
  return "enviado";
}

export function statusAfterUnmarkingQuoteRejection(): Document["status"] {
  return "enviado";
}

/** Presupuestos antiguos podían quedar como «pagado»; los normalizamos a «aceptado». */
export function normalizeQuoteDocument(doc: Document): Document {
  if (doc.type !== "presupuesto" || doc.status !== "pagado") return doc;
  return { ...doc, status: "aceptado" };
}
