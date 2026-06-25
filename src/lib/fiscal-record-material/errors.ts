export type FiscalRecordMaterialErrorCode =
  | "OPERATION_NOT_PROCESSING"
  | "INVOICE_IDENTITY_MISSING"
  | "SNAPSHOT_HASH_MISSING"
  | "ISSUER_NIF_MISSING"
  | "NUMSERIE_MISSING"
  | "FECHA_EXPEDICION_MISSING";

const DEFAULT_MESSAGES: Record<FiscalRecordMaterialErrorCode, string> = {
  OPERATION_NOT_PROCESSING:
    "La operacion fiscal debe estar en processing para preparar material preliminar.",
  INVOICE_IDENTITY_MISSING:
    "El material fiscal preliminar necesita identidad fiscal reservada.",
  SNAPSHOT_HASH_MISSING:
    "El material fiscal preliminar necesita documentSnapshotHash.",
  ISSUER_NIF_MISSING:
    "El material fiscal preliminar necesita issuerNif.",
  NUMSERIE_MISSING:
    "El material fiscal preliminar necesita numserie.",
  FECHA_EXPEDICION_MISSING:
    "El material fiscal preliminar necesita fecha de expedicion.",
};

export class FiscalRecordMaterialError extends Error {
  readonly code: FiscalRecordMaterialErrorCode;

  constructor(
    code: FiscalRecordMaterialErrorCode,
    message = DEFAULT_MESSAGES[code],
  ) {
    super(message);
    this.name = "FiscalRecordMaterialError";
    this.code = code;
  }
}

export function fiscalRecordMaterialErrorMessage(
  code: FiscalRecordMaterialErrorCode,
): string {
  return DEFAULT_MESSAGES[code];
}
