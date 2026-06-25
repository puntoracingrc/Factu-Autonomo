export type FiscalEvidenceOperationalSummaryErrorCode =
  | "invalid_summary_input"
  | "store_read_failed"
  | "map_row_failed";

export class FiscalEvidenceOperationalSummaryError extends Error {
  readonly code: FiscalEvidenceOperationalSummaryErrorCode;

  constructor(code: FiscalEvidenceOperationalSummaryErrorCode, message: string) {
    super(message);
    this.name = "FiscalEvidenceOperationalSummaryError";
    this.code = code;
  }
}
