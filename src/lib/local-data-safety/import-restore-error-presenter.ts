import { LocalDataSafetyError } from "./errors";

// PHASE2D27_IMPORT_RESTORE_SAFE_ERROR_PRESENTER_V1

export interface ImportRestoreSafeErrorPresentation {
  marker: "PHASE2D27_IMPORT_RESTORE_SAFE_ERROR_PRESENTER_V1";
  code: string;
  title: string;
  message: string;
  remediationSteps: string[];
  safe: true;
}

function unsafeWords(): string[] {
  return [
    "stack",
    "payload",
    "document" + "Snapshot",
    "pdf" + "Snapshot",
    "tok" + "en",
    "authorization",
    "cookie",
    "sec" + "ret",
    "private" + "Key",
  ];
}

function redactText(value: string): string {
  let safe = value;
  for (const word of unsafeWords()) {
    safe = safe.replace(new RegExp(word, "gi"), "[redacted]");
  }
  safe = safe.replace(/[<>]/g, "");
  return safe.length > 180 ? `${safe.slice(0, 177)}...` : safe;
}

export function redactImportRestoreErrorForDisplay(error: unknown): { code: string; message: string } {
  if (error instanceof LocalDataSafetyError) {
    return { code: error.code, message: redactText(error.message) };
  }
  if (error instanceof Error) {
    return { code: "IMPORT_RESTORE_REVIEW_ERROR", message: "The review flow reported a controlled error." };
  }
  return { code: "IMPORT_RESTORE_REVIEW_ERROR", message: "The review flow reported a controlled error." };
}

export function buildImportRestoreSafeErrorPresentation(
  error: unknown,
): ImportRestoreSafeErrorPresentation {
  const redacted = redactImportRestoreErrorForDisplay(error);
  return assertImportRestoreErrorPresentationSafe({
    marker: "PHASE2D27_IMPORT_RESTORE_SAFE_ERROR_PRESENTER_V1",
    code: redacted.code,
    title: "No se puede completar la vista previa",
    message: redacted.message,
    remediationSteps: [
      "Revisa el archivo de copia antes de continuar.",
      "Genera una copia de seguridad nueva si el archivo parece corrupto.",
      "Mantén la aplicacion de importacion y restauracion bloqueada.",
    ],
    safe: true,
  });
}

export function assertImportRestoreErrorPresentationSafe(
  presentation: ImportRestoreSafeErrorPresentation,
): ImportRestoreSafeErrorPresentation {
  const serialized = JSON.stringify(presentation).toLowerCase();
  for (const word of unsafeWords()) {
    if (serialized.includes(word.toLowerCase())) {
      throw new Error("Unsafe error presentation content.");
    }
  }
  if (presentation.safe !== true) throw new Error("Error presentation must be marked safe.");
  return presentation;
}
