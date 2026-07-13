import type { Document } from "@/lib/types";
import { isDocumentUsableForFinancialCalculations } from "./legacy-import-attestation";
import { withDocumentRelationshipIntegritySignals } from "./relationships";

/**
 * Aplica las comprobaciones que necesitan ver la colección completa antes de
 * que un consumidor sume importes. Entre ellas están los IDs repetidos y las
 * identidades fiscales duplicadas, que no se pueden detectar documento a
 * documento.
 *
 * La función no muta la colección recibida ni sus documentos.
 */
export function withDocumentFinancialIntegritySignals(
  documents: readonly Document[],
): Document[] {
  return withDocumentRelationshipIntegritySignals([...documents]);
}

/** Documentos que pueden alimentar cálculos después de validar la colección. */
export function financiallyUsableDocuments(
  documents: readonly Document[],
): Document[] {
  return withDocumentFinancialIntegritySignals(documents).filter(
    isDocumentUsableForFinancialCalculations,
  );
}
