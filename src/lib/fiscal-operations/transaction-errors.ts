import type { FiscalOperationTransactionRejectionReason } from "./transaction-types";

const DEFAULT_MESSAGES: Record<
  FiscalOperationTransactionRejectionReason,
  string
> = {
  missing_expected_document_version:
    "La operacion fiscal necesita expectedDocumentVersion.",
  document_not_found: "No se ha encontrado el documento canonico.",
  document_version_conflict:
    "El documento canonico ha cambiado antes de reservar la operacion fiscal.",
  document_not_eligible:
    "El documento canonico no es elegible para una operacion fiscal.",
  snapshot_hash_missing:
    "La operacion fiscal necesita un snapshotHash documental.",
  issuer_nif_missing: "La identidad fiscal necesita el NIF del emisor.",
  numserie_missing: "La identidad fiscal necesita numero y serie.",
  issue_date_missing: "La identidad fiscal necesita fecha de expedicion.",
  unsupported_operation: "El tipo de operacion fiscal no esta soportado.",
  invalid_environment: "El entorno fiscal no es valido.",
  operation_race:
    "La operacion fiscal se ha reservado de forma concurrente.",
  identity_race:
    "La identidad fiscal se ha reservado de forma concurrente.",
};

export class FiscalOperationTransactionError extends Error {
  readonly reason: FiscalOperationTransactionRejectionReason;

  constructor(
    reason: FiscalOperationTransactionRejectionReason,
    message = DEFAULT_MESSAGES[reason],
  ) {
    super(message);
    this.name = "FiscalOperationTransactionError";
    this.reason = reason;
  }
}

export function fiscalOperationTransactionErrorMessage(
  reason: FiscalOperationTransactionRejectionReason,
): string {
  return DEFAULT_MESSAGES[reason];
}
