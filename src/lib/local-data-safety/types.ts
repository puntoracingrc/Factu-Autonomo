// PHASE2D1_10_LOCAL_DATA_BACKUP_RESTORE_SAFETY_V1
// PHASE2D11_20_LOCAL_DATA_IMPORT_RESTORE_REVIEW_FLOW_V1
// PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1

export type LocalDataRecordId = string;

export type LocalDataDocumentLifecycle = "draft" | "issued" | "canceled";

export type LocalDataIntegrityLock = "unlocked" | "locked";

export type LocalDataRiskFlag =
  | "protected_issued_document"
  | "protected_canceled_document"
  | "protected_locked_document"
  | "protected_legacy_non_draft"
  | "snapshot_hash_present"
  | "pdf_snapshot_hash_present"
  | "snapshot_body_present"
  | "pdf_snapshot_body_present"
  | "numbering_present"
  | "counter_state_present"
  | "incoming_would_add_document"
  | "incoming_would_update_draft"
  | "incoming_would_overwrite_protected"
  | "incoming_snapshot_hash_mismatch"
  | "incoming_pdf_snapshot_hash_mismatch"
  | "incoming_counter_change"
  | "restore_would_change_protected"
  | "restore_would_remove_protected"
  | "restore_snapshot_missing"
  | "backup_intake_rejected"
  | "backup_validation_failed"
  | "backup_malformed"
  | "review_manual_confirmation_required"
  | "apply_import_blocked"
  | "apply_restore_blocked"
  | "storage_adapter_disabled";

export interface LocalDataSafetyDocumentLike {
  id?: string;
  localId?: string;
  kind?: string;
  type?: string;
  status?: string | null;
  documentLifecycle?: LocalDataDocumentLifecycle | string | null;
  integrityLock?: LocalDataIntegrityLock | string | null;
  number?: string | number | null;
  year?: string | number | null;
  customerId?: string | null;
  updatedAt?: string | null;
  snapshotHash?: string | null;
  pdfSnapshotHash?: string | null;
  documentSnapshot?: unknown;
  pdfSnapshot?: unknown;
  [key: string]: unknown;
}

export interface LocalDataSafetyEntityLike {
  id?: string;
  localId?: string;
  name?: string | null;
  displayName?: string | null;
  nif?: string | null;
  taxId?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
}

