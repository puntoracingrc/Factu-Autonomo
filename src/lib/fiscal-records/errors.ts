export type FiscalRecordErrorReason =
  | "operation_not_processing"
  | "operation_id_missing"
  | "invoice_identity_missing"
  | "invoice_identity_id_missing"
  | "server_document_id_missing"
  | "issuer_nif_missing"
  | "numserie_missing"
  | "fecha_expedicion_missing"
  | "document_snapshot_hash_missing"
  | "operation_type_missing"
  | "unsupported_operation_type"
  | "material_not_dry_run"
  | "material_operation_mismatch"
  | "material_identity_mismatch"
  | "material_document_mismatch";

const DEFAULT_MESSAGES: Record<FiscalRecordErrorReason, string> = {
  operation_not_processing:
    "La operacion fiscal debe estar en processing para preparar un registro candidato.",
  operation_id_missing:
    "El registro fiscal candidato necesita operationId.",
  invoice_identity_missing:
    "El registro fiscal candidato necesita identidad fiscal.",
  invoice_identity_id_missing:
    "El registro fiscal candidato necesita invoiceIdentityId.",
  server_document_id_missing:
    "El registro fiscal candidato necesita serverDocumentId.",
  issuer_nif_missing:
    "El registro fiscal candidato necesita issuerNif.",
  numserie_missing:
    "El registro fiscal candidato necesita numserie.",
  fecha_expedicion_missing:
    "El registro fiscal candidato necesita fecha de expedicion.",
  document_snapshot_hash_missing:
    "El registro fiscal candidato necesita documentSnapshotHash.",
  operation_type_missing:
    "El registro fiscal candidato necesita operationType.",
  unsupported_operation_type:
    "El tipo de operacion fiscal no esta soportado por el registro candidato.",
  material_not_dry_run:
    "El material fiscal debe ser dry-run preliminar.",
  material_operation_mismatch:
    "El material fiscal no corresponde a la operacion.",
  material_identity_mismatch:
    "El material fiscal no corresponde a la identidad fiscal.",
  material_document_mismatch:
    "El material fiscal no corresponde al documento canonico.",
};

export class FiscalRecordError extends Error {
  readonly reason: FiscalRecordErrorReason;

  constructor(
    reason: FiscalRecordErrorReason,
    message = DEFAULT_MESSAGES[reason],
  ) {
    super(message);
    this.name = "FiscalRecordError";
    this.reason = reason;
  }
}

export function fiscalRecordErrorMessage(
  reason: FiscalRecordErrorReason,
): string {
  return DEFAULT_MESSAGES[reason];
}
