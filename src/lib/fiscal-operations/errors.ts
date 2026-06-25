import type { FiscalOperationErrorReason } from "./types";

export type FiscalOperationErrorCode =
  | "DOCUMENT_NOT_ELIGIBLE"
  | "SNAPSHOT_HASH_MISSING"
  | "ISSUER_NIF_MISSING"
  | "NUMSERIE_MISSING"
  | "ISSUE_DATE_MISSING"
  | "EXPECTED_DOCUMENT_VERSION_MISSING"
  | "UNSUPPORTED_OPERATION"
  | "INVALID_ENVIRONMENT";

export const FISCAL_OPERATION_ERROR_REASON: Record<
  FiscalOperationErrorCode,
  FiscalOperationErrorReason
> = {
  DOCUMENT_NOT_ELIGIBLE: "document_not_eligible",
  SNAPSHOT_HASH_MISSING: "snapshot_hash_missing",
  ISSUER_NIF_MISSING: "issuer_nif_missing",
  NUMSERIE_MISSING: "numserie_missing",
  ISSUE_DATE_MISSING: "issue_date_missing",
  EXPECTED_DOCUMENT_VERSION_MISSING: "expected_document_version_missing",
  UNSUPPORTED_OPERATION: "unsupported_operation",
  INVALID_ENVIRONMENT: "invalid_environment",
};

const DEFAULT_MESSAGES: Record<FiscalOperationErrorCode, string> = {
  DOCUMENT_NOT_ELIGIBLE:
    "El documento canonico no es elegible para una operacion fiscal.",
  SNAPSHOT_HASH_MISSING:
    "La operacion fiscal necesita un snapshotHash documental.",
  ISSUER_NIF_MISSING: "La identidad fiscal necesita el NIF del emisor.",
  NUMSERIE_MISSING: "La identidad fiscal necesita numero y serie.",
  ISSUE_DATE_MISSING: "La identidad fiscal necesita fecha de expedicion.",
  EXPECTED_DOCUMENT_VERSION_MISSING:
    "La operacion fiscal necesita expectedDocumentVersion.",
  UNSUPPORTED_OPERATION: "El tipo de operacion fiscal no esta soportado.",
  INVALID_ENVIRONMENT: "El entorno fiscal no es valido.",
};

export class FiscalOperationError extends Error {
  readonly code: FiscalOperationErrorCode;
  readonly reason: FiscalOperationErrorReason;

  constructor(
    code: FiscalOperationErrorCode,
    message = DEFAULT_MESSAGES[code],
  ) {
    super(message);
    this.name = "FiscalOperationError";
    this.code = code;
    this.reason = FISCAL_OPERATION_ERROR_REASON[code];
  }
}

export function fiscalOperationErrorMessage(
  reason: FiscalOperationErrorReason,
): string {
  const entry = Object.entries(FISCAL_OPERATION_ERROR_REASON).find(
    ([, mappedReason]) => mappedReason === reason,
  );
  const code = entry?.[0] as FiscalOperationErrorCode | undefined;
  return code
    ? DEFAULT_MESSAGES[code]
    : "Operacion fiscal rechazada por el dominio servidor.";
}
