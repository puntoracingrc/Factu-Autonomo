import type {
  FiscalFeatureFlagName,
  FiscalFeatureFlags,
  FiscalRollbackResult,
} from "./contracts";
import {
  DEFAULT_FISCAL_FEATURE_FLAGS,
  FISCAL_FEATURE_FLAG_NAMES,
} from "./contracts";
import { buildFiscalRuntimeState } from "./feature-flags";

/** Runtime kill switch: no migration, deploy or stored assessment rewrite. */
export function rollbackFiscalRuntime(input: {
  currentFlags: FiscalFeatureFlags;
  occurredAt: string;
  reasonCode: string;
}): FiscalRollbackResult {
  const disabledFlags = FISCAL_FEATURE_FLAG_NAMES.filter(
    (name): name is FiscalFeatureFlagName => input.currentFlags[name],
  );
  const runtime = buildFiscalRuntimeState({
    flags: DEFAULT_FISCAL_FEATURE_FLAGS,
    approval: {
      reviewStatus: "PENDING_FISCAL_REVIEW",
      resolutionStatus: "OPEN",
    },
  });
  if (
    runtime.fiscalMode !== "ORIENTATIVE" ||
    runtime.allModelsFallback !== "ENABLED"
  ) {
    throw new Error("FISCAL_ROLLBACK_RUNTIME_INVARIANT_BROKEN");
  }
  return Object.freeze({
    flags: DEFAULT_FISCAL_FEATURE_FLAGS,
    effectiveMode: runtime.fiscalMode,
    exclusionsEnabled: false,
    allModelsAvailable: true,
    auditEvent: Object.freeze({
      eventType: "FISCAL_FLAGS_ROLLBACK",
      occurredAt: input.occurredAt,
      reasonCode: input.reasonCode,
      disabledFlags: Object.freeze(disabledFlags),
      fallbackAllModels: "ENABLED",
      preservesAssessmentHistory: true,
      preservesApprovalAudit: true,
    }),
  });
}
