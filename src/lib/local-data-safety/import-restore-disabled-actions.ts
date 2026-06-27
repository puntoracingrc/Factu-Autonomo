import type {
  LocalDataApplyBlockedResult,
  LocalDataImportRestoreConfirmationResult,
  LocalDataImportRestoreReviewModel,
} from "./types";

// PHASE2D23_IMPORT_RESTORE_DISABLED_ACTION_MODEL_V1

export type ImportRestoreDisabledActionId =
  | "choose_file"
  | "validate_backup"
  | "build_review"
  | "apply_import"
  | "apply_restore"
  | "download_recovery_snapshot"
  | "cancel";

export type ImportRestoreDisabledActionState = "future_ui_only" | "preview_only" | "blocked";

export interface ImportRestoreDisabledAction {
  id: ImportRestoreDisabledActionId;
  label: string;
  state: ImportRestoreDisabledActionState;
  disabled: boolean;
  reason: string;
  ariaDescription: string;
}

export interface ImportRestoreDisabledActionsModel {
  marker: "PHASE2D23_IMPORT_RESTORE_DISABLED_ACTION_MODEL_V1";
  generatedAt: string;
  actions: ImportRestoreDisabledAction[];
  applyImportBlocked: true;
  applyRestoreBlocked: true;
  safe: true;
}

export interface ImportRestoreDisabledActionsSummary {
  actionIds: ImportRestoreDisabledActionId[];
  blockedActionIds: ImportRestoreDisabledActionId[];
  previewOnlyActionIds: ImportRestoreDisabledActionId[];
  applyImportBlocked: true;
  applyRestoreBlocked: true;
  safe: true;
}

export interface BuildImportRestoreDisabledActionsInput {
  reviewModel?: LocalDataImportRestoreReviewModel;
  confirmation?: LocalDataImportRestoreConfirmationResult;
  importBlocker?: LocalDataApplyBlockedResult;
  restoreBlocker?: LocalDataApplyBlockedResult;
  generatedAt?: string;
}

const actionOrder: ImportRestoreDisabledActionId[] = [
  "choose_file",
  "validate_backup",
  "build_review",
  "apply_import",
  "apply_restore",
  "download_recovery_snapshot",
  "cancel",
];

const actionLabels: Record<ImportRestoreDisabledActionId, string> = {
  choose_file: "Elegir copia para revisar",
  validate_backup: "Validar copia en vista previa",
  build_review: "Preparar revision",
  apply_import: "Aplicar importacion",
  apply_restore: "Aplicar restauracion",
  download_recovery_snapshot: "Descargar snapshot de recuperacion",
  cancel: "Cancelar revision",
};

function stateFor(id: ImportRestoreDisabledActionId): ImportRestoreDisabledActionState {
  if (id === "validate_backup" || id === "build_review") return "preview_only";
  return id === "choose_file" || id === "cancel" ? "future_ui_only" : "blocked";
}

function reasonFor(id: ImportRestoreDisabledActionId): string {
  if (id === "apply_import" || id === "apply_restore") {
    return "Apply is disabled pending explicit UI wiring and external review.";
  }
  if (id === "download_recovery_snapshot") {
    return "Recovery snapshot download remains disabled until a future reviewed phase.";
  }
  if (id === "choose_file") {
    return "Future UI action only; no file picker is wired in this shell.";
  }
  if (id === "cancel") {
    return "Future UI action only; no navigation is wired in this shell.";
  }
  return "Preview-only action; no data mutation is allowed.";
}

export function buildImportRestoreDisabledActions(
  input: BuildImportRestoreDisabledActionsInput = {},
): ImportRestoreDisabledActionsModel {
  const generatedAt =
    input.generatedAt ?? input.reviewModel?.generatedAt ?? input.confirmation?.evaluatedAt ?? new Date().toISOString();
  return {
    marker: "PHASE2D23_IMPORT_RESTORE_DISABLED_ACTION_MODEL_V1",
    generatedAt,
    actions: actionOrder.map((id) => ({
      id,
      label: actionLabels[id],
      state: stateFor(id),
      disabled: true,
      reason: reasonFor(id),
      ariaDescription: `${actionLabels[id]}: ${reasonFor(id)}`,
    })),
    applyImportBlocked: true,
    applyRestoreBlocked: true,
    safe: true,
  };
}

export function assertImportRestoreActionBlocked(
  model: ImportRestoreDisabledActionsModel,
  actionId: ImportRestoreDisabledActionId | string,
): ImportRestoreDisabledAction {
  const action = model.actions.find((entry) => entry.id === actionId);
  if (!action) {
    return {
      id: "apply_import",
      label: "Accion no reconocida",
      state: "blocked",
      disabled: true,
      reason: "Unknown action is blocked by default.",
      ariaDescription: "Accion no reconocida: bloqueada por defecto.",
    };
  }
  if (!action.disabled) {
    throw new Error("Import/restore shell action must remain disabled.");
  }
  return action;
}

export function summarizeImportRestoreDisabledActions(
  model: ImportRestoreDisabledActionsModel,
): ImportRestoreDisabledActionsSummary {
  return {
    actionIds: model.actions.map((action) => action.id),
    blockedActionIds: model.actions.filter((action) => action.state === "blocked").map((action) => action.id),
    previewOnlyActionIds: model.actions.filter((action) => action.state === "preview_only").map((action) => action.id),
    applyImportBlocked: true,
    applyRestoreBlocked: true,
    safe: true,
  };
}
