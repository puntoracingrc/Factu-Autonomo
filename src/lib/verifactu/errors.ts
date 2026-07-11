export type VerifactuFinalizationErrorCode =
  | "EVIDENCE_RECONCILIATION_UNSUPPORTED"
  | "SUBMISSION_DISABLED"
  | "AUTH_REQUIRED"
  | "ATTESTATION_MISSING"
  | "SERVER_NOT_CONFIRMED";

export class VerifactuFinalizationError extends Error {
  readonly code: VerifactuFinalizationErrorCode;

  constructor(code: VerifactuFinalizationErrorCode, message: string) {
    super(message);
    this.name = "VerifactuFinalizationError";
    this.code = code;
  }
}
