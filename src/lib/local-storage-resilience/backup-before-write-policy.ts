import { uniqueSorted } from "./types";

// PHASE2E6_BACKUP_BEFORE_WRITE_POLICY_V1

export interface BackupBeforeWritePolicyInput {
  hasCurrentDataManifest?: boolean;
  hasCurrentDataDigest?: boolean;
  hasRecoverySnapshot?: boolean;
  hasHumanConfirmation?: boolean;
  hasDryRunReport?: boolean;
}

export interface BackupBeforeWritePolicyResult {
  marker: "PHASE2E6_BACKUP_BEFORE_WRITE_POLICY_V1";
  ready: boolean;
  blocked: boolean;
  missingRequirements: string[];
  confirmations: {
    currentDataManifest: boolean;
    currentDataDigest: boolean;
    recoverySnapshot: boolean;
    humanConfirmation: boolean;
    dryRunReport: boolean;
  };
  writeAllowed: false;
  realStorageTouched: false;
  dataMutationAllowed: false;
  safe: true;
}

export function buildBackupBeforeWriteRequirements(): string[] {
  return [
    "current_data_manifest",
    "current_data_digest",
    "recovery_snapshot",
    "human_confirmation",
    "dry_run_report",
  ];
}

export function evaluateBackupBeforeWritePolicy(
  input: BackupBeforeWritePolicyInput = {},
): BackupBeforeWritePolicyResult {
  const confirmations = {
    currentDataManifest: input.hasCurrentDataManifest === true,
    currentDataDigest: input.hasCurrentDataDigest === true,
    recoverySnapshot: input.hasRecoverySnapshot === true,
    humanConfirmation: input.hasHumanConfirmation === true,
    dryRunReport: input.hasDryRunReport === true,
  };
  const missingRequirements = [
    confirmations.currentDataManifest ? "" : "current_data_manifest",
    confirmations.currentDataDigest ? "" : "current_data_digest",
    confirmations.recoverySnapshot ? "" : "recovery_snapshot",
    confirmations.humanConfirmation ? "" : "human_confirmation",
    confirmations.dryRunReport ? "" : "dry_run_report",
  ].filter(Boolean);

  return {
    marker: "PHASE2E6_BACKUP_BEFORE_WRITE_POLICY_V1",
    ready: missingRequirements.length === 0,
    blocked: true,
    missingRequirements: uniqueSorted(missingRequirements),
    confirmations,
    writeAllowed: false,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}

export function summarizeBackupBeforeWritePolicy(result: BackupBeforeWritePolicyResult) {
  return {
    marker: result.marker,
    ready: result.ready,
    blocked: result.blocked,
    missingRequirementCount: result.missingRequirements.length,
    writeAllowed: false,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}
