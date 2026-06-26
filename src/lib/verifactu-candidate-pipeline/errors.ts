export type SyntheticCandidatePipelineErrorCode =
  | "descriptor_policy_rejected"
  | "descriptor_unknown"
  | "descriptor_kind_mismatch"
  | "input_missing"
  | "input_field_missing"
  | "input_field_invalid"
  | "identifier_not_synthetic"
  | "synthetic_marker_missing"
  | "unsupported_kind"
  | "unsafe_candidate_value"
  | "canonical_material_invalid"
  | "hash_invalid"
  | "scenario_rejected"
  | "xml_candidate_invalid"
  | "digest_mismatch"
  | "candidate_hash_mismatch"
  | "previous_hash_mismatch"
  | "blocked_material_detected";

const DEFAULT_MESSAGES: Record<SyntheticCandidatePipelineErrorCode, string> = {
  descriptor_policy_rejected:
    "El descriptor sintetico fue rechazado por los guardrails previos.",
  descriptor_unknown:
    "El descriptor sintetico no pertenece al conjunto controlado.",
  descriptor_kind_mismatch:
    "El tipo del descriptor no coincide con el escenario controlado.",
  input_missing: "La entrada candidata sintetica es obligatoria.",
  input_field_missing:
    "La entrada candidata sintetica no contiene un campo obligatorio.",
  input_field_invalid:
    "La entrada candidata sintetica contiene un campo no valido.",
  identifier_not_synthetic:
    "Los identificadores candidatos deben usar marcadores SYNTHETIC_ONLY_.",
  synthetic_marker_missing:
    "La entrada candidata debe declarar syntheticOnly: true.",
  unsupported_kind: "El tipo de escenario no esta soportado por esta fase.",
  unsafe_candidate_value:
    "La entrada candidata contiene un valor no permitido para esta fase.",
  canonical_material_invalid:
    "El material canonico candidato no cumple el contrato interno.",
  hash_invalid: "La huella candidata no cumple el contrato interno.",
  scenario_rejected:
    "El escenario negativo sintetico fue rechazado de forma controlada.",
  xml_candidate_invalid:
    "El XML candidato sintetico no cumple el contrato local.",
  digest_mismatch:
    "La huella del XML candidato no coincide con el contenido en memoria.",
  candidate_hash_mismatch:
    "La huella candidata declarada no coincide con el contexto validado.",
  previous_hash_mismatch:
    "La referencia previa candidata no coincide con el contexto validado.",
  blocked_material_detected:
    "Se ha detectado material bloqueado en el candidato sintetico.",
};

export function syntheticCandidatePipelineErrorMessage(
  code: SyntheticCandidatePipelineErrorCode,
): string {
  return DEFAULT_MESSAGES[code];
}
