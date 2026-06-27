import type {
  DocumentSyncPrivateStagingEnvironmentEvaluation,
} from "./private-staging-environment";
import type {
  PrivateStagingObservabilityEvaluation,
} from "./private-staging-observability";
import type {
  PrivateStagingSecretBoundaryEvaluation,
} from "./private-staging-secret-boundary";

// PHASE2C57_PRIVATE_STAGING_READINESS_GATE_V1
// PHASE2C60_PRIVATE_STAGING_HUMAN_APPROVAL_CHECKLIST_V1
// PHASE2C66_PRIVATE_STAGING_READINESS_GATE_CHECKPOINT_V1
assertServerOnlyModule();

export type PrivateStagingReadinessStatus =
  | "blocked_by_default"
  | "ready_for_human_review"
  | "ready_for_manual_authorization"
  | "rejected";

export type PrivateStagingReadinessReason =
  | "red_line_rejected"
  | "missing_environment_contract"
  | "missing_credential_boundary"
  | "missing_observability_readiness"
  | "route_not_disabled_by_default"
  | "fake_adapter_not_default"
  | "supabase_local_not_opt_in"
  | "supabase_local_missing"
  | "human_approval_required"
  | "ready_for_manual_authorization";

export interface PrivateStagingHumanApprovalChecklist {
  securityReviewApproved: boolean;
  legalReviewApproved: boolean;
  dataProtectionReviewApproved: boolean;
  stagingEnvironmentApproved: boolean;
  rollbackPlanApproved: boolean;
  observabilityApproved: boolean;
  noRealDataConfirmed: boolean;
  noProductionConfirmed: boolean;
  routeStillDisabledByDefaultConfirmed: boolean;
  ownerApproval: boolean;
}

export interface PrivateStagingReadinessInput {
  routeShell: {
    disabledByDefault: boolean;
    publicEndpointOperative: boolean;
  };
  fakeExecution: {
    adapterDefault: boolean;
  };
  supabaseLocalHarness: {
    optInOnly: boolean;
    available: boolean;
  };
  remoteTargets: {
    production: boolean;
    supabaseRemote: boolean;
    stagingRemoteActive: boolean;
  };
  realData: {
    documentMutation: boolean;
    realInvoices: boolean;
  };
  environment: DocumentSyncPrivateStagingEnvironmentEvaluation;
  credentialBoundary: PrivateStagingSecretBoundaryEvaluation;
  observability: PrivateStagingObservabilityEvaluation;
  approvalChecklist: PrivateStagingHumanApprovalChecklist;
}

export interface PrivateStagingReadinessEvaluation {
  status: PrivateStagingReadinessStatus;
  reason: PrivateStagingReadinessReason;
  authorized: boolean;
  blockers: string[];
  reviewItems: string[];
}

export interface PrivateStagingReadinessSafeSummary {
  status: PrivateStagingReadinessStatus;
  reason: PrivateStagingReadinessReason;
  authorized: boolean;
  blockers: string[];
  reviewItems: string[];
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("Document sync private staging readiness gate is server-only.");
  }
}

function everyApprovalTrue(checklist: PrivateStagingHumanApprovalChecklist): boolean {
  return Object.values(checklist).every((value) => value === true);
}

function missingApprovalNames(
  checklist: PrivateStagingHumanApprovalChecklist,
): string[] {
  return Object.entries(checklist)
    .filter(([, value]) => value !== true)
    .map(([key]) => key)
    .sort();
}

export function buildDocumentSyncPrivateStagingBlockers(
  input: PrivateStagingReadinessInput,
): string[] {
  const blockers: string[] = [];

  if (
    input.remoteTargets.production ||
    input.remoteTargets.supabaseRemote ||
    input.remoteTargets.stagingRemoteActive ||
    input.routeShell.publicEndpointOperative ||
    input.realData.documentMutation ||
    input.realData.realInvoices
  ) {
    blockers.push("red_line_rejected");
  }
  if (input.environment.status === "rejected") {
    blockers.push("missing_environment_contract");
  }
  if (input.credentialBoundary.status === "rejected") {
    blockers.push("missing_credential_boundary");
  }
  if (input.observability.status === "rejected") {
    blockers.push("missing_observability_readiness");
  }
  if (!input.routeShell.disabledByDefault) {
    blockers.push("route_not_disabled_by_default");
  }
  if (!input.fakeExecution.adapterDefault) {
    blockers.push("fake_adapter_not_default");
  }
  if (!input.supabaseLocalHarness.optInOnly) {
    blockers.push("supabase_local_not_opt_in");
  }
  if (!input.supabaseLocalHarness.available) {
    blockers.push("supabase_local_missing");
  }

  return blockers;
}

export function evaluateDocumentSyncPrivateStagingReadiness(
  input: PrivateStagingReadinessInput,
): PrivateStagingReadinessEvaluation {
  const blockers = buildDocumentSyncPrivateStagingBlockers(input);
  const reviewItems = missingApprovalNames(input.approvalChecklist);

  if (blockers.includes("red_line_rejected")) {
    return {
      status: "rejected",
      reason: "red_line_rejected",
      authorized: false,
      blockers,
      reviewItems,
    };
  }

  const hardBlocker = blockers.find((blocker) => blocker !== "supabase_local_missing");
  if (hardBlocker) {
    return {
      status: "blocked_by_default",
      reason: hardBlocker as PrivateStagingReadinessReason,
      authorized: false,
      blockers,
      reviewItems,
    };
  }

  if (!everyApprovalTrue(input.approvalChecklist)) {
    return {
      status: "ready_for_human_review",
      reason: "human_approval_required",
      authorized: false,
      blockers,
      reviewItems,
    };
  }

  if (blockers.includes("supabase_local_missing")) {
    return {
      status: "ready_for_human_review",
      reason: "supabase_local_missing",
      authorized: false,
      blockers,
      reviewItems,
    };
  }

  return {
    status: "ready_for_manual_authorization",
    reason: "ready_for_manual_authorization",
    authorized: true,
    blockers,
    reviewItems,
  };
}

export function summarizeDocumentSyncPrivateStagingReadiness(
  evaluation: PrivateStagingReadinessEvaluation,
): PrivateStagingReadinessSafeSummary {
  return {
    status: evaluation.status,
    reason: evaluation.reason,
    authorized: evaluation.authorized,
    blockers: [...evaluation.blockers],
    reviewItems: [...evaluation.reviewItems],
  };
}
