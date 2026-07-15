import type { AuthorizeRuleExclusionInput } from "@/lib/tax-obligations/rule-exclusion-authorization";
import {
  authorizeRuleExclusion,
  type ExclusionAuthorizationResult,
} from "@/lib/tax-obligations/rule-exclusion-authorization";

import type {
  FiscalFeatureFlagName,
  FiscalFeatureFlags,
  FiscalRuntimeApprovalState,
  FiscalRuntimeState,
} from "./contracts";
import {
  DEFAULT_FISCAL_FEATURE_FLAGS,
  FISCAL_FEATURE_FLAG_NAMES,
} from "./contracts";

export type FiscalFeatureFlagSource = Partial<
  Record<FiscalFeatureFlagName, boolean | "true" | "false" | undefined>
>;

function enabled(value: boolean | "true" | "false" | undefined): boolean {
  return value === true || value === "true";
}

/** Exactly four runtime flags; absent values fail to false in every environment. */
export function resolveFiscalFeatureFlags(
  source: FiscalFeatureFlagSource = {},
): FiscalFeatureFlags {
  return Object.freeze(
    Object.fromEntries(
      FISCAL_FEATURE_FLAG_NAMES.map((name) => [name, enabled(source[name])]),
    ) as unknown as Record<FiscalFeatureFlagName, boolean>,
  );
}

export interface FlaggedFiscalExclusionAuthorization {
  authorized: boolean;
  blockingReasons: readonly string[];
  individualAuthorization: ExclusionAuthorizationResult | null;
}

/**
 * Runtime flags are only outer kill switches. Enabling them still delegates
 * every candidate to the canonical individual authorization gate.
 */
export function authorizeFlaggedFiscalExclusion(input: {
  flags: FiscalFeatureFlags;
  authorizationInput: AuthorizeRuleExclusionInput;
}): FlaggedFiscalExclusionAuthorization {
  const flagBlocks: string[] = [];
  if (!input.flags.fiscal_rules_approved_results) {
    flagBlocks.push("FISCAL_APPROVED_RESULTS_FLAG_DISABLED");
  }
  if (!input.flags.fiscal_rules_exclusions) {
    flagBlocks.push("FISCAL_EXCLUSIONS_FLAG_DISABLED");
  }
  if (flagBlocks.length > 0) {
    return Object.freeze({
      authorized: false,
      blockingReasons: Object.freeze(flagBlocks),
      individualAuthorization: null,
    });
  }
  const individualAuthorization = authorizeRuleExclusion(
    input.authorizationInput,
  );
  return Object.freeze({
    authorized: individualAuthorization.authorized,
    blockingReasons: individualAuthorization.blockingReasons,
    individualAuthorization,
  });
}

export function fiscalFlagsAreDefaultOff(flags: FiscalFeatureFlags): boolean {
  return FISCAL_FEATURE_FLAG_NAMES.every(
    (name) => flags[name] === DEFAULT_FISCAL_FEATURE_FLAGS[name],
  );
}

/** Central runtime projection consumed by release reporting and adapters. */
export function buildFiscalRuntimeState(input: {
  flags?: FiscalFeatureFlags;
  approval: FiscalRuntimeApprovalState;
}): FiscalRuntimeState {
  const flags = input.flags ?? DEFAULT_FISCAL_FEATURE_FLAGS;
  const approved =
    input.approval.reviewStatus === "APPROVED" &&
    input.approval.resolutionStatus === "RESOLVED";
  const approvedResults = flags.fiscal_rules_approved_results && approved;
  return Object.freeze({
    flags,
    fiscalMode: approvedResults ? "APPROVED_RESULTS" : "ORIENTATIVE",
    allModelsFallback: "ENABLED",
    shadowMode: flags.fiscal_rules_shadow_mode
      ? "ENABLED_NON_MUTATING"
      : "DISABLED",
    exclusions:
      approvedResults && flags.fiscal_rules_exclusions
        ? "INDIVIDUAL_AUTHORIZATION_REQUIRED"
        : "BLOCKED",
    documentAutoConfirmation: flags.document_auto_confirmation
      ? "INDIVIDUAL_GUARDS_REQUIRED"
      : "BLOCKED",
  });
}
