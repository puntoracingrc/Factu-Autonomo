import {
  buildImportRestoreDisabledActions,
  type ImportRestoreDisabledActionsModel,
  summarizeImportRestoreDisabledActions,
} from "./import-restore-disabled-actions";
import {
  buildImportRestoreReviewCopy,
  type ImportRestoreReviewCopy,
  validateImportRestoreReviewCopy,
} from "./import-restore-copy";
import {
  buildImportRestorePreviewList,
  type ImportRestorePreviewList,
  summarizeImportRestorePreviewList,
} from "./import-restore-preview-list";
import type {
  LocalDataImportRestoreReviewModel,
  LocalDataReviewSeverity,
  LocalDataRiskFlag,
} from "./types";

// PHASE2D22_IMPORT_RESTORE_REVIEW_VIEW_MODEL_V1

export interface ImportRestoreReviewViewModel {
  marker: "PHASE2D22_IMPORT_RESTORE_REVIEW_VIEW_MODEL_V1";
  title: string;
  subtitle: string;
  status: LocalDataImportRestoreReviewModel["status"];
  severity: LocalDataReviewSeverity;
  counters: {
    protectedDocuments: number;
    sections: number;
    blockers: number;
    risks: number;
  };
  sections: Array<{
    id: string;
    title: string;
    severity: LocalDataReviewSeverity;
    count: number;
    messages: string[];
  }>;
  risks: LocalDataRiskFlag[];
  protectedDocumentsSummary: string;
  disabledActions: ImportRestoreDisabledActionsModel;
  previewList: ImportRestorePreviewList;
  nextSteps: string[];
  limitBanner: ImportRestoreReviewCopy["banner"];
  safe: true;
}

export interface ImportRestoreReviewViewModelSummary {
  status: LocalDataImportRestoreReviewModel["status"];
  severity: LocalDataReviewSeverity;
  counters: ImportRestoreReviewViewModel["counters"];
  disabledActionSummary: ReturnType<typeof summarizeImportRestoreDisabledActions>;
  previewListSummary: ReturnType<typeof summarizeImportRestorePreviewList>;
  safe: true;
}

const unsafeWords = [
  "document" + "Snapshot",
  "pdf" + "Snapshot",
  "payload",
  "tok" + "en",
  "authorization",
  "cookie",
  "sec" + "ret",
  "private" + "Key",
  "%p" + "df",
];

function sanitizeText(value: string): string {
  let safe = value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  for (const word of unsafeWords) {
    safe = safe.replace(new RegExp(word, "gi"), "[redacted]");
  }
  return safe.length > 180 ? `${safe.slice(0, 177)}...` : safe;
}

function blockedSections(model: LocalDataImportRestoreReviewModel): number {
  return model.sections.filter((section) => section.severity === "blocked").length;
}

function viewModelSeverity(model: LocalDataImportRestoreReviewModel): LocalDataReviewSeverity {
  if (model.severity === "info" && model.protectedDocumentsCount > 0) return "warning";
  return model.severity;
}

export function buildImportRestoreReviewViewModel(
  reviewModel: LocalDataImportRestoreReviewModel,
  options: { copy?: ImportRestoreReviewCopy; disabledActions?: ImportRestoreDisabledActionsModel } = {},
): ImportRestoreReviewViewModel {
  const copy = validateImportRestoreReviewCopy(options.copy ?? buildImportRestoreReviewCopy(reviewModel));
  const disabledActions = options.disabledActions ?? buildImportRestoreDisabledActions({ reviewModel });
  const sections = reviewModel.sections.map((section) => ({
    id: sanitizeText(section.id),
    title: sanitizeText(copy.sectionLabels[section.id] ?? section.title),
    severity: section.severity,
    count: section.count,
    messages: section.messages.map(sanitizeText),
  }));
  const viewModel: ImportRestoreReviewViewModel = {
    marker: "PHASE2D22_IMPORT_RESTORE_REVIEW_VIEW_MODEL_V1",
    title: copy.title,
    subtitle: copy.subtitle,
    status: reviewModel.status,
    severity: viewModelSeverity(reviewModel),
    counters: {
      protectedDocuments: reviewModel.protectedDocumentsCount,
      sections: sections.length,
      blockers: blockedSections(reviewModel),
      risks: reviewModel.riskFlags.length,
    },
    sections,
    risks: [...reviewModel.riskFlags],
    protectedDocumentsSummary: `${reviewModel.protectedDocumentsCount} documentos protegidos en resumen seguro.`,
    disabledActions,
    previewList: buildImportRestorePreviewList(reviewModel),
    nextSteps: [
      "Revisar la vista previa con una persona responsable.",
      "Mantener las acciones de aplicacion bloqueadas.",
      "Decidir explicitamente si se conectara una UI futura.",
    ],
    limitBanner: copy.banner,
    safe: true,
  };
  return assertImportRestoreReviewViewModelSafe(viewModel);
}

export function assertImportRestoreReviewViewModelSafe(
  viewModel: ImportRestoreReviewViewModel,
): ImportRestoreReviewViewModel {
  const serialized = JSON.stringify(viewModel);
  for (const word of unsafeWords) {
    if (serialized.toLowerCase().includes(word.toLowerCase())) {
      throw new Error("Unsafe import/restore review view model content.");
    }
  }
  if (viewModel.disabledActions.applyImportBlocked !== true || viewModel.disabledActions.applyRestoreBlocked !== true) {
    throw new Error("Import/restore view model must keep apply actions blocked.");
  }
  if (viewModel.safe !== true) throw new Error("Import/restore view model must be marked safe.");
  return viewModel;
}

export function summarizeImportRestoreReviewViewModel(
  viewModel: ImportRestoreReviewViewModel,
): ImportRestoreReviewViewModelSummary {
  const safe = assertImportRestoreReviewViewModelSafe(viewModel);
  return {
    status: safe.status,
    severity: safe.severity,
    counters: { ...safe.counters },
    disabledActionSummary: summarizeImportRestoreDisabledActions(safe.disabledActions),
    previewListSummary: summarizeImportRestorePreviewList(safe.previewList),
    safe: true,
  };
}
