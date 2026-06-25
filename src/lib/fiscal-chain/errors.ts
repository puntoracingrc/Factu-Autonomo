export type FiscalChainErrorReason =
  | "issuer_nif_missing"
  | "environment_missing"
  | "record_type_missing"
  | "numserie_missing"
  | "fecha_expedicion_missing"
  | "operation_id_missing"
  | "document_snapshot_hash_missing"
  | "record_timestamp_missing"
  | "previous_hash_missing"
  | "previous_hash_not_normalized"
  | "unsupported_hash_algorithm";

const DEFAULT_MESSAGES: Record<FiscalChainErrorReason, string> = {
  issuer_nif_missing:
    "La cadena fiscal candidata necesita issuerNif.",
  environment_missing:
    "La cadena fiscal candidata necesita environment.",
  record_type_missing:
    "La cadena fiscal candidata necesita recordTypeCandidate.",
  numserie_missing:
    "La cadena fiscal candidata necesita numserie.",
  fecha_expedicion_missing:
    "La cadena fiscal candidata necesita fechaExpedicion.",
  operation_id_missing:
    "La cadena fiscal candidata necesita operationId.",
  document_snapshot_hash_missing:
    "La cadena fiscal candidata necesita documentSnapshotHash.",
  record_timestamp_missing:
    "La cadena fiscal candidata necesita recordTimestampCandidate.",
  previous_hash_missing:
    "Un registro posterior necesita previousHash.",
  previous_hash_not_normalized:
    "previousHash debe venir normalizado.",
  unsupported_hash_algorithm:
    "El algoritmo de hash candidato no esta soportado.",
};

export class FiscalChainError extends Error {
  readonly reason: FiscalChainErrorReason;

  constructor(
    reason: FiscalChainErrorReason,
    message = DEFAULT_MESSAGES[reason],
  ) {
    super(message);
    this.name = "FiscalChainError";
    this.reason = reason;
  }
}

export function fiscalChainErrorMessage(
  reason: FiscalChainErrorReason,
): string {
  return DEFAULT_MESSAGES[reason];
}
