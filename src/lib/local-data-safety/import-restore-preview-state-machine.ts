import {
  getImportRestoreSyntheticUiFixture,
  type ImportRestoreSyntheticUiFixtureId,
} from "./import-restore-ui-fixtures";
import {
  parseInMemoryBackupJsonForPreview,
  summarizeInMemoryBackupPreviewHarness,
  type InMemoryBackupPreviewHarnessResult,
  type InMemoryBackupPreviewHarnessSummary,
} from "./in-memory-backup-preview-harness";
import { summarizeImportRestoreReviewViewModel, type ImportRestoreReviewViewModelSummary } from "./import-restore-view-model";
import { handleImportRestoreApplyImportClicked, handleImportRestoreApplyRestoreClicked } from "./import-restore-ui-event-handlers";
import type { LocalDataImportRestoreReviewModel, LocalDataRiskFlag } from "./types";

// PHASE2D47_IMPORT_RESTORE_PREVIEW_FLOW_STATE_MACHINE_V1

export type ImportRestorePreviewFlowStatus =
  | "idle_disabled"
  | "fixture_selected"
  | "parsing_preview"
  | "validation_ready"
  | "review_ready"
  | "manual_review_required"
  | "apply_blocked"
  | "error_safe";

export type ImportRestorePreviewFlowEvent =
  | { type: "select_synthetic_fixture"; fixtureId: ImportRestoreSyntheticUiFixtureId; occurredAt?: string }
  | { type: "parse_preview"; occurredAt?: string }
  | { type: "build_review"; occurredAt?: string }
  | { type: "click_apply_import"; occurredAt?: string }
  | { type: "click_apply_restore"; occurredAt?: string }
  | { type: "reset_preview"; occurredAt?: string }
  | { type: "reject_malformed"; occurredAt?: string };

export interface ImportRestorePreviewFlowAuditEvent {
  eventType: ImportRestorePreviewFlowEvent["type"];
  occurredAt: string;
  from: ImportRestorePreviewFlowStatus;
  to: ImportRestorePreviewFlowStatus;
  fixtureId?: ImportRestoreSyntheticUiFixtureId;
  safe: true;
}

export interface ImportRestorePreviewFlowState {
  marker: "PHASE2D47_IMPORT_RESTORE_PREVIEW_FLOW_STATE_MACHINE_V1";
  status: ImportRestorePreviewFlowStatus;
  generatedAt: string;
  fixtureId?: ImportRestoreSyntheticUiFixtureId;
  preview?: InMemoryBackupPreviewHarnessResult;
  reviewModel?: LocalDataImportRestoreReviewModel;
  viewModelSummary?: ImportRestoreReviewViewModelSummary;
  riskFlags: LocalDataRiskFlag[];
  blockers: string[];
  auditTrail: ImportRestorePreviewFlowAuditEvent[];
  routeConnected: false;
  navigationConnected: false;
  filePickerConnected: false;
  browserStorageUsed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  mutated: false;
  safe: true;
}

export interface ImportRestorePreviewFlowSummary {
  status: ImportRestorePreviewFlowStatus;
  fixtureId?: ImportRestoreSyntheticUiFixtureId;
  preview?: InMemoryBackupPreviewHarnessSummary;
  viewModelSummary?: ImportRestoreReviewViewModelSummary;
  riskFlags: LocalDataRiskFlag[];
  blockers: string[];
  auditEvents: number;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  mutated: false;
  safe: true;
}

export function createImportRestorePreviewFlowState(generatedAt = new Date().toISOString()): ImportRestorePreviewFlowState {
  return {
    marker: "PHASE2D47_IMPORT_RESTORE_PREVIEW_FLOW_STATE_MACHINE_V1",
    status: "idle_disabled",
    generatedAt,
    riskFlags: [],
    blockers: ["Select a synthetic fixture before preview."],
    auditTrail: [],
    routeConnected: false,
    navigationConnected: false,
    filePickerConnected: false,
    browserStorageUsed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    mutated: false,
    safe: true,
  };
}

function withAudit(
  state: ImportRestorePreviewFlowState,
  event: ImportRestorePreviewFlowEvent,
  next: Omit<ImportRestorePreviewFlowState, "auditTrail">,
): ImportRestorePreviewFlowState {
  const occurredAt = event.occurredAt ?? new Date().toISOString();
  return {
    ...next,
    auditTrail: [
      ...state.auditTrail,
      {
        eventType: event.type,
        occurredAt,
        from: state.status,
        to: next.status,
        fixtureId: next.fixtureId,
        safe: true,
      },
    ],
    routeConnected: false,
    navigationConnected: false,
    filePickerConnected: false,
    browserStorageUsed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    mutated: false,
    safe: true,
  };
}

