import type { Document, LineItem, RectificationType } from "./types";

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

export function canDeleteDocument(doc: Document): boolean {
  if (doc.type === "factura") {
    if (doc.rectification) return doc.status === "borrador";
    if (doc.rectifiedById) return false;
    return doc.status === "borrador";
  }
  return true;
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
