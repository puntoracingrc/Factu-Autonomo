export type FiscalOperationDryRunPipelineErrorCode =
  | "PIPELINE_INPUT_INVALID"
  | "MATERIAL_DOCUMENT_NOT_FOUND"
  | "MATERIAL_IDENTITY_NOT_FOUND"
  | "MATERIAL_BUILD_FAILED";

const DEFAULT_MESSAGES: Record<FiscalOperationDryRunPipelineErrorCode, string> = {
  PIPELINE_INPUT_INVALID:
    "El pipeline fiscal dry-run necesita un input valido.",
  MATERIAL_DOCUMENT_NOT_FOUND:
    "No se ha encontrado el documento canonico para preparar material dry-run.",
  MATERIAL_IDENTITY_NOT_FOUND:
    "No se ha encontrado la identidad fiscal reservada para preparar material dry-run.",
  MATERIAL_BUILD_FAILED:
    "No se pudo construir el material fiscal preliminar dry-run.",
};

export class FiscalOperationDryRunPipelineError extends Error {
  readonly code: FiscalOperationDryRunPipelineErrorCode;

  constructor(
    code: FiscalOperationDryRunPipelineErrorCode,
    message = DEFAULT_MESSAGES[code],
  ) {
    super(message);
    this.name = "FiscalOperationDryRunPipelineError";
    this.code = code;
  }
}

export function fiscalOperationDryRunPipelineErrorMessage(
  code: FiscalOperationDryRunPipelineErrorCode,
): string {
  return DEFAULT_MESSAGES[code];
}
