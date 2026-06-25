import type {
  FiscalEvidencePersistenceConflictReason,
  FiscalEvidencePersistenceRejectionReason,
} from "./types";

export type FiscalEvidencePersistenceErrorCode =
  | FiscalEvidencePersistenceRejectionReason
  | FiscalEvidencePersistenceConflictReason;

const MESSAGES: Record<FiscalEvidencePersistenceErrorCode, string> = {
  record_not_found: "No se ha encontrado el registro fiscal local solicitado.",
  payload_candidate_missing: "La evidencia interna necesita payloadCandidateId.",
  payload_validation_not_valid:
    "La evidencia interna solo persiste payloads validados como valid.",
  payload_packet_mismatch:
    "El payload validado no coincide con el paquete de evidencia.",
  record_packet_mismatch:
    "El registro local no coincide con el paquete de evidencia.",
  xml_candidate_digest_invalid:
    "La evidencia interna solo acepta digest sha256 del XML candidato.",
  evidence_finality_invalid:
    "La evidencia persistida debe ser internal_dry_run_evidence.",
  transportable_not_allowed:
    "La evidencia interna local/staging no puede ser transportable.",
  metadata_unsafe: "La metadata de evidencia contiene datos no permitidos.",
  chain_state_missing: "No existe cabecera de cadena local para este registro.",
  chain_state_inconsistent:
    "La cabecera de cadena local no confirma este registro.",
};

export class FiscalEvidencePersistenceError extends Error {
  readonly code: FiscalEvidencePersistenceErrorCode;

  constructor(code: FiscalEvidencePersistenceErrorCode, message = MESSAGES[code]) {
    super(message);
    this.name = "FiscalEvidencePersistenceError";
    this.code = code;
  }
}
