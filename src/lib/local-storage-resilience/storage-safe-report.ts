import type { BackupBeforeWritePolicyResult } from "./backup-before-write-policy";
import type { StorageCorruptionRecoveryPlan } from "./storage-corruption-recovery";
import type { LocalStorageResilienceOperationPlan } from "./storage-operation-dry-run";
import type { LocalStorageResilienceSafeSummary } from "./types";
import { uniqueSorted } from "./types";

// PHASE2E8_STORAGE_RESILIENCE_SAFE_REPORT_V1

export interface LocalStorageResilienceSafeReport {
  marker: "PHASE2E8_STORAGE_RESILIENCE_SAFE_REPORT_V1";
  adapterStatus: string;
  plannedOperations: Array<{
    operation: string;
    decision: string;
    blockerCount: number;
  }>;
  blockers: string[];
  backupBeforeWriteReady: boolean;
  corruptionRecoveryDecision: string;
  safeNextSteps: string[];
  containsPayload: false;
  realStorageTouched: false;
  dataMutationAllowed: false;
  safe: true;
}

export function buildLocalStorageResilienceSafeReport(input: {
  adapterSummary: LocalStorageResilienceSafeSummary;
  operationPlans?: LocalStorageResilienceOperationPlan[];
  backupPolicy?: BackupBeforeWritePolicyResult;
  recoveryPlan?: StorageCorruptionRecoveryPlan;
}): LocalStorageResilienceSafeReport {
  const operationPlans = input.operationPlans ?? [];
  const blockers = uniqueSorted([
    ...input.adapterSummary.blockers,
    ...operationPlans.flatMap((plan) => plan.blockers),
    ...(input.backupPolicy?.missingRequirements ?? []),
    ...(input.recoveryPlan?.blockers ?? []),
  ]);

  return {
    marker: "PHASE2E8_STORAGE_RESILIENCE_SAFE_REPORT_V1",
    adapterStatus: input.adapterSummary.status,
    plannedOperations: operationPlans.map((plan) => ({
      operation: plan.operation,
      decision: plan.decision,
      blockerCount: plan.blockers.length,
    })),
    blockers,
    backupBeforeWriteReady: input.backupPolicy?.ready === true,
    corruptionRecoveryDecision: input.recoveryPlan?.decision ?? "not_evaluated",
    safeNextSteps: [
      "keep_real_storage_disabled",
      "complete_storage_adapter_review",
      "require_backup_before_write_policy",
      "keep_apply_disabled_until_owner_decision",
    ],
    containsPayload: false,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}

export function redactLocalStorageResilienceSafeReport(report: LocalStorageResilienceSafeReport): LocalStorageResilienceSafeReport {
  return {
    ...report,
    plannedOperations: report.plannedOperations.map((operation) => ({ ...operation })),
    blockers: uniqueSorted(report.blockers),
    containsPayload: false,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}

export function assertLocalStorageResilienceSafeReportSafe(report: LocalStorageResilienceSafeReport): true {
  if (!report.safe || report.containsPayload || report.realStorageTouched || report.dataMutationAllowed) {
    throw new Error("PHASE2E8_STORAGE_RESILIENCE_SAFE_REPORT_V1_UNSAFE_REPORT");
  }
  return true;
}
