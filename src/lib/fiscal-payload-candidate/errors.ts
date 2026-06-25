export type FiscalPayloadCandidateErrorReason =
  | "record_id_missing"
  | "operation_id_missing"
  | "operation_mismatch"
  | "operation_type_mismatch"
  | "identity_missing"
  | "identity_mismatch"
  | "issuer_nif_missing"
  | "numserie_missing"
  | "fecha_expedicion_missing"
  | "record_hash_missing"
  | "record_hash_not_normalized"
  | "previous_hash_missing"
  | "previous_hash_not_normalized"
  | "record_sequence_invalid"
  | "chain_state_missing"
  | "chain_state_inconsistent"
  | "unsupported_record_type";

const DEFAULT_MESSAGES: Record<FiscalPayloadCandidateErrorReason, string> = {
  record_id_missing: "El payload candidato necesita recordId.",
  operation_id_missing: "El payload candidato necesita operationId.",
  operation_mismatch: "La operacion fiscal no corresponde al registro.",
  operation_type_mismatch:
    "El tipo de operacion fiscal no corresponde al tipo de registro.",
  identity_missing: "El payload candidato necesita identidad fiscal.",
  identity_mismatch: "La identidad fiscal no corresponde al registro.",
  issuer_nif_missing: "El payload candidato necesita issuerNif.",
  numserie_missing: "El payload candidato necesita numserie.",
  fecha_expedicion_missing:
    "El payload candidato necesita fechaExpedicion.",
  record_hash_missing: "El payload candidato necesita recordHash.",
  record_hash_not_normalized:
    "recordHash debe estar normalizado como sha256:<64 hex>.",
  previous_hash_missing:
    "Un registro posterior necesita previousHash.",
  previous_hash_not_normalized:
    "previousHash debe estar normalizado como sha256:<64 hex>.",
  record_sequence_invalid:
    "recordSequence debe ser un entero positivo.",
  chain_state_missing: "El payload candidato necesita estado de cadena.",
  chain_state_inconsistent:
    "El estado de cadena no corresponde al registro fiscal.",
  unsupported_record_type:
    "El tipo de registro fiscal no esta soportado por el payload candidato.",
};

export class FiscalPayloadCandidateError extends Error {
  readonly reason: FiscalPayloadCandidateErrorReason;

  constructor(
    reason: FiscalPayloadCandidateErrorReason,
    message = DEFAULT_MESSAGES[reason],
  ) {
    super(message);
    this.name = "FiscalPayloadCandidateError";
    this.reason = reason;
  }
}

export function fiscalPayloadCandidateErrorMessage(
  reason: FiscalPayloadCandidateErrorReason,
): string {
  return DEFAULT_MESSAGES[reason];
}