function safeError(
  state: ImportRestorePreviewFlowState,
  event: ImportRestorePreviewFlowEvent,
  reason: string,
): ImportRestorePreviewFlowState {
  return withAudit(state, event, {
    ...state,
    status: "error_safe",
    blockers: [reason, "Import and restore apply remain blocked."],
    riskFlags: state.riskFlags.includes("backup_malformed") ? state.riskFlags : [...state.riskFlags, "backup_malformed"],
  });
}

export function transitionImportRestorePreviewFlowState(
  state: ImportRestorePreviewFlowState,
  event: ImportRestorePreviewFlowEvent,
): ImportRestorePreviewFlowState {
  if (event.type === "reset_preview") {
    return withAudit(state, event, {
      ...createImportRestorePreviewFlowState(event.occurredAt ?? state.generatedAt),
      blockers: ["Preview reset; synthetic fixture selection required."],
    });
  }

  if (event.type === "select_synthetic_fixture") {
    const fixture = getImportRestoreSyntheticUiFixture(event.fixtureId);
    return withAudit(state, event, {
      ...state,
      status: "fixture_selected",
      fixtureId: fixture.id,
      preview: undefined,
      reviewModel: undefined,
      viewModelSummary: undefined,
      riskFlags: [...fixture.expectedRiskFlags],
      blockers: ["Preview can be parsed from synthetic fixture only."],
    });
  }

  if (event.type === "reject_malformed") {
    return safeError(state, event, "Malformed synthetic fixture rejected safely.");
  }

  if (event.type === "parse_preview") {
    if (!state.fixtureId) return safeError(state, event, "Synthetic fixture is required before parsing.");
    const fixture = getImportRestoreSyntheticUiFixture(state.fixtureId);
    const parsingState: ImportRestorePreviewFlowState = {
      ...state,
      status: "parsing_preview",
      blockers: ["Parsing is in-memory and preview-only."],
    };
    const preview = parseInMemoryBackupJsonForPreview({
      currentData: fixture.currentData,
      rawJson: fixture.rawJson,
      fileName: `${fixture.id}.json`,
      parsedAt: event.occurredAt,
    });
    if (preview.status === "invalid") {
      return withAudit(parsingState, event, {
        ...parsingState,
        status: "error_safe",
        preview,
        riskFlags: [...fixture.expectedRiskFlags],
        blockers: ["Preview validation failed safely.", "Import and restore apply remain blocked."],
      });
    }
    return withAudit(parsingState, event, {
      ...parsingState,
      status: "validation_ready",
      preview,
      reviewModel: preview.reviewModel,
      viewModelSummary: preview.viewModel ? summarizeImportRestoreReviewViewModel(preview.viewModel) : undefined,
      riskFlags: [...preview.reviewModel?.riskFlags ?? fixture.expectedRiskFlags],
      blockers: ["Validation preview is ready; build review before any UX review."],
    });
  }

  if (event.type === "build_review") {
    if (!state.preview || state.preview.status !== "preview_ready" || !state.reviewModel) {
      return safeError(state, event, "Valid preview is required before building review.");
    }
    const status: ImportRestorePreviewFlowStatus = state.reviewModel.manualReviewRequired
      ? "manual_review_required"
      : "review_ready";
    return withAudit(state, event, {
      ...state,
      status,
      blockers:
        status === "manual_review_required"
          ? ["Manual review is required; apply remains blocked."]
          : ["Review is ready for UX/legal review; apply remains blocked."],
    });
  }

  if (event.type === "click_apply_import") {
    const result = handleImportRestoreApplyImportClicked(event.occurredAt);
    return withAudit(state, event, {
      ...state,
      status: "apply_blocked",
      blockers: [result.blocker?.reason ?? "Import apply is blocked."],
    });
  }

  if (event.type === "click_apply_restore") {
    const result = handleImportRestoreApplyRestoreClicked(event.occurredAt);
    return withAudit(state, event, {
      ...state,
      status: "apply_blocked",
      blockers: [result.blocker?.reason ?? "Restore apply is blocked."],
    });
  }

  return safeError(state, event, "Unsupported event rejected safely.");
}

export function summarizeImportRestorePreviewFlowState(
  state: ImportRestorePreviewFlowState,
): ImportRestorePreviewFlowSummary {
  return {
    status: state.status,
    fixtureId: state.fixtureId,
    preview: state.preview ? summarizeInMemoryBackupPreviewHarness(state.preview) : undefined,
    viewModelSummary: state.viewModelSummary,
    riskFlags: [...state.riskFlags],
    blockers: [...state.blockers],
    auditEvents: state.auditTrail.length,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    mutated: false,
    safe: true,
  };
}
