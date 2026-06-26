export type SyntheticFixturePolicyErrorCode =
  | "descriptor_missing"
  | "field_not_allowed"
  | "id_missing"
  | "id_prefix_invalid"
  | "synthetic_only_invalid"
  | "kind_invalid"
  | "purpose_missing"
  | "source_phase_invalid"
  | "expected_future_validations_invalid"
  | "metadata_not_safe"
  | "xml_material_detected"
  | "certificate_material_detected"
  | "aeat_endpoint_detected"
  | "secret_material_detected"
  | "transport_material_detected"
  | "real_data_material_detected";

const DEFAULT_MESSAGES: Record<SyntheticFixturePolicyErrorCode, string> = {
  descriptor_missing: "El descriptor sintetico es obligatorio.",
  field_not_allowed: "El descriptor contiene un campo no permitido.",
  id_missing: "id es obligatorio.",
  id_prefix_invalid: "id debe empezar por SYNTHETIC_ONLY_.",
  synthetic_only_invalid: "syntheticOnly debe ser true.",
  kind_invalid: "kind no pertenece a la lista cerrada.",
  purpose_missing: "purpose es obligatorio.",
  source_phase_invalid:
    "sourcePhase debe referenciar 2B.5C, 2B.5D, 2B.5H, 2B.6A o posterior.",
  expected_future_validations_invalid:
    "expectedFutureValidations debe ser un array.",
  metadata_not_safe:
    "metadata debe ser JSON seguro y no puede contener material bloqueado.",
  xml_material_detected: "Se ha detectado material XML bloqueado.",
  certificate_material_detected:
    "Se ha detectado material bloqueado de identidad tecnica.",
  aeat_endpoint_detected:
    "Se ha detectado una referencia bloqueada a servicio tributario externo.",
  secret_material_detected:
    "Se ha detectado una referencia bloqueada a credenciales o secretos.",
  transport_material_detected:
    "Se ha detectado material bloqueado de envio o transporte.",
  real_data_material_detected:
    "Se ha detectado material marcado como dato real.",
};

export class SyntheticFixturePolicyException extends Error {
  readonly code: SyntheticFixturePolicyErrorCode;

  constructor(
    code: SyntheticFixturePolicyErrorCode,
    message = DEFAULT_MESSAGES[code],
  ) {
    super(message);
    this.name = "SyntheticFixturePolicyException";
    this.code = code;
  }
}

export function syntheticFixturePolicyErrorMessage(
  code: SyntheticFixturePolicyErrorCode,
): string {
  return DEFAULT_MESSAGES[code];
}
