import {
  LOCKED_DELETE_MESSAGE,
  canPhysicallyDeleteDocument,
} from "./document-integrity/deletion";
import { lineMoneyAmounts } from "./calculations";
import type { Document, LineItem, RectificationType } from "./types";

export type DeleteWarningLevel = "simple" | "legal" | "legal_strict";

export interface DeletePolicy {
  allowed: boolean;
  level: DeleteWarningLevel;
  title: string;
  message: string;
}

export function isRectificativa(doc: Document): boolean {
  return Boolean(doc.rectification);
}

export function canRectifyInvoice(doc: Document): boolean {
  return (
    doc.type === "factura" &&
    !doc.rectification &&
    !doc.rectifiedById &&
    !doc.receiptDocumentId &&
    doc.snapshotIntegrity?.status !== "blocked" &&
    doc.status !== "borrador" &&
    doc.status !== "rectificada" &&
    doc.status !== "anulada"
  );
}

export function rectificationUnavailableMessage(doc: Document): string {
  if (doc.receiptDocumentId) {
    return "Esta factura tiene un recibo emitido vinculado; no se puede rectificar hasta disponer de anulación/rectificación explícita del recibo.";
  }
  if (doc.rectifiedById) {
    return "Esta factura ya tiene una rectificativa asociada.";
  }
  if (doc.rectification) {
    return "Este documento ya es una factura rectificativa.";
  }
  return "Solo puedes rectificar facturas enviadas, pagadas o vencidas. Los borradores se pueden editar o borrar.";
}

const RECTIFICAR_EN_LUGAR_DE_BORRAR = `Las facturas emitidas deben conservarse (mínimo 4 años) y no se pueden eliminar.

Ante un error, la vía correcta según Hacienda es emitir una factura rectificativa: anulación total (R1) o corrección de datos/importes (R4). Usa el botón «Rectificar» en el listado.`;

export function getDeletePolicy(doc: Document): DeletePolicy {
  if (!canPhysicallyDeleteDocument(doc)) {
    return {
      allowed: false,
      level: doc.type === "factura" ? "legal" : "legal_strict",
      title: "No se puede borrar",
      message:
        doc.type === "factura"
          ? RECTIFICAR_EN_LUGAR_DE_BORRAR
          : LOCKED_DELETE_MESSAGE,
    };
  }

  if (doc.type !== "factura") {
    return {
      allowed: true,
      level: "simple",
      title: `¿Borrar ${doc.number}?`,
      message:
        "Los números posteriores se reordenarán para que la numeración cuadre.",
    };
  }

  if (
    doc.status === "borrador" &&
    !doc.rectifiedById
  ) {
    return {
      allowed: true,
      level: "simple",
      title: `¿Borrar borrador ${doc.number}?`,
      message: "Es un borrador. Puedes eliminarlo sin problema.",
    };
  }

  if (doc.rectification) {
    return {
      allowed: false,
      level: "legal_strict",
      title: "No se puede borrar",
      message: `Esta factura rectificativa (${doc.number}) es un registro fiscal vinculado a ${doc.rectification.originalNumber}.

${RECTIFICAR_EN_LUGAR_DE_BORRAR}`,
    };
  }

  if (doc.rectifiedById) {
    return {
      allowed: false,
      level: "legal_strict",
      title: "No se puede borrar",
      message: `Esta factura ya tiene una rectificativa asociada.

${RECTIFICAR_EN_LUGAR_DE_BORRAR}`,
    };
  }

  return {
    allowed: false,
    level: "legal",
    title: "No se puede borrar",
    message: RECTIFICAR_EN_LUGAR_DE_BORRAR,
  };
}

/** @deprecated Usar getDeletePolicy */
export function canDeleteDocument(doc: Document): boolean {
  return getDeletePolicy(doc).allowed;
}

export function itemsForAnulacion(items: LineItem[]): LineItem[] {
  return items.map((item) => ({
    id: crypto.randomUUID(),
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    // Invertir un solo factor mantiene la cancelación algebraica exacta de
    // ventas, descuentos y cantidades negativas de la factura original.
    unitPrice: -item.unitPrice,
    ivaPercent: item.ivaPercent,
  }));
}

export function cloneItemsForCorreccion(items: LineItem[]): LineItem[] {
  return items.map((item) => ({
    id: crypto.randomUUID(),
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    ivaPercent: item.ivaPercent,
  }));
}

export function rectificationLineDisplayTotal(
  item: LineItem,
  vatExempt = false,
): number {
  return lineMoneyAmounts(item, vatExempt).total;
}

export function rectificationTextDefaults(
  original: Pick<Document, "notes" | "paymentTerms">,
  fallbackPaymentTerms = "",
): { notes: string; paymentTerms: string } {
  return {
    notes: original.notes ?? "",
    paymentTerms: original.paymentTerms?.trim()
      ? original.paymentTerms
      : fallbackPaymentTerms.trim(),
  };
}

export function rectificationTypeLabel(type: RectificationType): string {
  return type === "anulacion" ? "Anulación total" : "Corrección de datos";
}

export function originalStatusAfterRectification(
  type: RectificationType,
): "anulada" | "rectificada" {
  return type === "anulacion" ? "anulada" : "rectificada";
}
