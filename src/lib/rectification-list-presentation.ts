import type { Document, RectificationInfo } from "./types";

export interface CancellationListPresentation {
  cashImpact: 0;
  description: string;
  title: string;
}

function rectificationInfo(
  document: Document | undefined,
): RectificationInfo | undefined {
  return document?.documentSnapshot?.rectification ?? document?.rectification;
}

function cancellationForDocument(
  document: Document,
  documents: Document[],
): Document | undefined {
  if (rectificationInfo(document)?.type === "anulacion") return document;
  if (!document.rectifiedById) return undefined;

  const rectification = documents.find(
    (candidate) => candidate.id === document.rectifiedById,
  );
  return rectificationInfo(rectification)?.type === "anulacion"
    ? rectification
    : undefined;
}

export function cancellationListPresentationForDocument(
  document: Document,
  documents: Document[],
): CancellationListPresentation | null {
  const cancellation = cancellationForDocument(document, documents);
  if (!cancellation) return null;

  if (cancellation.id === document.id) {
    const originalNumber =
      rectificationInfo(cancellation)?.originalNumber || "la factura original";
    return {
      cashImpact: 0,
      title: "Anulación total",
      description: `Invalida ${originalNumber}. No registra por sí sola un cobro ni una pérdida de caja.`,
    };
  }

  return {
    cashImpact: 0,
    title: "Factura anulada",
    description: `${cancellation.number} la deja sin efecto. La pareja no suma ni resta cobros.`,
  };
}
