import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL,
  DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW,
  evaluatePrivateStagingEnvironmentContract,
} from "./private-staging-environment";
import {
  evaluatePrivateStagingObservabilityReadiness,
} from "./private-staging-observability";
import {
  evaluateDocumentSyncPrivateStagingReadiness,
  summarizeDocumentSyncPrivateStagingReadiness,
  type PrivateStagingHumanApprovalChecklist,
  type PrivateStagingReadinessInput,
} from "./private-staging-readiness";
import {
  evaluatePrivateStagingSecretBoundary,
} from "./private-staging-secret-boundary";

const approvalsFalse: PrivateStagingHumanApprovalChecklist = {
  securityReviewApproved: false,
  legalReviewApproved: false,
  dataProtectionReviewApproved: false,
  stagingEnvironmentApproved: false,
  rollbackPlanApproved: false,
  observabilityApproved: false,
  noRealDataConfirmed: false,
  noProductionConfirmed: false,
  routeStillDisabledByDefaultConfirmed: false,
  ownerApproval: false,
};

const approvalsTrue: PrivateStagingHumanApprovalChecklist = {
  securityReviewApproved: true,
  legalReviewApproved: true,
  dataProtectionReviewApproved: true,
  stagingEnvironmentApproved: true,
  rollbackPlanApproved: true,
  observabilityApproved: true,
  noRealDataConfirmed: true,
  noProductionConfirmed: true,
  routeStillDisabledByDefaultConfirmed: true,
  ownerApproval: true,
};

function baseInput(
  approvalChecklist: PrivateStagingHumanApprovalChecklist = approvalsFalse,
): PrivateStagingReadinessInput {
  return {
    routeShell: {
      disabledByDefault: true,
      publicEndpointOperative: false,
    },
    fakeExecution: {
      adapterDefault: true,
    },
    supabaseLocalHarness: {
      optInOnly: true,
      available: true,
    },
    remoteTargets: {
      production: false,
      supabaseRemote: false,
      stagingRemoteActive: false,
    },
    realData: {
      documentMutation: false,
      realInvoices: false,
    },
    environment: evaluatePrivateStagingEnvironmentContract({
      [DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY]:
        DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW,
      [DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY]:
        DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL,
    }),
    credentialBoundary: evaluatePrivateStagingSecretBoundary([
      {
        name: "DOCUMENT_SYNC_PRIVATE_STAGING_REVIEW_KEY",
        valueKind: "placeholder_only",
      },
    ]),
    observability: evaluatePrivateStagingObservabilityReadiness({
      recordsRequestMetadataOnly: true,
      recordsPayloadBody: false,
      recordsDocumentSnapshot: false,
      recordsPdfBytes: false,
      recordsXmlBytes: false,
      recordsTokenLikeValues: false,
      recordsCookies: false,
      recordsFullIpAddress: false,
      recordsFullHeaders: false,
      persistsOutsideMemory: false,
      redactionRulesDocumented: true,
      operatorDashboardOnly: true,
    }),
    approvalChecklist,
  };
}

describe("private staging readiness gate", () => {
  it("queda ready for human review sin aprobaciones", () => {
    const result = evaluateDocumentSyncPrivateStagingReadiness(baseInput());
    expect(result.status).toBe("ready_for_human_review");
    expect(result.authorized).toBe(false);
    expect(result.reviewItems).toContain("ownerApproval");
  });

  it("solo queda ready for manual authorization con todo aprobado", () => {
    const result = evaluateDocumentSyncPrivateStagingReadiness(
      baseInput(approvalsTrue),
    );
    expect(result.status).toBe("ready_for_manual_authorization");
    expect(result.authorized).toBe(true);
  });

  it("rechaza red lines de remoto, endpoint publico o datos reales", () => {
    const result = evaluateDocumentSyncPrivateStagingReadiness({
      ...baseInput(approvalsTrue),
      remoteTargets: {
        production: false,
        supabaseRemote: true,
        stagingRemoteActive: false,
      },
    });
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("red_line_rejected");
  });

  it("falta de Supabase local deja human review pero no autorizado", () => {
    const result = evaluateDocumentSyncPrivateStagingReadiness({
      ...baseInput(approvalsTrue),
      supabaseLocalHarness: {
        optInOnly: true,
        available: false,
      },
    });
    expect(result.status).toBe("ready_for_human_review");
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe("supabase_local_missing");
  });

  it("summary seguro conserva solo blockers y review items", () => {
    const summary = summarizeDocumentSyncPrivateStagingReadiness(
      evaluateDocumentSyncPrivateStagingReadiness(baseInput()),
    );
    const serialized = JSON.stringify(summary);
    expect(serialized).toContain("human_approval_required");
    expect(serialized).not.toContain("DOCUMENT_SYNC_PRIVATE_STAGING_REVIEW_KEY");
  });
});
