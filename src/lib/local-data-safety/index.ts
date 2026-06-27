// PHASE2D1_10_LOCAL_DATA_BACKUP_RESTORE_SAFETY_V1

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
export type {
  InMemoryLocalDataSafetyAuditSink,
  LocalDataBackupIntegrityDigest,
  LocalDataBackupManifest,
  LocalDataBackupManifestOptions,
  LocalDataBackupManifestSummary,
  LocalDataDocumentSafeSummary,
  LocalDataImportDryRunDocumentDecision,
  LocalDataImportDryRunOptions,
  LocalDataImportDryRunPlan,
  LocalDataImportDryRunSummary,
  LocalDataProtectedDocumentRef,
  LocalDataRecoverySnapshot,
  LocalDataRecoverySnapshotOptions,
  LocalDataRecoverySnapshotSummary,
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
} from "./types";
