export type FiscalEvidencePacketErrorCode =
  | "record_missing"
  | "payload_missing"
  | "validation_missing"
  | "payload_not_validated"
  | "payload_invalid"
  | "payload_record_mismatch"
  | "chain_state_missing"
  | "chain_state_inconsistent";

const DEFAULT_MESSAGES: Record<FiscalEvidencePacketErrorCode, string> = {
  record_missing: "El paquete de evidencia necesita registro fiscal.",
  payload_missing: "El paquete de evidencia necesita payload candidato.",
  validation_missing:
    "El paquete de evidencia necesita resultado de validacion semantica.",
  payload_not_validated:
    "El payload candidato debe validarse antes de crear evidencia.",
  payload_invalid:
    "No se puede crear evidencia interna desde un payload invalido.",
  payload_record_mismatch:
    "El payload candidato no corresponde al registro fiscal.",
  chain_state_missing: "El paquete de evidencia necesita estado de cadena.",
  chain_state_inconsistent:
    "El estado de cadena no cubre el registro fiscal de la evidencia.",
};

export class FiscalEvidencePacketError extends Error {
  readonly code: FiscalEvidencePacketErrorCode;

  constructor(
    code: FiscalEvidencePacketErrorCode,
    message = DEFAULT_MESSAGES[code],
  ) {
    super(message);
    this.name = "FiscalEvidencePacketError";
    this.code = code;
  }
}

export function fiscalEvidencePacketErrorMessage(
  code: FiscalEvidencePacketErrorCode,
): string {
  return DEFAULT_MESSAGES[code];
}
