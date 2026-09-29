import { describe, expect, it } from "vitest";

import {
  CENTRAL_AUTHORITY_PLAN_LOADING_ERROR,
  centralAuthorityPlanLoadingFailure,
  evaluateCentralAuthorityPlanGate,
} from "@/lib/central-authority/client-plan-gate";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("central authority plan gate", () => {
  it("keeps signed-out and free work local", () => {
    expect(
      evaluateCentralAuthorityPlanGate({
        resolvedUserId: null,
        cloudUserId: null,
        centralOwnerId: null,
        billingLoading: false,
        cloudSyncIncluded: false,
        centralBootstrapReady: true,
      }),
    ).toEqual({
      mode: "local",
      authenticatedUserId: null,
      centralUserId: null,
    });

    expect(
      evaluateCentralAuthorityPlanGate({
        resolvedUserId: USER_ID,
        cloudUserId: USER_ID,
        centralOwnerId: USER_ID,
        billingLoading: false,
        cloudSyncIncluded: false,
        centralBootstrapReady: true,
      }),
    ).toEqual({
      mode: "local",
      authenticatedUserId: USER_ID,
      centralUserId: null,
    });
  });

  it("selects central only after the authenticated cloud plan is resolved", () => {
    expect(
      evaluateCentralAuthorityPlanGate({
        resolvedUserId: USER_ID,
        cloudUserId: USER_ID,
        centralOwnerId: USER_ID,
        billingLoading: false,
        cloudSyncIncluded: true,
        centralBootstrapReady: true,
      }),
    ).toEqual({
      mode: "central",
      authenticatedUserId: USER_ID,
      centralUserId: USER_ID,
    });
  });

  it("blocks the authentication and billing race instead of saving locally", () => {
    expect(
      evaluateCentralAuthorityPlanGate({
        resolvedUserId: USER_ID,
        cloudUserId: null,
        centralOwnerId: USER_ID,
        billingLoading: false,
        cloudSyncIncluded: false,
        centralBootstrapReady: true,
      }).mode,
    ).toBe("loading");
    expect(
      evaluateCentralAuthorityPlanGate({
        resolvedUserId: USER_ID,
        cloudUserId: USER_ID,
        centralOwnerId: USER_ID,
        billingLoading: true,
        cloudSyncIncluded: true,
        centralBootstrapReady: true,
      }).mode,
    ).toBe("loading");
    expect(
      evaluateCentralAuthorityPlanGate({
        resolvedUserId: USER_ID,
        cloudUserId: USER_ID,
        centralOwnerId: USER_ID,
        billingLoading: false,
        cloudSyncIncluded: true,
        centralBootstrapReady: false,
      }).mode,
    ).toBe("loading");
    expect(centralAuthorityPlanLoadingFailure()).toEqual({
      ok: false,
      error: CENTRAL_AUTHORITY_PLAN_LOADING_ERROR,
    });
  });

  it("keeps authentication on the Google account and writes into the selected company tenant", () => {
    const companyOwnerId = "22222222-2222-4222-8222-222222222222";

    expect(
      evaluateCentralAuthorityPlanGate({
        resolvedUserId: USER_ID,
        cloudUserId: USER_ID,
        centralOwnerId: companyOwnerId,
        billingLoading: false,
        cloudSyncIncluded: true,
        centralBootstrapReady: true,
      }),
    ).toEqual({
      mode: "central",
      authenticatedUserId: USER_ID,
      centralUserId: companyOwnerId,
    });
  });
});
