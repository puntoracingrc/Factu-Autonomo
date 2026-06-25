export type FiscalPayloadValidationErrorCode =
  | "payload_missing"
  | "issuer_nif_missing"
  | "numserie_missing"
  | "fecha_expedicion_missing"
  | "environment_missing"
  | "record_id_missing"
  | "operation_id_missing"
  | "record_type_invalid"
  | "record_hash_missing"
  | "record_hash_not_normalized"
  | "record_sequence_invalid"
  | "previous_hash_missing"
  | "previous_hash_not_normalized"
  | "first_record_previous_hash_present"
  | "finality_invalid"
  | "transportable_invalid"
  | "candidate_xml_unmarked"
  | "signature_detected"
  | "certificate_detected"
  | "aeat_endpoint_detected"
  | "transport_metadata_detected"
  | "secret_detected"
  | "document_snapshot_detected";

const DEFAULT_MESSAGES: Record<FiscalPayloadValidationErrorCode, string> = {
  payload_missing: "El payload candidato es obligatorio.",
  issuer_nif_missing: "issuerNif es obligatorio.",
  numserie_missing: "numserie es obligatorio.",
  fecha_expedicion_missing: "fechaExpedicion es obligatoria.",
  environment_missing: "environment es obligatorio.",
  record_id_missing: "recordId es obligatorio.",
  operation_id_missing: "operationId es obligatorio.",
  record_type_invalid: "recordType debe ser alta o anulacion.",
  record_hash_missing: "recordHash es obligatorio.",
  record_hash_not_normalized:
    "recordHash debe estar normalizado como sha256:<64 hex>.",
  record_sequence_invalid: "recordSequence debe ser un entero positivo.",
  previous_hash_missing:
    "previousHash es obligatorio cuando recordSequence es mayor que 1.",
  previous_hash_not_normalized:
    "previousHash debe estar normalizado como sha256:<64 hex>.",
  first_record_previous_hash_present:
    "El primer registro no debe traer previousHash ni previousRecordId.",
  finality_invalid: "finality debe ser candidate_not_aeat.",
  transportable_invalid: "transportable debe ser false.",
  candidate_xml_unmarked:
    "El XML candidato debe estar marcado como no definitivo y no AEAT.",
  signature_detected: "Se ha detectado firma o metadatos de firma.",
  certificate_detected: "Se ha detectado certificado o clave privada.",
  aeat_endpoint_detected: "Se ha detectado endpoint o nomenclatura AEAT real.",
  transport_metadata_detected:
    "Se han detectado metadatos de transporte real.",
  secret_detected: "Se han detectado tokens, service role o secretos.",
  document_snapshot_detected:
    "Se ha detectado payload documental o snapshot completo.",
};

export class FiscalPayloadValidationError extends Error {
  readonly code: FiscalPayloadValidationErrorCode;

  constructor(
    code: FiscalPayloadValidationErrorCode,
    message = DEFAULT_MESSAGES[code],
  ) {
    super(message);
    this.name = "FiscalPayloadValidationError";
    this.code = code;
  }
}

export function fiscalPayloadValidationErrorMessage(
  code: FiscalPayloadValidationErrorCode,
): string {
  return DEFAULT_MESSAGES[code];
}
