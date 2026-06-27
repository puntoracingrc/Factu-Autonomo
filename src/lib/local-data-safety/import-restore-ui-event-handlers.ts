import { assertLocalDataImportApplyBlocked, assertLocalDataRestoreApplyBlocked } from "./import-restore-apply-blocker";
import {
  parseInMemoryBackupJsonForPreview,
  summarizeInMemoryBackupPreviewHarness,
  type InMemoryBackupPreviewHarnessInput,
  type InMemoryBackupPreviewHarnessResult,
  type InMemoryBackupPreviewHarnessSummary,
} from "./in-memory-backup-preview-harness";
import { buildImportRestoreUiAuditEvent, type ImportRestoreUiAuditEvent } from "./import-restore-ui-audit";
import type { LocalDataApplyBlockedResult } from "./types";

// PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1

export interface ImportRestoreUiHandlerResult {
  marker: "PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1";
  eventType: "preview_requested" | "apply_import_clicked" | "apply_restore_clicked";
  status: "preview_ready" | "invalid" | "blocked";
  preview?: InMemoryBackupPreviewHarnessResult;
  blocker?: LocalDataApplyBlockedResult;
  auditEvent: ImportRestoreUiAuditEvent;
  mutated: false;
  safe: true;
}

export interface ImportRestoreUiHandlerSummary {
  eventType: ImportRestoreUiHandlerResult["eventType"];
  status: ImportRestoreUiHandlerResult["status"];
  preview?: InMemoryBackupPreviewHarnessSummary;
  blocked: boolean;
  mutated: false;
  safe: true;
}

export interface ImportRestoreDisabledUiEventHandlers {
  marker: "PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1";
  handlePreviewRequested(input: InMemoryBackupPreviewHarnessInput): ImportRestoreUiHandlerResult;
  handleApplyImportClicked(): ImportRestoreUiHandlerResult;
  handleApplyRestoreClicked(): ImportRestoreUiHandlerResult;
}

function previewResult(preview: InMemoryBackupPreviewHarnessResult): ImportRestoreUiHandlerResult {
  return {
    marker: "PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1",
    eventType: "preview_requested",
    status: preview.status === "preview_ready" ? "preview_ready" : "invalid",
    preview,
    auditEvent: buildImportRestoreUiAuditEvent({
      eventType: "validation_preview_requested",
      safeDetails: { status: preview.status, byteLength: preview.byteLength },
    }),
    mutated: false,
    safe: true,
  };
}

export function handleImportRestorePreviewRequested(
  input: InMemoryBackupPreviewHarnessInput,
): ImportRestoreUiHandlerResult {
  return previewResult(parseInMemoryBackupJsonForPreview(input));
}

export function handleImportRestoreApplyImportClicked(generatedAt?: string): ImportRestoreUiHandlerResult {
  return {
    marker: "PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1",
    eventType: "apply_import_clicked",
    status: "blocked",
    blocker: assertLocalDataImportApplyBlocked(generatedAt),
    auditEvent: buildImportRestoreUiAuditEvent({ eventType: "apply_import_clicked_but_blocked" }),
    mutated: false,
    safe: true,
  };
}

export function handleImportRestoreApplyRestoreClicked(generatedAt?: string): ImportRestoreUiHandlerResult {
  return {
    marker: "PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1",
    eventType: "apply_restore_clicked",
    status: "blocked",
    blocker: assertLocalDataRestoreApplyBlocked(generatedAt),
    auditEvent: buildImportRestoreUiAuditEvent({ eventType: "apply_restore_clicked_but_blocked" }),
    mutated: false,
    safe: true,
  };
}

export function createImportRestoreDisabledUiEventHandlers(): ImportRestoreDisabledUiEventHandlers {
  return {
    marker: "PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1",
    handlePreviewRequested: handleImportRestorePreviewRequested,
    handleApplyImportClicked: handleImportRestoreApplyImportClicked,
    handleApplyRestoreClicked: handleImportRestoreApplyRestoreClicked,
  };
}

export function summarizeImportRestoreUiHandlerResult(
  result: ImportRestoreUiHandlerResult,
): ImportRestoreUiHandlerSummary {
  return {
    eventType: result.eventType,
    status: result.status,
    preview: result.preview ? summarizeInMemoryBackupPreviewHarness(result.preview) : undefined,
    blocked: result.status === "blocked",
    mutated: false,
    safe: true,
  };
}
