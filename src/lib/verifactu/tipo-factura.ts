import type { Document } from "../types";
import { isRectificativa } from "../rectificativas";

/**
 * Códigos TipoFactura según FAQ AEAT (procedimientos de facturación).
 * F1 = factura ordinaria · R1 = rectificativa art. 80 · R4 = rectificativa resto
 */
export function resolveTipoFactura(doc: Document): string {
  if (!isRectificativa(doc)) return "F1";

  const rectType = doc.rectification?.type;
  if (rectType === "anulacion") return "R1";
  return "R4";
}