export interface LocalDataSafetyAppData {
  documents?: LocalDataSafetyDocumentLike[];
  customers?: LocalDataSafetyEntityLike[];
  clients?: LocalDataSafetyEntityLike[];
  providers?: LocalDataSafetyEntityLike[];
  expenses?: LocalDataSafetyEntityLike[];
  counters?: Record<string, unknown>;
  numbering?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LocalDataBackupManifestOptions {
  generatedAt?: string;
  source?: "local_app_data" | "import_preview" | "test_fixture";
  manifestVersion?: "local-data-backup-manifest-v1";
  integrityDigest?: string;
}

export interface LocalDataBackupManifest {
  marker: "PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1";
  manifestVersion: "local-data-backup-manifest-v1";
  generatedAt: string;
  source: "local_app_data" | "import_preview" | "test_fixture";
  integrityDigest?: string;
  totals: {
    documents: number;
    customers: number;
    providers: number;
    expenses: number;
    counters: number;
    protectedDocuments: number;
    draftDocuments: number;
  };
  documentKinds: Record<string, number>;
  documentStatuses: Record<string, number>;
  lifecycleCounts: Record<string, number>;
  riskFlags: LocalDataRiskFlag[];
  protectedDocumentRefs: LocalDataProtectedDocumentRef[];
}

export interface LocalDataProtectedDocumentRef {
  documentRef: string;
  kind: string;
  status?: string;
  lifecycle?: string;
  integrityLock?: string;
  number?: string;
  year?: string;
  snapshotHashPresent: boolean;
  pdfSnapshotHashPresent: boolean;
}

export interface LocalDataBackupManifestSummary {
  manifestVersion: string;
  generatedAt: string;
  source: string;
  totals: LocalDataBackupManifest["totals"];
  riskFlags: LocalDataRiskFlag[];
}

export interface LocalDataBackupIntegrityDigest {
  marker: "PHASE2D3_BACKUP_INTEGRITY_HASH_V1";
  algorithm: "sha256";
  canonicalVersion: "local-data-backup-canonical-v1";
  value: string;
  generatedAt: string;
}

export type LocalDataImportDryRunAction =
  | "add_document"
  | "update_draft"
  | "keep_current"
  | "manual_review"
  | "reject_protected";

export interface LocalDataImportDryRunOptions {
  plannedAt?: string;
  allowDraftUpdates?: boolean;
}

export interface LocalDataImportDryRunDocumentDecision {
  documentRef: string;
  action: LocalDataImportDryRunAction;
  currentProtected: boolean;
  incomingProtected: boolean;
  riskFlags: LocalDataRiskFlag[];
  safeSummary: LocalDataDocumentSafeSummary;
}

export interface LocalDataImportDryRunPlan {
  marker: "PHASE2D4_IMPORT_DRY_RUN_PLANNER_V1";
  dryRun: true;
  plannedAt: string;
  totals: {
    incomingDocuments: number;
    currentDocuments: number;
    additions: number;
    draftUpdates: number;
    kept: number;
    manualReview: number;
    rejectedProtected: number;
  };
  riskFlags: LocalDataRiskFlag[];
  decisions: LocalDataImportDryRunDocumentDecision[];
}

export interface LocalDataImportDryRunSummary {
  dryRun: true;
  plannedAt: string;
  totals: LocalDataImportDryRunPlan["totals"];
  riskFlags: LocalDataRiskFlag[];
}

export interface LocalDataRecoverySnapshotOptions {
  createdAt?: string;
  reason?: "before_import" | "before_restore_preview" | "test_fixture";
}

export interface LocalDataRecoverySnapshot {
  marker: "PHASE2D5_PRE_IMPORT_RECOVERY_SNAPSHOT_BUILDER_V1";
  snapshotVersion: "pre-import-recovery-snapshot-v1";
  createdAt: string;
  reason: "before_import" | "before_restore_preview" | "test_fixture";
  manifest: LocalDataBackupManifest;
  integrityDigest: LocalDataBackupIntegrityDigest;
  appData: LocalDataSafetyAppData;
}

export interface LocalDataRecoverySnapshotSummary {
  snapshotVersion: string;
  createdAt: string;
  reason: string;
  manifest: LocalDataBackupManifestSummary;
  integrityDigestPresent: boolean;
}

export interface LocalDataRestorePlannerOptions {
  plannedAt?: string;
  allowDraftRestores?: boolean;
}

export type LocalDataRestoreAction =
  | "restore_missing_draft"
  | "restore_changed_draft"
  | "keep_current"
  | "manual_review"
  | "blocked_protected";

export interface LocalDataRestoreDecision {
  documentRef: string;
  action: LocalDataRestoreAction;
  currentProtected: boolean;
  snapshotProtected: boolean;
  riskFlags: LocalDataRiskFlag[];
  safeSummary: LocalDataDocumentSafeSummary;
}

export interface LocalDataRestorePlan {
  marker: "PHASE2D6_RESTORE_PLANNER_DOCUMENT_PROTECTION_V1";
  dryRun: true;
  plannedAt: string;
  snapshotCreatedAt: string;
  totals: {
    currentDocuments: number;
    snapshotDocuments: number;
    draftRestores: number;
    kept: number;
    manualReview: number;
    blockedProtected: number;
  };
  riskFlags: LocalDataRiskFlag[];
  decisions: LocalDataRestoreDecision[];
}

export interface LocalDataRestorePlanSummary {
  dryRun: true;
  plannedAt: string;
  snapshotCreatedAt: string;
  totals: LocalDataRestorePlan["totals"];
  riskFlags: LocalDataRiskFlag[];
}

export interface LocalDataDocumentSafeSummary {
  documentRef: string;
  kind: string;
  status?: string;
  lifecycle?: string;
  integrityLock?: string;
  number?: string;
  year?: string;
  customerRef?: string;
  snapshotHashPresent: boolean;
  pdfSnapshotHashPresent: boolean;
}

export interface LocalDataSafetyReportInput {
  manifest?: LocalDataBackupManifest;
  integrityDigest?: LocalDataBackupIntegrityDigest;
  importPlan?: LocalDataImportDryRunPlan;
  recoverySnapshot?: LocalDataRecoverySnapshot;
  restorePlan?: LocalDataRestorePlan;
  auditEvents?: LocalDataSafetyAuditEvent[];
  generatedAt?: string;
}

export interface LocalDataSafetyReport {
  marker: "PHASE2D7_LOCAL_DATA_SAFETY_REPORT_V1";
  generatedAt: string;
  manifest?: LocalDataBackupManifestSummary;
  integrityDigestPresent: boolean;
  importPlan?: LocalDataImportDryRunSummary;
  recoverySnapshot?: LocalDataRecoverySnapshotSummary;
  restorePlan?: LocalDataRestorePlanSummary;
  audit: {
    totalEvents: number;
    eventTypes: Record<LocalDataSafetyAuditEventType, number>;
  };
  riskFlags: LocalDataRiskFlag[];
  safe: true;
}

export type LocalDataSafetyAuditEventType =
  | "backup_manifest_built"
  | "backup_integrity_verified"
  | "import_dry_run_planned"
  | "import_risk_detected"
  | "recovery_snapshot_built"
  | "restore_plan_built"
  | "restore_blocked";

export interface LocalDataSafetyAuditEventInput {
  eventType: LocalDataSafetyAuditEventType;
  occurredAt?: string;
  requestId?: string;
  riskFlags?: LocalDataRiskFlag[];
  documentRef?: string;
  details?: Record<string, unknown>;
}

export interface LocalDataSafetyAuditEvent {
  marker: "PHASE2D8_LOCAL_DATA_SAFETY_AUDIT_EVENTS_V1";
  eventType: LocalDataSafetyAuditEventType;
  occurredAt: string;
  requestId?: string;
  riskFlags: LocalDataRiskFlag[];
  documentRef?: string;
  details?: Record<string, unknown>;
  persisted: false;
}

export interface InMemoryLocalDataSafetyAuditSink {
  record(input: LocalDataSafetyAuditEventInput): LocalDataSafetyAuditEvent;
  list(): LocalDataSafetyAuditEvent[];
  clear(): void;
}

export interface LocalDataBackupIntakeCandidate {
  // PHASE2D11_BACKUP_FILE_INTAKE_CONTRACT_V1
  fileName: string;
  mimeType?: string;
  byteLength: number;
  parsedObject?: unknown;
}

export interface LocalDataBackupIntakeOptions {
  maxBytes?: number;
  inspectedAt?: string;
  allowEmptyMimeType?: boolean;
}

export interface LocalDataBackupIntakeError {
  code:
    | "MISSING_FILE_NAME"
    | "SUSPICIOUS_FILE_NAME"
    | "FORBIDDEN_EXTENSION"
    | "UNEXPECTED_EXTENSION"
    | "UNEXPECTED_MIME_TYPE"
    | "BACKUP_TOO_LARGE"
    | "INVALID_PARSED_OBJECT";
  message: string;
}

export interface LocalDataBackupIntakeSafeSummary {
  fileName: string;
  extension: string;
  mimeType: string;
  byteLength: number;
  accepted: boolean;
  inspectedAt: string;
  errorCodes: LocalDataBackupIntakeError["code"][];
}

export interface LocalDataBackupIntakeResult {
  marker: "PHASE2D11_BACKUP_FILE_INTAKE_CONTRACT_V1";
  accepted: boolean;
  inspectedAt: string;
  candidate: {
    fileName: string;
    extension: string;
    mimeType: string;
    byteLength: number;
    parsedObjectPresent: boolean;
  };
  errors: LocalDataBackupIntakeError[];
}

export type LocalDataBackupValidationStage =
  | "intake"
  | "malformed_hardening"
  | "manifest"
  | "integrity"
  | "import_dry_run"
  | "recovery_snapshot"
  | "safe_report"
  | "completed";

export interface LocalDataBackupValidationPipelineOptions {
  validatedAt?: string;
  intake?: LocalDataBackupIntakeOptions;
}

export interface LocalDataBackupValidationPipelineError {
  stage: LocalDataBackupValidationStage;
  code: string;
  message: string;
}

export interface LocalDataBackupValidationPipelineResult {
  marker: "PHASE2D12_BACKUP_VALIDATION_PIPELINE_V1";
  status: "valid" | "invalid";
  validatedAt: string;
  stoppedAt: LocalDataBackupValidationStage;
  intake: LocalDataBackupIntakeResult;
  malformedFindings?: LocalDataMalformedBackupSummary;
  manifest?: LocalDataBackupManifest;
  integrityDigest?: LocalDataBackupIntegrityDigest;
  importPlan?: LocalDataImportDryRunPlan;
  recoverySnapshot?: LocalDataRecoverySnapshotSummary;
  safeReport?: LocalDataSafetyReport;
  errors: LocalDataBackupValidationPipelineError[];
  riskFlags: LocalDataRiskFlag[];
}

export interface LocalDataBackupValidationPipelineSummary {
  status: "valid" | "invalid";
  validatedAt: string;
  stoppedAt: LocalDataBackupValidationStage;
  intake: LocalDataBackupIntakeSafeSummary;
  totals?: LocalDataBackupManifest["totals"];
  importPlan?: LocalDataImportDryRunSummary;
  recoverySnapshotPresent: boolean;
  safeReportPresent: boolean;
  errorCodes: string[];
  riskFlags: LocalDataRiskFlag[];
}

export type LocalDataReviewSeverity = "info" | "warning" | "blocked";

export type LocalDataReviewDecision =
  | "dry_run_ready"
  | "manual_review_required"
  | "blocked_until_review";

export interface LocalDataReviewActionState {
  allowDryRunOnly: true;
  allowApplyImport: false;
  allowApplyRestore: false;
  requiresHumanConfirmation: boolean;
}

export interface LocalDataReviewSection {
  id: "overview" | "backup_summary" | "import_risks" | "restore_risks" | "blockers";
  title: string;
  severity: LocalDataReviewSeverity;
  count: number;
  messages: string[];
}

export interface LocalDataImportRestoreReviewModel {
  marker: "PHASE2D13_IMPORT_RESTORE_REVIEW_MODEL_V1";
  generatedAt: string;
  status: "ready_for_review" | "blocked";
  severity: LocalDataReviewSeverity;
  decision: LocalDataReviewDecision;
  manualReviewRequired: boolean;
  protectedDocumentsCount: number;
  sections: LocalDataReviewSection[];
  actions: LocalDataReviewActionState;
  riskFlags: LocalDataRiskFlag[];
}

export interface LocalDataImportRestoreReviewModelSummary {
  status: LocalDataImportRestoreReviewModel["status"];
  severity: LocalDataReviewSeverity;
  decision: LocalDataReviewDecision;
  manualReviewRequired: boolean;
  protectedDocumentsCount: number;
  actions: LocalDataReviewActionState;
  riskFlags: LocalDataRiskFlag[];
}

export interface LocalDataImportRestoreConfirmationApprovals {
  backupReviewed?: boolean;
  protectedDocumentsReviewed?: boolean;
  numberingRisksReviewed?: boolean;
  snapshotRisksReviewed?: boolean;
  dryRunReportReviewed?: boolean;
  externalReviewAccepted?: boolean;
}

export interface LocalDataImportRestoreConfirmationChecklist {
  marker: "PHASE2D14_IMPORT_RESTORE_HUMAN_CONFIRMATION_GATE_V1";
  backupReviewed: false;
  protectedDocumentsReviewed: false;
  numberingRisksReviewed: false;
  snapshotRisksReviewed: false;
  dryRunReportReviewed: false;
  externalReviewAccepted: false;
}

export interface LocalDataImportRestoreConfirmationResult {
  marker: "PHASE2D14_IMPORT_RESTORE_HUMAN_CONFIRMATION_GATE_V1";
  evaluatedAt: string;
  requiresHumanConfirmation: boolean;
  manualReviewRequired: boolean;
  approvals: Required<LocalDataImportRestoreConfirmationApprovals>;
  canProceedToApply: false;
  reasons: string[];
}

export interface LocalDataImportRestoreConfirmationSummary {
  evaluatedAt: string;
  requiresHumanConfirmation: boolean;
  manualReviewRequired: boolean;
  canProceedToApply: false;
  reasons: string[];
}

export interface LocalDataApplyBlockedResult {
  marker: "PHASE2D15_IMPORT_RESTORE_APPLY_BLOCKER_V1";
  blocked: true;
  operation: "import" | "restore";
  reason: "APPLY_DISABLED_PENDING_UI_AND_EXTERNAL_REVIEW";
  generatedAt: string;
  safe: true;
}

export interface LocalDataStorageAdapterReadiness {
  marker: "PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1";
  status: "disabled";
  canRead: false;
  canWrite: false;
  reason: "DISABLED_PENDING_UI_REVIEW_AND_BACKUP";
  evaluatedAt: string;
}

export interface DisabledLocalDataStorageAdapter {
  marker: "PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1";
  read(): LocalDataStorageAdapterReadiness;
  write(): LocalDataStorageAdapterReadiness;
  summarize(): LocalDataStorageAdapterReadiness;
}

export interface LocalDataMalformedBackupFinding {
  code:
    | "UNSAFE_KEY"
    | "CIRCULAR_REFERENCE"
    | "TOO_DEEP"
    | "ARRAY_TOO_LARGE"
    | "UNEXPECTED_FUNCTION"
    | "UNEXPECTED_INSTANCE"
    | "SUSPICIOUS_STRING";
  path: string;
  severity: LocalDataReviewSeverity;
}

export interface LocalDataMalformedBackupOptions {
  maxDepth?: number;
  maxArrayLength?: number;
}

export interface LocalDataMalformedBackupSummary {
  marker: "PHASE2D17_MALFORMED_BACKUP_HARDENING_V1";
  safe: boolean;
  totalFindings: number;
  maxSeverity: LocalDataReviewSeverity;
  findingCodes: LocalDataMalformedBackupFinding["code"][];
}

export interface LocalDataMalformedBackupResult {
  marker: "PHASE2D17_MALFORMED_BACKUP_HARDENING_V1";
  safe: boolean;
  findings: LocalDataMalformedBackupFinding[];
}

export interface LocalDataImportRestoreReviewReportInput {
  validationResult: LocalDataBackupValidationPipelineResult;
  reviewModel: LocalDataImportRestoreReviewModel;
  confirmation: LocalDataImportRestoreConfirmationResult;
  importBlocker: LocalDataApplyBlockedResult;
  restoreBlocker: LocalDataApplyBlockedResult;
  generatedAt?: string;
}

export interface LocalDataImportRestoreReviewReport {
  marker: "PHASE2D18_IMPORT_RESTORE_REVIEW_FLOW_SAFE_REPORT_V1";
  status: LocalDataImportRestoreReviewModel["status"];
  severity: LocalDataReviewSeverity;
  generatedAt: string;
  counts: {
    protectedDocuments: number;
    blockers: number;
    manualReviewSections: number;
  };
  blockers: string[];
  manualReview: boolean;
  applyAllowed: false;
  restoreAllowed: false;
  nextSteps: string[];
  safeSummaries: {
    validation: LocalDataBackupValidationPipelineSummary;
    review: LocalDataImportRestoreReviewModelSummary;
    confirmation: LocalDataImportRestoreConfirmationSummary;
  };
  safe: true;
}
