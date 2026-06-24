import {
  deriveDocumentLifecycle,
  isDocumentIntegrityLocked,
} from "@/lib/document-integrity";
import type { Document } from "@/lib/types";

export const LOCKED_DELETE_MESSAGE =
  "Este documento ya está emitido y no puede borrarse. Podrás anularlo o rectificarlo en un flujo específico.";

export function isDocumentDeletionProtected(doc: Document): boolean {
  return (
    isDocumentIntegrityLocked(doc) ||
    deriveDocumentLifecycle(doc) !== "draft" ||
    doc.status !== "borrador" ||
    Boolean(doc.documentSnapshot) ||
    Boolean(doc.pdfSnapshot)
  );
}

export function canPhysicallyDeleteDocument(doc: Document): boolean {
  return !isDocumentDeletionProtected(doc);
}

export function isDocumentRenumberProtected(doc: Document): boolean {
  return isDocumentDeletionProtected(doc);
}

export function canRenumberDocument(doc: Document): boolean {
  return !isDocumentRenumberProtected(doc);
}
