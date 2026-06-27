import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL,
  DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW,
  evaluatePrivateStagingEnvironmentContract,
} from "../src/lib/document-sync-integrity/private-staging-environment";
import {
  evaluatePrivateStagingObservabilityReadiness,
} from "../src/lib/document-sync-integrity/private-staging-observability";
import {
  evaluateDocumentSyncPrivateStagingReadiness,
  type PrivateStagingHumanApprovalChecklist,
} from "../src/lib/document-sync-integrity/private-staging-readiness";
import {
  evaluatePrivateStagingSecretBoundary,
} from "../src/lib/document-sync-integrity/private-staging-secret-boundary";
import {
  evaluateDocumentSyncRouteShellFlag,
} from "../src/lib/document-sync-integrity/route-shell-flag";
import {
  createDocumentSyncSupabaseLocalHandlerHarness,
  DocumentSyncSupabaseLocalHandlerHarnessError,
} from "../src/lib/document-sync-integrity/route-supabase-local-harness";

// PHASE2C63_SYNC_ROUTE_REMOTE_STAGING_BLOCKER_TESTS_V1

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

function privateEnv() {
  return {
    [DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY]: "true",
    [DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY]:
      DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW,
    [DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY]:
      DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL,
  };
}

function safeReadinessInput(
  approvalChecklist: PrivateStagingHumanApprovalChecklist = approvalsFalse,
) {
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
    environment: evaluatePrivateStagingEnvironmentContract(privateEnv()),
    credentialBoundary: evaluatePrivateStagingSecretBoundary([
      {
        name: "DOCUMENT_SYNC_PRIVATE_STAGING_REVIEW_KEY",
        valueKind: "placeholder_only" as const,
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

describe("Phase 2C.63 remote/staging blocker tests", () => {
  it("route shell sigue disabled por defecto", () => {
    const result = evaluateDocumentSyncRouteShellFlag({});
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("missing_enabled_flag");
  });

  it("bloquea produccion y Vercel preview antes de cualquier operacion", () => {
    const production = evaluatePrivateStagingEnvironmentContract({
      NODE_ENV: "production",
      ...privateEnv(),
    });
    const preview = evaluatePrivateStagingEnvironmentContract({
      VERCEL_ENV: "preview",
      ...privateEnv(),
    });

    expect(production.status).toBe("rejected");
    expect(preview.status).toBe("rejected");
  });

  it("bloquea variables publicas para private staging", () => {
    const result = evaluatePrivateStagingEnvironmentContract({
      NEXT_PUBLIC_DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED: "true",
      ...privateEnv(),
    });
    expect(result.reason).toBe("public_variable_rejected");
  });

  it("bloquea metadata de harness no local", () => {
    const nonLocalUrl = ["https", "://staging.example.invalid"].join("");
    expect(() =>
      createDocumentSyncSupabaseLocalHandlerHarness({
        serverScope: {
          userId: "SYNTHETIC_ONLY_PHASE2C63_USER",
          scopeId: "SYNTHETIC_ONLY_PHASE2C63_SCOPE",
        },
        metadata: {
          databaseUrl: nonLocalUrl,
        },
      }),
    ).toThrow(DocumentSyncSupabaseLocalHandlerHarnessError);
  });

  it("sin checklist aprobada queda review, no autorizado", () => {
    const result = evaluateDocumentSyncPrivateStagingReadiness(
      safeReadinessInput(),
    );
    expect(result.status).toBe("ready_for_human_review");
    expect(result.authorized).toBe(false);
  });

  it("Supabase remoto o staging remoto activo queda rejected", () => {
    const supabaseRemote = evaluateDocumentSyncPrivateStagingReadiness({
      ...safeReadinessInput(),
      remoteTargets: {
        production: false,
        supabaseRemote: true,
        stagingRemoteActive: false,
      },
    });
    const stagingRemote = evaluateDocumentSyncPrivateStagingReadiness({
      ...safeReadinessInput(),
      remoteTargets: {
        production: false,
        supabaseRemote: false,
        stagingRemoteActive: true,
      },
    });

    expect(supabaseRemote.status).toBe("rejected");
    expect(stagingRemote.status).toBe("rejected");
  });
});
