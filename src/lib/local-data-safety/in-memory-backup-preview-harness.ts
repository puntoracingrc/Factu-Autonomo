import { runLocalDataBackupValidationPipeline, summarizeLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import { buildLocalDataImportRestoreReviewModel } from "./import-restore-review-model";
import {
  buildImportRestoreReviewViewModel,
  summarizeImportRestoreReviewViewModel,
  type ImportRestoreReviewViewModel,
} from "./import-restore-view-model";
import { buildImportRestoreSafeErrorPresentation, type ImportRestoreSafeErrorPresentation } from "./import-restore-error-presenter";
import type {
  LocalDataBackupValidationPipelineResult,
  LocalDataBackupValidationPipelineSummary,
  LocalDataImportRestoreReviewModel,
  LocalDataSafetyAppData,
} from "./types";

// PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1

export interface InMemoryBackupPreviewHarnessInput {
  currentData: LocalDataSafetyAppData;
  rawJson: string;
  fileName?: string;
  mimeType?: string;
  maxBytes?: number;
  parsedAt?: string;
}

export interface InMemoryBackupPreviewHarnessResult {
  marker: "PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1";
  status: "preview_ready" | "invalid";
  parsedAt: string;
  fileName: string;
  byteLength: number;
  validation?: LocalDataBackupValidationPipelineResult;
  reviewModel?: LocalDataImportRestoreReviewModel;
  viewModel?: ImportRestoreReviewViewModel;
  error?: ImportRestoreSafeErrorPresentation;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

export interface InMemoryBackupPreviewHarnessSummary {
  status: InMemoryBackupPreviewHarnessResult["status"];
  parsedAt: string;
  fileName: string;
  byteLength: number;
  validation?: LocalDataBackupValidationPipelineSummary;
  viewModel?: ReturnType<typeof summarizeImportRestoreReviewViewModel>;
  errorCode?: string;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

const defaultMaxBytes = 1_000_000;

function safeFileName(value?: string): string {
  const base = (value ?? "synthetic-backup-preview.json").replace(/[<>]/g, "").replace(/\s+/g, "-");
  return base.length > 96 ? `${base.slice(0, 93)}...` : base;
}

export function buildInMemoryBackupPreviewHarnessResult(
  currentData: LocalDataSafetyAppData,
  parsedObject: unknown,
  options: { fileName?: string; mimeType?: string; byteLength?: number; parsedAt?: string } = {},
): InMemoryBackupPreviewHarnessResult {
  const parsedAt = options.parsedAt ?? new Date().toISOString();
  const fileName = safeFileName(options.fileName);
  const validation = runLocalDataBackupValidationPipeline(
    currentData,
    {
      fileName,
      mimeType: options.mimeType ?? "application/json",
      byteLength: options.byteLength ?? 0,
      parsedObject,
    },
    { validatedAt: parsedAt },
  );
  if (validation.status === "invalid") {
    return {
      marker: "PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1",
      status: "invalid",
      parsedAt,
      fileName,
      byteLength: options.byteLength ?? 0,
      validation,
      error: buildImportRestoreSafeErrorPresentation(new Error("Backup preview validation failed.")),
      applyImportAllowed: false,
      applyRestoreAllowed: false,
      safe: true,
    };
  }
  const reviewModel = buildLocalDataImportRestoreReviewModel(validation);
  return {
    marker: "PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1",
    status: "preview_ready",
    parsedAt,
    fileName,
    byteLength: options.byteLength ?? 0,
    validation,
    reviewModel,
    viewModel: buildImportRestoreReviewViewModel(reviewModel),
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}

export function parseInMemoryBackupJsonForPreview(
  input: InMemoryBackupPreviewHarnessInput,
): InMemoryBackupPreviewHarnessResult {
  const parsedAt = input.parsedAt ?? new Date().toISOString();
  const byteLength = new TextEncoder().encode(input.rawJson).byteLength;
  const maxBytes = input.maxBytes ?? defaultMaxBytes;
  const fileName = safeFileName(input.fileName);

  if (byteLength > maxBytes) {
    return {
      marker: "PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1",
      status: "invalid",
      parsedAt,
      fileName,
      byteLength,
      error: buildImportRestoreSafeErrorPresentation(new Error("Backup preview input is too large.")),
      applyImportAllowed: false,
      applyRestoreAllowed: false,
      safe: true,
    };
  }

  try {
    return buildInMemoryBackupPreviewHarnessResult(input.currentData, JSON.parse(input.rawJson), {
      fileName,
      mimeType: input.mimeType ?? "application/json",
      byteLength,
      parsedAt,
    });
  } catch {
    return {
      marker: "PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1",
      status: "invalid",
      parsedAt,
      fileName,
      byteLength,
      error: buildImportRestoreSafeErrorPresentation(new Error("Backup preview JSON is malformed.")),
      applyImportAllowed: false,
      applyRestoreAllowed: false,
      safe: true,
    };
  }
}

export function summarizeInMemoryBackupPreviewHarness(
  result: InMemoryBackupPreviewHarnessResult,
): InMemoryBackupPreviewHarnessSummary {
  return {
    status: result.status,
    parsedAt: result.parsedAt,
    fileName: result.fileName,
    byteLength: result.byteLength,
    validation: result.validation ? summarizeLocalDataBackupValidationPipeline(result.validation) : undefined,
    viewModel: result.viewModel ? summarizeImportRestoreReviewViewModel(result.viewModel) : undefined,
    errorCode: result.error?.code,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
