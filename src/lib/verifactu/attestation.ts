import type { Document } from "../types";

/**
 * Todavía no existe un contrato de atestación autenticada entre el servidor y
 * el cliente. `verifactuPersistence: "server_confirmed"` forma parte del dato
 * sincronizable y, por tanto, no puede acreditar por sí solo una presentación.
 */
export function hasAuthenticatedVerifactuAttestation(
  doc: Document,
): boolean {
  void doc;
  return false;
}

/**
 * Única frontera para cualquier acreditación visible (QR, distintivo o cadena
 * presentada como confirmada). Se mantiene cerrada hasta disponer de una
 * atestación de servidor verificable y vinculada al documento canónico.
 */
export function hasPublicVerifactuAccreditation(doc: Document): boolean {
  return Boolean(
    hasAuthenticatedVerifactuAttestation(doc) &&
      doc.verifactuPersistence === "server_confirmed" &&
      doc.verifactu?.qrUrl &&
      (doc.verifactu.status === "registered" ||
        doc.verifactu.status === "test_registered"),
  );
}
