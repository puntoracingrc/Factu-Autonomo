import type { LocalStorageResilienceDecision, LocalStorageResilienceOperation, LocalStorageResilienceSafeMode } from "./types";
import { isSyntheticStorageKey, uniqueSorted } from "./types";

// PHASE2E5_STORAGE_OPERATION_DRY_RUN_PLANNER_V1

export interface LocalStorageResilienceOperationPlan {
  marker: "PHASE2E5_STORAGE_OPERATION_DRY_RUN_PLANNER_V1";
  operation: LocalStorageResilienceOperation;
  mode: LocalStorageResilienceSafeMode;
  decision: LocalStorageResilienceDecision;
  blockers: string[];
  requirements: string[];
  backupBeforeWriteRequired: boolean;
  applyAllowed: false;
  realStorageTouched: false;
  dataMutationAllowed: false;
  safe: true;
}

export function planLocalStorageResilienceOperation(input: {
  operation: LocalStorageResilienceOperation;
  mode?: LocalStorageResilienceSafeMode;
  key?: string;
  backupBeforeWriteAvailable?: boolean;
}): LocalStorageResilienceOperationPlan {
  const mode = input.mode ?? "disabled";
  const blockers: string[] = [];
  const requirements: string[] = [];
  const backupBeforeWriteRequired = isWriteLike(input.operation);
  let decision: LocalStorageResilienceDecision = "blocked";

  if (mode === "disabled") blockers.push("STORAGE_ADAPTER_DISABLED_PENDING_UI_AND_DATA_REVIEW");
  if (input.key && !isSyntheticStorageKey(input.key)) blockers.push("NON_SYNTHETIC_KEY_REJECTED");

  if (backupBeforeWriteRequired) {
    requirements.push("backup_before_write_manifest", "backup_before_write_digest", "recovery_snapshot", "human_confirmation", "dry_run_report");
    if (!input.backupBeforeWriteAvailable) blockers.push("BACKUP_BEFORE_WRITE_REQUIRED");
  }

  if (input.operation === "read" && mode === "in_memory" && (!input.key || isSyntheticStorageKey(input.key))) {
    decision = blockers.length ? "blocked" : "allowed_in_memory";
  } else if (input.operation === "backup_before_write" || input.operation === "verify_after_write") {
    decision = blockers.length ? "blocked" : "planned_only";
  } else if (backupBeforeWriteRequired) {
    decision = "blocked";
    blockers.push("WRITE_DELETE_REPLACE_BLOCKED_BY_DEFAULT");
  }

  return {
    marker: "PHASE2E5_STORAGE_OPERATION_DRY_RUN_PLANNER_V1",
    operation: input.operation,
    mode,
    decision,
    blockers: uniqueSorted(blockers),
    requirements: uniqueSorted(requirements),
    backupBeforeWriteRequired,
    applyAllowed: false,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}

function isWriteLike(operation: LocalStorageResilienceOperation): boolean {
  return operation === "write" || operation === "delete" || operation === "replace_app_data";
}

export function summarizeLocalStorageResilienceOperationPlan(plan: LocalStorageResilienceOperationPlan) {
  return {
    marker: plan.marker,
    operation: plan.operation,
    decision: plan.decision,
    blockerCount: plan.blockers.length,
    backupBeforeWriteRequired: plan.backupBeforeWriteRequired,
    applyAllowed: false,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}
