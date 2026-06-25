export type FiscalEvidenceIntegrityErrorCode =
  | "invalid_read_input"
  | "store_read_failed"
  | "map_row_failed";

export class FiscalEvidenceIntegrityError extends Error {
  readonly code: FiscalEvidenceIntegrityErrorCode;

  constructor(code: FiscalEvidenceIntegrityErrorCode, message: string) {
    super(message);
    this.name = "FiscalEvidenceIntegrityError";
    this.code = code;
  }
}
