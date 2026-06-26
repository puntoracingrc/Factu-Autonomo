export type OfficialMappingErrorCode =
  | "descriptor_not_supported"
  | "descriptor_negative_not_mappable"
  | "candidate_input_rejected"
  | "official_artifact_gate_blocked"
  | "mapping_pending"
  | "mapping_blocked"
  | "synthetic_value_not_official_example"
  | "unknown_field_rejected";

const DEFAULT_MESSAGES: Record<OfficialMappingErrorCode, string> = {
  descriptor_not_supported:
    "El descriptor no pertenece al conjunto positivo mapeable de esta fase.",
  descriptor_negative_not_mappable:
    "Los escenarios negativos no producen modelo alineado con artefactos oficiales.",
  candidate_input_rejected:
    "El descriptor no pudo convertirse en entrada candidata sintetica.",
  official_artifact_gate_blocked:
    "La puerta de artefactos oficiales permanece bloqueada.",
  mapping_pending:
    "Existe al menos un mapping pendiente para el tipo de registro.",
  mapping_blocked:
    "Existe al menos un mapping bloqueado para el tipo de registro.",
  synthetic_value_not_official_example:
    "El valor sintetico no procede de un ejemplo oficial seguro.",
  unknown_field_rejected:
    "Se ha rechazado un campo no incluido en el mapping oficial controlado.",
};

export function officialMappingErrorMessage(
  code: OfficialMappingErrorCode,
): string {
  return DEFAULT_MESSAGES[code];
}
