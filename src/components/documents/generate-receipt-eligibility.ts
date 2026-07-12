import { isCollectedDocument } from "@/lib/income";
import type { AppDataDurabilityBlockedReason } from "@/lib/app-data-durability";
import type { ReceiptGenerationBlockedReason } from "@/lib/receipts";
import type { Document } from "@/lib/types";

export type ReceiptGenerationFeedbackReason =
  | ReceiptGenerationBlockedReason
  | AppDataDurabilityBlockedReason;

export function isReceiptGenerationEligible(doc: Document): boolean {
  return Boolean(
    doc.type === "factura" &&
      isCollectedDocument(doc) &&
      !doc.receiptDocumentId &&
      !doc.rectification &&
      !doc.documentSnapshot?.rectification,
  );
}

export function receiptGenerationBlockedMessage(
  reason: ReceiptGenerationFeedbackReason,
): string {
  switch (reason) {
    case "invoice_not_found":
      return "No se encuentra una única factura de origen. Recarga y comprueba que el documento siga disponible.";
    case "invoice_not_collected":
      return "Marca primero la factura como cobrada. Generar un recibo no realiza ningún cobro bancario.";
    case "invoice_integrity_blocked":
      return "No se puede generar el recibo porque la integridad de la factura está bloqueada. Conserva su PDF y una copia de seguridad para una revisión explícita.";
    case "invoice_rectification":
      return "Una factura rectificativa no puede generar un recibo desde esta acción.";
    case "receipt_link_missing":
      return "La factura conserva un vínculo de recibo, pero ese recibo no aparece. No se creará otro: conserva una copia y revisa la relación.";
    case "receipt_link_ambiguous":
      return "Hay más de un recibo que reclama esta factura. No se creará otro hasta revisar la relación de forma explícita.";
    case "source_invalid":
      return "La factura no permite reproducir un recibo canónico con sus importes y evidencias congeladas. No se ha guardado ningún recibo.";
    case "generated_relationship_invalid":
      return "El recibo preparado no superó la comprobación final de integridad y no se ha guardado.";
    case "quota_exceeded":
      return "No hay espacio suficiente para guardar el recibo con seguridad. Exporta una copia y libera espacio antes de reintentarlo.";
    case "storage_unavailable":
      return "El navegador no permite guardar ahora. Habilita el almacenamiento local o prueba de nuevo sin cerrar esta pestaña.";
    case "serialization_failed":
      return "No se pudo preparar el guardado durable. El recibo no se ha añadido.";
    case "protected_existing_data":
      return "El guardado se detuvo para no sustituir una copia anterior protegida. Recarga o exporta una copia antes de continuar.";
    case "stale_precondition":
      return "Los datos cambiaron mientras se preparaba el recibo. Revisa la factura y vuelve a intentarlo.";
    case "write_failed":
    case "verification_failed":
      return "No se pudo confirmar el guardado del recibo. No se ha publicado en la aplicación.";
    case "transition_failed":
    case "identifier_collision":
    case "not_found":
      return "No se pudo completar la generación sin poner en riesgo los datos. No se ha guardado ningún recibo.";
  }
}
