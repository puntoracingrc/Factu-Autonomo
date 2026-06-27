import type { ImportRestoreReviewSession } from "./import-restore-review-session";
import type { ImportRestorePreviewFlowState } from "./import-restore-preview-state-machine";
import type { ImportRestoreSyntheticUiFixture } from "./import-restore-ui-fixtures";
import type { LocalDataReviewSeverity, LocalDataRiskFlag } from "./types";

// PHASE2D49_IMPORT_RESTORE_DATA_LOSS_WARNING_MODEL_V1

export type ImportRestoreDataLossWarningId =
  | "protected_documents"
  | "snapshot_mismatch"
  | "numbering_risk"
  | "backup_older_or_unknown"
  | "malformed_backup"
  | "apply_disabled"
  | "backup_before_future_actions";

export interface ImportRestoreDataLossWarning {
  id: ImportRestoreDataLossWarningId;
  severity: LocalDataReviewSeverity;
  title: string;
  body: string;
  riskFlags: LocalDataRiskFlag[];
  visible: true;
}

export interface ImportRestoreDataLossWarningInput {
  fixture?: ImportRestoreSyntheticUiFixture;
  flowState?: ImportRestorePreviewFlowState;
  session?: ImportRestoreReviewSession;
  generatedAt?: string;
}

export interface ImportRestoreDataLossWarningsModel {
  marker: "PHASE2D49_IMPORT_RESTORE_DATA_LOSS_WARNING_MODEL_V1";
  generatedAt: string;
  warnings: ImportRestoreDataLossWarning[];
  highestSeverity: LocalDataReviewSeverity;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

export interface ImportRestoreDataLossWarningsSummary {
  warningIds: ImportRestoreDataLossWarningId[];
  highestSeverity: LocalDataReviewSeverity;
  total: number;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

function riskFlagsFrom(input: ImportRestoreDataLossWarningInput): LocalDataRiskFlag[] {
  return [
    ...(input.fixture?.expectedRiskFlags ?? []),
    ...(input.flowState?.riskFlags ?? []),
    ...(input.session?.manualReviewFlags ?? []),
  ].filter((flag, index, all) => all.indexOf(flag) === index);
}

function warning(
  id: ImportRestoreDataLossWarningId,
  severity: LocalDataReviewSeverity,
  title: string,
  body: string,
  riskFlags: LocalDataRiskFlag[] = [],
): ImportRestoreDataLossWarning {
  return { id, severity, title, body, riskFlags, visible: true };
}

function highest(warnings: ImportRestoreDataLossWarning[]): LocalDataReviewSeverity {
  if (warnings.some((entry) => entry.severity === "blocked")) return "blocked";
  if (warnings.some((entry) => entry.severity === "warning")) return "warning";
  return "info";
}

export function buildImportRestoreDataLossWarnings(
  input: ImportRestoreDataLossWarningInput = {},
): ImportRestoreDataLossWarningsModel {
  const riskFlags = riskFlagsFrom(input);
  const warnings: ImportRestoreDataLossWarning[] = [];

  if (riskFlags.some((flag) => /protected|overwrite/i.test(flag))) {
    warnings.push(
      warning(
        "protected_documents",
        "blocked",
        "Hay documentos protegidos en la vista previa",
        "La revision indica posibles cambios sobre documentos emitidos, bloqueados o historicos. La accion real sigue deshabilitada.",
        riskFlags.filter((flag) => /protected|overwrite/i.test(flag)),
      ),
    );
  }
  if (riskFlags.some((flag) => /snapshot/i.test(flag))) {
    warnings.push(
      warning(
        "snapshot_mismatch",
        "warning",
        "Hay diferencias de hash que requieren revision",
        "El resumen sintetico detecta diferencias que no deben resolverse automaticamente.",
        riskFlags.filter((flag) => /snapshot/i.test(flag)),
      ),
    );
  }
  if (riskFlags.includes("incoming_counter_change")) {
    warnings.push(
      warning(
        "numbering_risk",
        "warning",
        "Hay riesgo de numeracion",
        "Los contadores o series de la copia no coinciden con el estado actual sintetico. La revision manual es obligatoria.",
        ["incoming_counter_change"],
      ),
    );
  }
  if (input.fixture?.scenario === "empty_backup" || input.fixture?.scenario === undefined) {
    warnings.push(
      warning(
        "backup_older_or_unknown",
        "warning",
        "La antiguedad de la copia no se puede confirmar aqui",
        "Esta vista previa no demuestra que una copia sea reciente ni suficiente para operar sobre datos reales.",
      ),
    );
  }
  if (riskFlags.some((flag) => /malformed|validation|intake/i.test(flag)) || input.flowState?.status === "error_safe") {
    warnings.push(
      warning(
        "malformed_backup",
        "blocked",
        "La copia no es revisable",
        "La entrada se rechaza sin intentar recuperar datos ni continuar el flujo.",
        riskFlags.filter((flag) => /malformed|validation|intake/i.test(flag)),
      ),
    );
  }

  warnings.push(
    warning(
      "apply_disabled",
      "blocked",
      "Aplicar importacion o restauracion esta deshabilitado",
      "Esta fase solo permite revisar un modelo sintetico; no ejecuta cambios sobre datos.",
    ),
    warning(
      "backup_before_future_actions",
      "warning",
      "Una fase futura debera exigir copia previa",
      "Antes de cualquier accion real futura, debera existir una decision explicita de copia de recuperacion y revision externa.",
    ),
  );

  return {
    marker: "PHASE2D49_IMPORT_RESTORE_DATA_LOSS_WARNING_MODEL_V1",
    generatedAt: input.generatedAt ?? input.session?.updatedAt ?? input.flowState?.generatedAt ?? new Date().toISOString(),
    warnings,
    highestSeverity: highest(warnings),
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}

export function summarizeImportRestoreDataLossWarnings(
  model: ImportRestoreDataLossWarningsModel,
): ImportRestoreDataLossWarningsSummary {
  return {
    warningIds: model.warnings.map((entry) => entry.id),
    highestSeverity: model.highestSeverity,
    total: model.warnings.length,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
