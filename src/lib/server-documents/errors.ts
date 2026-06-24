import type { ServerDocumentConflictReason } from "./types";

export type ServerDocumentErrorCode =
  | "MISSING_EXPECTED_VERSION"
  | "VERSION_MISMATCH"
  | "DOCUMENT_LOCKED"
  | "FORBIDDEN_LIFECYCLE_TRANSITION"
  | "SNAPSHOT_MUTATION"
  | "DOCUMENT_NOT_FOUND"
  | "FORBIDDEN_USER_SCOPE"
  | "DUPLICATE_LOCAL_DOCUMENT_ID";

const DEFAULT_MESSAGES: Record<ServerDocumentErrorCode, string> = {
  MISSING_EXPECTED_VERSION:
    "La actualización necesita una versión esperada válida.",
  VERSION_MISMATCH:
    "El documento ha cambiado desde la última sincronización.",
  DOCUMENT_LOCKED:
    "El documento está bloqueado y no admite mutación documental.",
  FORBIDDEN_LIFECYCLE_TRANSITION:
    "No se puede degradar el ciclo documental del servidor.",
  SNAPSHOT_MUTATION:
    "No se pueden reemplazar snapshots o hashes protegidos.",
  DOCUMENT_NOT_FOUND: "No se ha encontrado el documento canónico.",
  FORBIDDEN_USER_SCOPE: "El documento no pertenece al usuario autenticado.",
  DUPLICATE_LOCAL_DOCUMENT_ID:
    "Ya existe un documento canónico con ese identificador local.",
};

export const ERROR_REASON: Record<
  ServerDocumentErrorCode,
  ServerDocumentConflictReason
> = {
  MISSING_EXPECTED_VERSION: "missing_expected_version",
  VERSION_MISMATCH: "version_mismatch",
  DOCUMENT_LOCKED: "locked_document",
  FORBIDDEN_LIFECYCLE_TRANSITION: "forbidden_lifecycle_transition",
  SNAPSHOT_MUTATION: "snapshot_mutation",
  DOCUMENT_NOT_FOUND: "not_found",
  FORBIDDEN_USER_SCOPE: "forbidden_user_scope",
  DUPLICATE_LOCAL_DOCUMENT_ID: "duplicate_local_document_id",
};

export class ServerDocumentError extends Error {
  readonly code: ServerDocumentErrorCode;
  readonly reason: ServerDocumentConflictReason;

  constructor(
    code: ServerDocumentErrorCode,
    message = DEFAULT_MESSAGES[code],
  ) {
    super(message);
    this.name = "ServerDocumentError";
    this.code = code;
    this.reason = ERROR_REASON[code];
  }
}

export function serverDocumentErrorMessage(
  reason: ServerDocumentConflictReason,
): string {
  const entry = Object.entries(ERROR_REASON).find(
    ([, mappedReason]) => mappedReason === reason,
  );
  const code = entry?.[0] as ServerDocumentErrorCode | undefined;
  return code ? DEFAULT_MESSAGES[code] : "Mutación documental rechazada.";
}
