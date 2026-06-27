import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import { buildImportRestoreDataLossWarnings, summarizeImportRestoreDataLossWarnings } from "./import-restore-data-loss-warning";
import { buildImportRestoreDisabledActions, summarizeImportRestoreDisabledActions } from "./import-restore-disabled-actions";
import { buildImportRestoreSafeErrorPresentation, type ImportRestoreSafeErrorPresentation } from "./import-restore-error-presenter";
import { buildImportRestorePreviewList, summarizeImportRestorePreviewList } from "./import-restore-preview-list";
import { buildLocalDataImportRestoreReviewModel, summarizeLocalDataImportRestoreReviewModel } from "./import-restore-review-model";
import { buildImportRestoreReviewViewModel, summarizeImportRestoreReviewViewModel } from "./import-restore-view-model";
import {
  classifyCorpusScenarioDecision,
  type CorpusScenarioDecisionMatrixEntry,
} from "./corpus-scenario-decision-matrix";
import {
  listLocalDataSyntheticBackupCorpusCases,
  validateLocalDataSyntheticBackupCorpusCase,
  type LocalDataSyntheticBackupCorpusCase,
  type LocalDataSyntheticBackupCorpusCaseId,
} from "./synthetic-backup-corpus";

// PHASE2D72_CORPUS_TO_VIEW_MODEL_CATALOG_V1

export interface CorpusViewModelCatalogItem {
  marker: "PHASE2D72_CORPUS_TO_VIEW_MODEL_CATALOG_V1";
  caseId: LocalDataSyntheticBackupCorpusCaseId;
  decision: CorpusScenarioDecisionMatrixEntry["recommendedDecision"];
  riskClassification: CorpusScenarioDecisionMatrixEntry["riskClassification"];
  requiredHumanReview: boolean;
  reviewModelSummary: ReturnType<typeof summarizeLocalDataImportRestoreReviewModel>;
  viewModelSummary: ReturnType<typeof summarizeImportRestoreReviewViewModel>;
  previewListSummary: ReturnType<typeof summarizeImportRestorePreviewList>;
  warningSummary: ReturnType<typeof summarizeImportRestoreDataLossWarnings>;
  disabledActionSummary: ReturnType<typeof summarizeImportRestoreDisabledActions>;
  safeError?: ImportRestoreSafeErrorPresentation;
  allowApplyImport: false;
  allowApplyRestore: false;
  routeAllowed: false;
  rawDataIncluded: false;
  safe: true;
}

export interface CorpusViewModelCatalog {
  marker: "PHASE2D72_CORPUS_TO_VIEW_MODEL_CATALOG_V1";
  generatedAt: string;
  items: CorpusViewModelCatalogItem[];
  totals: {
    totalItems: number;
    safeErrors: number;
    manualReview: number;
    blocked: number;
  };
  allowApplyImport: false;
  allowApplyRestore: false;
  routeAllowed: false;
  rawDataIncluded: false;
  safe: true;
}

export interface CorpusViewModelCatalogSummary {
  totalItems: number;
  safeErrors: number;
  manualReview: number;
  blocked: number;
  allowApplyImport: false;
  allowApplyRestore: false;
  safe: true;
}

function intakeSize(value: unknown): number {
  return JSON.stringify(value).length;
}

function catalogItem(
  corpusCase: LocalDataSyntheticBackupCorpusCase,
  generatedAt: string,
): CorpusViewModelCatalogItem {
  const decision = classifyCorpusScenarioDecision(corpusCase, { generatedAt });
  const validation = validateLocalDataSyntheticBackupCorpusCase(corpusCase);
  const pipeline = runLocalDataBackupValidationPipeline(
    corpusCase.currentData,
    {
      fileName: `${corpusCase.id}.json`,
      mimeType: "application/json",
      byteLength: intakeSize(corpusCase.backupData),
      parsedObject: corpusCase.backupData,
    },
    { validatedAt: generatedAt },
  );
  const reviewModel = buildLocalDataImportRestoreReviewModel(pipeline);
  const viewModel = buildImportRestoreReviewViewModel(reviewModel);
  const previewList = buildImportRestorePreviewList(reviewModel, { pageSize: 10 });
  const warnings = buildImportRestoreDataLossWarnings({ generatedAt });
  const disabledActions = buildImportRestoreDisabledActions({ reviewModel, generatedAt });
  const safeError =
    !validation.valid || pipeline.status === "invalid" || decision.recommendedDecision === "malformed_rejected"
      ? buildImportRestoreSafeErrorPresentation(new Error("Synthetic corpus case requires safe review."))
      : undefined;

  return {
    marker: "PHASE2D72_CORPUS_TO_VIEW_MODEL_CATALOG_V1",
    caseId: corpusCase.id,
    decision: decision.recommendedDecision,
    riskClassification: decision.riskClassification,
    requiredHumanReview: decision.requiredHumanReview,
    reviewModelSummary: summarizeLocalDataImportRestoreReviewModel(reviewModel),
    viewModelSummary: summarizeImportRestoreReviewViewModel(viewModel),
    previewListSummary: summarizeImportRestorePreviewList(previewList),
    warningSummary: summarizeImportRestoreDataLossWarnings(warnings),
    disabledActionSummary: summarizeImportRestoreDisabledActions(disabledActions),
    safeError,
    allowApplyImport: false,
    allowApplyRestore: false,
    routeAllowed: false,
    rawDataIncluded: false,
    safe: true,
  };
}

export function buildCorpusViewModelCatalog(
  options: { generatedAt?: string; cases?: LocalDataSyntheticBackupCorpusCase[] } = {},
): CorpusViewModelCatalog {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const items = (options.cases ?? listLocalDataSyntheticBackupCorpusCases()).map((entry) => catalogItem(entry, generatedAt));
  const catalog: CorpusViewModelCatalog = {
    marker: "PHASE2D72_CORPUS_TO_VIEW_MODEL_CATALOG_V1",
    generatedAt,
    items,
    totals: {
      totalItems: items.length,
      safeErrors: items.filter((entry) => entry.safeError).length,
      manualReview: items.filter((entry) => entry.requiredHumanReview).length,
      blocked: items.filter((entry) => entry.decision === "blocked" || entry.decision === "malformed_rejected").length,
    },
    allowApplyImport: false,
    allowApplyRestore: false,
    routeAllowed: false,
    rawDataIncluded: false,
    safe: true,
  };
  return catalog;
}

export function getCorpusViewModelCatalogItem(
  catalog: CorpusViewModelCatalog,
  caseId: LocalDataSyntheticBackupCorpusCaseId,
): CorpusViewModelCatalogItem {
  const item = catalog.items.find((entry) => entry.caseId === caseId);
  if (!item) throw new Error("Synthetic corpus catalog item not found.");
  return item;
}

export function summarizeCorpusViewModelCatalog(
  catalog: CorpusViewModelCatalog,
): CorpusViewModelCatalogSummary {
  return {
    totalItems: catalog.totals.totalItems,
    safeErrors: catalog.totals.safeErrors,
    manualReview: catalog.totals.manualReview,
    blocked: catalog.totals.blocked,
    allowApplyImport: false,
    allowApplyRestore: false,
    safe: true,
  };
}
