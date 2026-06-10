import type { Document } from "../types";
import { celebrateFactuMilestone } from "./occasional";

export function isEmittedFactura(doc: Document): boolean {
  return doc.type === "factura" && doc.status !== "borrador";
}

export function maybeCelebrateFirstInvoice(
  documents: Document[],
  saved: Document,
): void {
  if (!isEmittedFactura(saved)) return;
  const otherEmitted = documents.filter(
    (doc) => doc.id !== saved.id && isEmittedFactura(doc),
  );
  if (otherEmitted.length === 0) {
    celebrateFactuMilestone("first-invoice");
  }
}

export function maybeCelebrateFirstRectificativa(
  documents: Document[],
  saved: Document,
): void {
  if (!saved.rectification) return;
  const others = documents.filter(
    (doc) => doc.id !== saved.id && Boolean(doc.rectification),
  );
  if (others.length === 0) {
    celebrateFactuMilestone("first-rectificativa");
  }
}

export function maybeCelebrateFirstCustomer(
  customerCountBefore: number,
): void {
  if (customerCountBefore === 0) {
    celebrateFactuMilestone("first-customer");
  }
}
