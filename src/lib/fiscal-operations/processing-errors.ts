import type { FiscalOperationProcessingRejectionReason } from "./processing-types";

const DEFAULT_MESSAGES: Record<FiscalOperationProcessingRejectionReason, string> = {
  operation_not_found: "No se ha encontrado la operacion fiscal solicitada.",
  operation_status_incompatible:
    "La operacion fiscal no esta en estado requested.",
  operation_processing_race:
    "La operacion fiscal ha cambiado durante la transicion a processing.",
};

export class FiscalOperationProcessingError extends Error {
  readonly reason: FiscalOperationProcessingRejectionReason;

  constructor(
    reason: FiscalOperationProcessingRejectionReason,
    message = DEFAULT_MESSAGES[reason],
  ) {
    super(message);
    this.name = "FiscalOperationProcessingError";
    this.reason = reason;
  }
}

export function fiscalOperationProcessingErrorMessage(
  reason: FiscalOperationProcessingRejectionReason,
): string {
  return DEFAULT_MESSAGES[reason];
}
