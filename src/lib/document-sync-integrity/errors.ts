import type {
  DocumentSyncPolicyErrorCode,
  DocumentSyncRiskFlag,
} from "./types";

export const DOCUMENT_SYNC_POLICY_ERROR_MESSAGES: Record<
  DocumentSyncPolicyErrorCode,
  string
> = {
  INVALID_CANDIDATE: "La candidatura de sincronizacion documental no es valida.",
  DOCUMENT_NOT_FOUND: "No existe un documento servidor para mutar de forma segura.",
  DOCUMENT_ALREADY_EXISTS: "Ya existe un documento servidor para esta candidatura.",
  MISSING_EXPECTED_VERSION:
    "Las mutaciones de documentos existentes requieren expectedVersion.",
  PROTECTED_DOCUMENT:
    "El documento esta protegido y no admite mutaciones de sincronizacion.",
  LOCKED_DOCUMENT: "El documento esta bloqueado por integridad.",
  CANCELED_DOCUMENT: "El documento cancelado se trata como protegido.",
  LEGACY_NON_DRAFT: "El documento legacy no borrador se trata como protegido.",
  SNAPSHOT_HASH_CHANGE:
    "La sincronizacion no puede sobrescribir el hash documental congelado.",
  PDF_SNAPSHOT_HASH_CHANGE:
    "La sincronizacion no puede sobrescribir el hash del PDF congelado.",
  EMITTED_NUMBERING_CHANGE:
    "La sincronizacion no puede cambiar numeracion ya emitida.",
  CROSS_USER_MUTATION:
    "La mutacion cruza el usuario derivado por el servidor.",
  CROSS_SCOPE_MUTATION:
    "La mutacion cruza el ambito derivado por el servidor.",
  UNSAFE_RESPONSE_SHAPE:
    "La respuesta solicitada no es un resumen seguro de sincronizacion.",
};

export class DocumentSyncPolicyError extends Error {
  readonly code: DocumentSyncPolicyErrorCode;
  readonly riskFlags: DocumentSyncRiskFlag[];

  constructor(
    code: DocumentSyncPolicyErrorCode,
    riskFlags: DocumentSyncRiskFlag[] = [],
    message = DOCUMENT_SYNC_POLICY_ERROR_MESSAGES[code],
  ) {
    super(message);
    this.name = "DocumentSyncPolicyError";
    this.code = code;
    this.riskFlags = riskFlags;
  }
}
