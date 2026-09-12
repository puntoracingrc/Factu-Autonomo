import { uniqueSorted } from "./types";

// PHASE2E7_CORRUPTION_PARSE_RECOVERY_CLASSIFIER_V1

export type StorageCorruptionRecoveryCase =
  | "invalid_json"
  | "wrong_shape"
  | "partial_app_data"
  | "backup_manifest_only"
  | "prototype_pollution"
  | "missing_critical_arrays"
  | "legacy_shape";

export type StorageCorruptionRecoveryDecision =
  | "recoverable_preview_only"
  | "manual_review_required"
  | "blocked_corrupted"
  | "unsupported_shape";

export interface StoredAppDataParseClassification {
  marker: "PHASE2E7_CORRUPTION_PARSE_RECOVERY_CLASSIFIER_V1";
  case: StorageCorruptionRecoveryCase;
  decision: StorageCorruptionRecoveryDecision;
  blockers: string[];
  parsed: boolean;
  applyAllowed: false;
  safe: true;
}

export interface StorageCorruptionRecoveryPlan {
  marker: "PHASE2E7_CORRUPTION_PARSE_RECOVERY_CLASSIFIER_V1";
  decision: StorageCorruptionRecoveryDecision;
  steps: string[];
  blockers: string[];
  applyAllowed: false;
  realStorageTouched: false;
  dataMutationAllowed: false;
  safe: true;
}

export function classifyStoredAppDataParseResult(input: { raw?: string; value?: unknown }): StoredAppDataParseClassification {
  let value = input.value;
  let parsed = value !== undefined;

  if (!parsed) {
    try {
      value = JSON.parse(input.raw ?? "");
      parsed = true;
    } catch {
      return classification("invalid_json", "blocked_corrupted", ["INVALID_JSON"], false);
    }
  }

  if (hasPrototypePollutionShape(value)) {
    return classification("prototype_pollution", "blocked_corrupted", ["SUSPICIOUS_OBJECT_KEYS"], parsed);
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return classification("wrong_shape", "unsupported_shape", ["APP_DATA_OBJECT_REQUIRED"], parsed);
  }

  const record = value as Record<string, unknown>;
  if (record.marker === "BACKUP_MANIFEST" || (typeof record.manifestVersion === "string" && !("documents" in record))) {
    return classification("backup_manifest_only", "manual_review_required", ["BACKUP_MANIFEST_WITHOUT_APP_DATA"], parsed);
  }

  if (Array.isArray(record.invoices) || Array.isArray(record.clients)) {
    return classification("legacy_shape", "manual_review_required", ["LEGACY_SHAPE_REQUIRES_REVIEW"], parsed);
  }

  if (!Array.isArray(record.documents) || !Array.isArray(record.customers)) {
    return classification("missing_critical_arrays", "blocked_corrupted", ["MISSING_CRITICAL_ARRAYS"], parsed);
  }

  if (!Array.isArray(record.products) || !Array.isArray(record.settings)) {
    return classification("partial_app_data", "recoverable_preview_only", ["PARTIAL_APP_DATA_PREVIEW_ONLY"], parsed);
  }

  return classification("partial_app_data", "recoverable_preview_only", ["FULL_APP_DATA_STILL_PREVIEW_ONLY"], parsed);
}

function classification(
  recoveryCase: StorageCorruptionRecoveryCase,
  decision: StorageCorruptionRecoveryDecision,
  blockers: string[],
  parsed: boolean,
): StoredAppDataParseClassification {
  return {
    marker: "PHASE2E7_CORRUPTION_PARSE_RECOVERY_CLASSIFIER_V1",
    case: recoveryCase,
    decision,
    blockers: uniqueSorted(blockers),
    parsed,
    applyAllowed: false,
    safe: true,
  };
}

function hasPrototypePollutionShape(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.some((key) => key === "__proto__" || key === "prototype" || key === "constructor")) return true;
  return Object.values(value as Record<string, unknown>).some(hasPrototypePollutionShape);
}

export function buildStorageCorruptionRecoveryPlan(
  classificationResult: StoredAppDataParseClassification,
): StorageCorruptionRecoveryPlan {
  const stepsByDecision: Record<StorageCorruptionRecoveryDecision, string[]> = {
    recoverable_preview_only: ["build_redacted_preview", "require_backup_before_any_future_write", "wait_for_owner_decision"],
    manual_review_required: ["prepare_safe_summary", "request_manual_review", "keep_apply_disabled"],
    blocked_corrupted: ["block_operation", "preserve_current_data", "record_safe_audit_event"],
    unsupported_shape: ["block_operation", "document_unsupported_shape", "avoid_auto_migration"],
  };

  return {
    marker: "PHASE2E7_CORRUPTION_PARSE_RECOVERY_CLASSIFIER_V1",
    decision: classificationResult.decision,
    steps: stepsByDecision[classificationResult.decision],
    blockers: classificationResult.blockers,
    applyAllowed: false,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}

export function summarizeStorageCorruptionRecoveryPlan(plan: StorageCorruptionRecoveryPlan) {
  return {
    marker: plan.marker,
    decision: plan.decision,
    blockerCount: plan.blockers.length,
    stepCount: plan.steps.length,
    applyAllowed: false,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}
