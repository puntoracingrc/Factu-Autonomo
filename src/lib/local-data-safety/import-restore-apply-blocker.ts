import { nowIso } from "./helpers";
import type { LocalDataApplyBlockedResult } from "./types";

// PHASE2D15_IMPORT_RESTORE_APPLY_BLOCKER_V1

export function buildLocalDataApplyBlockedResult(
  operation: LocalDataApplyBlockedResult["operation"],
  generatedAt = nowIso(),
): LocalDataApplyBlockedResult {
  return {
    marker: "PHASE2D15_IMPORT_RESTORE_APPLY_BLOCKER_V1",
    blocked: true,
    operation,
    reason: "APPLY_DISABLED_PENDING_UI_AND_EXTERNAL_REVIEW",
    generatedAt,
    safe: true,
  };
}

export function assertLocalDataImportApplyBlocked(generatedAt = nowIso()): LocalDataApplyBlockedResult {
  return buildLocalDataApplyBlockedResult("import", generatedAt);
}

export function assertLocalDataRestoreApplyBlocked(generatedAt = nowIso()): LocalDataApplyBlockedResult {
  return buildLocalDataApplyBlockedResult("restore", generatedAt);
}
