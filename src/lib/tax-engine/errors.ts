export interface TaxEngineValidationIssue {
  field: string;
  message: string;
}

export class TaxEngineValidationError extends Error {
  readonly issues: readonly TaxEngineValidationIssue[];

  constructor(issues: readonly TaxEngineValidationIssue[]) {
    super("La entrada del análisis fiscal no es válida.");
    this.name = "TaxEngineValidationError";
    this.issues = issues;
  }
}

export class TaxEngineConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaxEngineConfigurationError";
  }
}
