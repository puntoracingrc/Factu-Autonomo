import type { LocalDataImportRestoreReviewModel } from "./types";

// PHASE2D25_IMPORT_RESTORE_COPY_ACCESSIBILITY_CONTRACT_V1

export interface ImportRestoreReviewCopy {
  marker: "PHASE2D25_IMPORT_RESTORE_COPY_ACCESSIBILITY_CONTRACT_V1";
  title: "Vista previa de importacion y restauracion";
  subtitle: string;
  banner: {
    title: "Vista previa";
    body: "No se aplicaran cambios";
    tone: "warning";
  };
  messages: string[];
  sectionLabels: Record<string, string>;
  ariaDescriptions: Record<string, string>;
  disabledActionText: string;
  safe: true;
}

export interface ImportRestoreReviewCopySummary {
  title: string;
  bannerTitle: string;
  messagesCount: number;
  sectionLabelIds: string[];
  safe: true;
}

const requiredMessages = [
  "Vista previa",
  "No se aplicaran cambios",
  "Requiere revision",
  "Los documentos emitidos o bloqueados estan protegidos",
  "Exporta una copia de seguridad antes de cualquier accion futura",
];

const blockedCopy = [
  "Restaurar ahora",
  "Importar ahora",
  "Sobrescribir",
  "Aplicado correctamente",
  "Seguro al 100%",
];

export function buildImportRestoreReviewCopy(
  reviewModel?: LocalDataImportRestoreReviewModel,
): ImportRestoreReviewCopy {
  return {
    marker: "PHASE2D25_IMPORT_RESTORE_COPY_ACCESSIBILITY_CONTRACT_V1",
    title: "Vista previa de importacion y restauracion",
    subtitle:
      reviewModel?.decision === "dry_run_ready"
        ? "Revision preparada solo para vista previa."
        : "Revision bloqueada o pendiente de validacion humana.",
    banner: {
      title: "Vista previa",
      body: "No se aplicaran cambios",
      tone: "warning",
    },
    messages: [...requiredMessages],
    sectionLabels: {
      overview: "Resumen de revision",
      backup_summary: "Resumen de la copia",
      import_risks: "Riesgos de importacion",
      restore_risks: "Riesgos de restauracion",
      blockers: "Bloqueos activos",
      actions: "Acciones deshabilitadas",
    },
    ariaDescriptions: {
      status: "Estado textual de la revision, no indicado solo por color.",
      severity: "Severidad expresada con texto y contador.",
      actions: "Todas las acciones de aplicacion permanecen deshabilitadas.",
    },
    disabledActionText: "Accion deshabilitada: requiere revision futura explicita.",
    safe: true,
  };
}

export function validateImportRestoreReviewCopy(copy: ImportRestoreReviewCopy): ImportRestoreReviewCopy {
  const serialized = JSON.stringify(copy);
  for (const message of requiredMessages) {
    if (!serialized.includes(message)) {
      throw new Error(`Missing required import/restore copy: ${message}.`);
    }
  }
  for (const phrase of blockedCopy) {
    if (serialized.includes(phrase)) {
      throw new Error(`Forbidden import/restore copy: ${phrase}.`);
    }
  }
  if (copy.safe !== true) throw new Error("Import/restore copy must be marked safe.");
  return copy;
}

export function summarizeImportRestoreReviewCopy(
  copy: ImportRestoreReviewCopy,
): ImportRestoreReviewCopySummary {
  const validated = validateImportRestoreReviewCopy(copy);
  return {
    title: validated.title,
    bannerTitle: validated.banner.title,
    messagesCount: validated.messages.length,
    sectionLabelIds: Object.keys(validated.sectionLabels),
    safe: true,
  };
}
