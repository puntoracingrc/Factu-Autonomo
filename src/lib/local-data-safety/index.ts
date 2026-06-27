// PHASE2D1_10_LOCAL_DATA_BACKUP_RESTORE_SAFETY_V1
// PHASE2D11_20_LOCAL_DATA_IMPORT_RESTORE_REVIEW_FLOW_V1
// PHASE2D21_32_DISABLED_IMPORT_RESTORE_UI_SHELL_V1
// PHASE2D33_44_DISABLED_IMPORT_RESTORE_UI_WIRING_GATES_V1
// PHASE2D45_56_ROUTELESS_IMPORT_RESTORE_UI_PREVIEW_HARNESS_V1

export { LocalDataSafetyError } from "./errors";
export type { LocalDataSafetyErrorCode } from "./errors";
export {
  buildLocalDataBackupManifest,
  summarizeLocalDataBackupManifest,
  validateLocalDataBackupManifest,
} from "./backup-manifest";
export {
  buildLocalDataBackupIntegrityDigest,
  canonicalizeLocalDataBackupForHash,
  verifyLocalDataBackupIntegrity,
} from "./backup-integrity";
export {
  planLocalDataImportDryRun,
  summarizeLocalDataImportDryRun,
} from "./import-dry-run";
export {
  buildPreImportRecoverySnapshot,
  summarizePreImportRecoverySnapshot,
  validatePreImportRecoverySnapshot,
} from "./recovery-snapshot";
export {
  planLocalDataRestore,
  summarizeLocalDataRestorePlan,
} from "./restore-planner";
export {
  assertLocalDataSafetyReportSafe,
  buildLocalDataSafetyReport,
  redactLocalDataSafetyReport,
} from "./local-data-safety-report";
export {
  assertLocalDataSafetyAuditEventSafe,
  buildLocalDataSafetyAuditEvent,
  createInMemoryLocalDataSafetyAuditSink,
  redactLocalDataSafetyAuditEvent,
} from "./local-data-safety-audit";
export {
  inspectLocalDataBackupIntakeCandidate,
  summarizeLocalDataBackupIntake,
} from "./backup-intake";
export {
  runLocalDataBackupValidationPipeline,
  summarizeLocalDataBackupValidationPipeline,
} from "./backup-validation-pipeline";
export {
  buildLocalDataImportRestoreReviewModel,
  summarizeLocalDataImportRestoreReviewModel,
} from "./import-restore-review-model";
export {
  buildLocalDataImportRestoreConfirmationChecklist,
  evaluateLocalDataImportRestoreHumanConfirmation,
  summarizeLocalDataImportRestoreConfirmation,
} from "./import-restore-confirmation-gate";
export {
  assertLocalDataImportApplyBlocked,
  assertLocalDataRestoreApplyBlocked,
  buildLocalDataApplyBlockedResult,
} from "./import-restore-apply-blocker";
export {
  createDisabledLocalDataStorageAdapter,
  evaluateLocalDataStorageAdapterReadiness,
  summarizeLocalDataStorageAdapter,
} from "./localstorage-adapter-contract";
export {
  assertSafeParsedLocalDataBackupObject,
  detectMalformedLocalDataBackup,
  summarizeMalformedBackupFindings,
} from "./malformed-backup-hardening";
export {
  assertLocalDataImportRestoreReviewReportSafe,
  buildLocalDataImportRestoreReviewReport,
  redactLocalDataImportRestoreReviewReport,
} from "./import-restore-review-report";
export {
  evaluateLocalDataSafetyUiShellScope,
  summarizeLocalDataSafetyUiShellScope,
} from "./ui-shell-scope";
export {
  assertImportRestoreReviewViewModelSafe,
  buildImportRestoreReviewViewModel,
  summarizeImportRestoreReviewViewModel,
} from "./import-restore-view-model";
export {
  assertImportRestoreActionBlocked,
  buildImportRestoreDisabledActions,
  summarizeImportRestoreDisabledActions,
} from "./import-restore-disabled-actions";
export {
  buildImportRestoreReviewCopy,
  summarizeImportRestoreReviewCopy,
  validateImportRestoreReviewCopy,
} from "./import-restore-copy";
export {
  buildImportRestorePreviewList,
  paginateImportRestorePreviewItems,
  summarizeImportRestorePreviewList,
} from "./import-restore-preview-list";
export {
  assertImportRestoreErrorPresentationSafe,
  buildImportRestoreSafeErrorPresentation,
  redactImportRestoreErrorForDisplay,
} from "./import-restore-error-presenter";
export {
  assertImportRestoreUiAuditEventSafe,
  buildImportRestoreUiAuditEvent,
  createInMemoryImportRestoreUiAuditSink,
} from "./import-restore-ui-audit";
export {
  buildImportRestoreUiWiringBlockers,
  evaluateImportRestoreUiWiringReadiness,
  summarizeImportRestoreUiWiringReadiness,
} from "./import-restore-ui-wiring-gate";
export {
  assertBackupFileSelectionDisabled,
  createDisabledBackupFileSelectionAdapter,
  summarizeBackupFileSelectionAdapter,
} from "./disabled-file-selection-adapter";
export {
  buildInMemoryBackupPreviewHarnessResult,
  parseInMemoryBackupJsonForPreview,
  summarizeInMemoryBackupPreviewHarness,
} from "./in-memory-backup-preview-harness";
export {
  createImportRestoreDisabledUiEventHandlers,
  handleImportRestoreApplyImportClicked,
  handleImportRestoreApplyRestoreClicked,
  handleImportRestorePreviewRequested,
  summarizeImportRestoreUiHandlerResult,
} from "./import-restore-ui-event-handlers";
export {
  assertDisabledImportRestoreShellPropsSafe,
  buildDisabledImportRestoreShellProps,
  summarizeDisabledImportRestoreShellProps,
} from "./import-restore-wiring-props";
export {
  buildRoutelessImportRestoreUiHarnessBlockers,
  evaluateRoutelessImportRestoreUiHarnessScope,
  summarizeRoutelessImportRestoreUiHarnessScope,
} from "./routeless-ui-harness-scope";
export {
  getImportRestoreSyntheticUiFixture,
  listImportRestoreSyntheticUiFixtures,
  validateImportRestoreSyntheticUiFixture,
} from "./import-restore-ui-fixtures";
export {
  createImportRestorePreviewFlowState,
  summarizeImportRestorePreviewFlowState,
  transitionImportRestorePreviewFlowState,
} from "./import-restore-preview-state-machine";
export {
  createImportRestoreReviewSession,
  summarizeImportRestoreReviewSession,
  updateImportRestoreReviewSession,
} from "./import-restore-review-session";
export {
  buildImportRestoreDataLossWarnings,
  summarizeImportRestoreDataLossWarnings,
} from "./import-restore-data-loss-warning";
export {
  assertRecoverySnapshotDownloadDisabled,
  buildDisabledRecoverySnapshotDownloadPlaceholder,
  summarizeRecoverySnapshotDownloadPlaceholder,
} from "./recovery-snapshot-download-placeholder";
export {
  assertImportRestoreUxLegalReviewPacketSafe,
  buildImportRestoreUxLegalReviewPacket,
  redactImportRestoreUxLegalReviewPacket,
  summarizeImportRestoreUxLegalReviewPacket,
} from "./import-restore-ux-legal-review-packet";
export type {
  ImportRestoreDisabledAction,
  ImportRestoreDisabledActionId,
  ImportRestoreDisabledActionsModel,
  ImportRestoreDisabledActionsSummary,
  ImportRestoreDisabledActionState,
} from "./import-restore-disabled-actions";
export type {
  ImportRestoreReviewCopy,
  ImportRestoreReviewCopySummary,
} from "./import-restore-copy";
export type {
  ImportRestorePreviewItem,
  ImportRestorePreviewItemInput,
  ImportRestorePreviewList,
  ImportRestorePreviewListSummary,
} from "./import-restore-preview-list";
export type {
  ImportRestoreReviewViewModel,
  ImportRestoreReviewViewModelSummary,
} from "./import-restore-view-model";
export type { ImportRestoreSafeErrorPresentation } from "./import-restore-error-presenter";
export type {
  ImportRestoreUiAuditEvent,
  ImportRestoreUiAuditEventInput,
  ImportRestoreUiAuditEventType,
  ImportRestoreUiAuditSink,
} from "./import-restore-ui-audit";
export type {
  LocalDataSafetyUiShellScope,
  LocalDataSafetyUiShellScopeInput,
  LocalDataSafetyUiShellScopeStatus,
  LocalDataSafetyUiShellScopeSummary,
} from "./ui-shell-scope";
export type {
  ImportRestoreUiWiringReadiness,
  ImportRestoreUiWiringReadinessInput,
  ImportRestoreUiWiringReadinessStatus,
  ImportRestoreUiWiringReadinessSummary,
} from "./import-restore-ui-wiring-gate";
export type {
  DisabledBackupFileSelectionAdapter,
  DisabledBackupFileSelectionResult,
  DisabledBackupFileSelectionSummary,
} from "./disabled-file-selection-adapter";
export type {
  InMemoryBackupPreviewHarnessInput,
  InMemoryBackupPreviewHarnessResult,
  InMemoryBackupPreviewHarnessSummary,
} from "./in-memory-backup-preview-harness";
export type {
  ImportRestoreDisabledUiEventHandlers,
  ImportRestoreUiHandlerResult,
  ImportRestoreUiHandlerSummary,
} from "./import-restore-ui-event-handlers";
export type {
  DisabledImportRestoreShellProps,
  DisabledImportRestoreShellPropsSummary,
} from "./import-restore-wiring-props";
export type {
  RoutelessImportRestoreUiHarnessScope,
  RoutelessImportRestoreUiHarnessScopeInput,
  RoutelessImportRestoreUiHarnessScopeStatus,
  RoutelessImportRestoreUiHarnessScopeSummary,
} from "./routeless-ui-harness-scope";
export type {
  ImportRestoreSyntheticUiFixture,
  ImportRestoreSyntheticUiFixtureId,
  ImportRestoreSyntheticUiFixtureValidation,
  ImportRestoreSyntheticUiScenario,
} from "./import-restore-ui-fixtures";
export type {
  ImportRestorePreviewFlowAuditEvent,
  ImportRestorePreviewFlowEvent,
  ImportRestorePreviewFlowState,
  ImportRestorePreviewFlowStatus,
  ImportRestorePreviewFlowSummary,
} from "./import-restore-preview-state-machine";
export type {
  ImportRestoreReviewSession,
  ImportRestoreReviewSessionInput,
  ImportRestoreReviewSessionSummary,
} from "./import-restore-review-session";
export type {
  ImportRestoreDataLossWarning,
  ImportRestoreDataLossWarningId,
  ImportRestoreDataLossWarningInput,
  ImportRestoreDataLossWarningsModel,
  ImportRestoreDataLossWarningsSummary,
} from "./import-restore-data-loss-warning";
export type {
  DisabledRecoverySnapshotDownloadPlaceholder,
  DisabledRecoverySnapshotDownloadPlaceholderInput,
  DisabledRecoverySnapshotDownloadPlaceholderSummary,
} from "./recovery-snapshot-download-placeholder";
export type {
  ImportRestoreUxLegalReviewPacket,
  ImportRestoreUxLegalReviewPacketInput,
  ImportRestoreUxLegalReviewPacketSummary,
} from "./import-restore-ux-legal-review-packet";
export type {
  DisabledLocalDataStorageAdapter,
  InMemoryLocalDataSafetyAuditSink,
  LocalDataBackupIntegrityDigest,
  LocalDataBackupIntakeCandidate,
  LocalDataBackupIntakeError,
  LocalDataBackupIntakeOptions,
  LocalDataBackupIntakeResult,
  LocalDataBackupIntakeSafeSummary,
  LocalDataBackupManifest,
  LocalDataBackupManifestOptions,
  LocalDataBackupManifestSummary,
  LocalDataBackupValidationPipelineError,
  LocalDataBackupValidationPipelineOptions,
  LocalDataBackupValidationPipelineResult,
  LocalDataBackupValidationPipelineSummary,
  LocalDataBackupValidationStage,
  LocalDataDocumentSafeSummary,
  LocalDataApplyBlockedResult,
  LocalDataImportDryRunDocumentDecision,
  LocalDataImportDryRunOptions,
  LocalDataImportDryRunPlan,
  LocalDataImportDryRunSummary,
  LocalDataImportRestoreConfirmationApprovals,
  LocalDataImportRestoreConfirmationChecklist,
  LocalDataImportRestoreConfirmationResult,
  LocalDataImportRestoreConfirmationSummary,
  LocalDataImportRestoreReviewModel,
  LocalDataImportRestoreReviewModelSummary,
  LocalDataImportRestoreReviewReport,
  LocalDataImportRestoreReviewReportInput,
  LocalDataMalformedBackupFinding,
  LocalDataMalformedBackupOptions,
  LocalDataMalformedBackupResult,
  LocalDataMalformedBackupSummary,
  LocalDataProtectedDocumentRef,
  LocalDataRecoverySnapshot,
  LocalDataRecoverySnapshotOptions,
  LocalDataRecoverySnapshotSummary,
  LocalDataReviewActionState,
  LocalDataReviewDecision,
  LocalDataReviewSection,
  LocalDataReviewSeverity,
  LocalDataRestoreDecision,
  LocalDataRestorePlannerOptions,
  LocalDataRestorePlan,
  LocalDataRestorePlanSummary,
  LocalDataRiskFlag,
  LocalDataSafetyAppData,
  LocalDataSafetyAuditEvent,
  LocalDataSafetyAuditEventInput,
  LocalDataSafetyAuditEventType,
  LocalDataSafetyDocumentLike,
  LocalDataSafetyEntityLike,
  LocalDataSafetyReport,
  LocalDataSafetyReportInput,
  LocalDataStorageAdapterReadiness,
} from "./types";
