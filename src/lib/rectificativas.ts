import {
  LOCKED_DELETE_MESSAGE,
  canPhysicallyDeleteDocument,
} from "./document-integrity/deletion";
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
    doc.status !== "borrador" &&
    doc.status !== "anulada"
  );
}

const RECTIFICAR_EN_LUGAR_DE_BORRAR = `Las facturas emitidas deben conservarse (mínimo 4 años) y no se pueden eliminar.

Ante un error, la vía correcta según Hacienda es emitir una factura rectificativa: anulación total (R1) o corrección de importes (R4). Usa el botón «Rectificar» en el listado.`;

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
    !doc.rectification &&
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
    ...item,
    id: crypto.randomUUID(),
    quantity: Math.abs(item.quantity),
    unitPrice: -Math.abs(item.unitPrice),
  }));
}

export function cloneItemsForCorreccion(items: LineItem[]): LineItem[] {
  return items.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
  }));
}

export function rectificationTypeLabel(type: RectificationType): string {
  return type === "anulacion" ? "Anulación total" : "Corrección de importes";
}

export function originalStatusAfterRectification(
  type: RectificationType,
): "anulada" | "rectificada" {
  return type === "anulacion" ? "anulada" : "rectificada";
}
