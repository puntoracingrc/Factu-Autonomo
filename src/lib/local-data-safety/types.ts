// PHASE2D1_10_LOCAL_DATA_BACKUP_RESTORE_SAFETY_V1
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
  | "restore_snapshot_missing";

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
