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

const LEGAL_BASE = `Según la normativa española de facturación, las facturas emitidas deben conservarse durante al menos 4 años y no deberían eliminarse si ya se entregaron al cliente o a Hacienda.

Lo correcto ante un error es emitir una factura rectificativa, no borrar la factura.

Si la eliminas igualmente, lo haces bajo tu propia responsabilidad.`;

export function getDeletePolicy(doc: Document): DeletePolicy {
  if (doc.type !== "factura") {
    return {
      allowed: true,
      level: "simple",
      title: `¿Borrar ${doc.number}?`,
      message:
        "Los números posteriores se reordenarán para que la numeración cuadre.",
    };
  }

  if (doc.rectification) {
    return {
      allowed: true,
      level: "legal_strict",
      title: `¿Borrar factura rectificativa ${doc.number}?`,
      message: `${LEGAL_BASE}

Esta es una factura rectificativa vinculada a ${doc.rectification.originalNumber}. Borrarla puede dejar incoherente tu historial fiscal.`,
    };
  }

  if (doc.rectifiedById) {
    return {
      allowed: true,
      level: "legal_strict",
      title: `¿Borrar factura ${doc.number}?`,
      message: `${LEGAL_BASE}

Esta factura tiene una rectificativa asociada. Borrarla puede dejar incoherente tu historial.`,
    };
  }

  if (doc.status === "borrador") {
    return {
      allowed: true,
      level: "simple",
      title: `¿Borrar borrador ${doc.number}?`,
      message: "Es un borrador. Puedes eliminarlo sin problema.",
    };
  }

  return {
    allowed: true,
    level: "legal",
    title: `¿Borrar factura emitida ${doc.number}?`,
    message: LEGAL_BASE,
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
