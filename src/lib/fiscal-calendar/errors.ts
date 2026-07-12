export type FiscalCalendarProviderErrorCode =
  | "NOT_CONFIGURED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "SOURCE_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK"
  | "INVALID_RESPONSE";

export class FiscalCalendarValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FiscalCalendarValidationError";
  }
}

export class FiscalCalendarProviderError extends Error {
  readonly code: FiscalCalendarProviderErrorCode;
  readonly status: number | undefined;
  readonly retryable: boolean;
  readonly attempts: number;

  constructor(options: {
    code: FiscalCalendarProviderErrorCode;
    status?: number;
    retryable: boolean;
    attempts: number;
  }) {
    super("No se pudo consultar ahora el calendario público de la AEAT.");
    this.name = "FiscalCalendarProviderError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable;
    this.attempts = options.attempts;
  }
}
