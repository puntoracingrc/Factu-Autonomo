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

/**
 * Builds a fail-closed rollback plan. Applying it without a new deployment is
 * only possible after wiring a proven runtime flag provider; this pure layer
 * does not pretend that provider already exists.
 */
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
    applicationStatus: "PLAN_ONLY",
    runtimeFlagProvider: "NOT_CONFIGURED",
    deployRequirement: "PROVIDER_DEPENDENT",
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
