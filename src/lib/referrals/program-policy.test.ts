import { describe, expect, it } from "vitest";
import {
  AFFILIATE_REWARD_MAX_EQUIVALENT_MONTHS,
  PARTNER_BETA_POLICY,
  REFERRAL_PROGRAM_POLICY_RUNTIME_STATUS,
  REFERRAL_PROGRAM_POLICY_VERSION,
  evaluateAffiliateRewardPolicy,
  evaluatePartnerCommissionPolicy,
  type AffiliateRewardPolicyInput,
  type PartnerCommissionPolicyInput,
} from "./program-policy";

function validAffiliateInput(): AffiliateRewardPolicyInput {
  return {
    attributionState: "confirmed",
    paymentState: "verified_paid",
    isSelfReferral: false,
    plan: "pro",
    billingInterval: "month",
    eligibleRevenueCents: 599,
    rewardedEquivalentMonths: 0,
  };
}

function validPartnerInput(): PartnerCommissionPolicyInput {
  return {
    attributionState: "confirmed",
    paymentState: "verified_paid",
    isSelfReferral: false,
    partnerStatus: "active",
    eligibleRevenueCents: 599,
    commissionBps: PARTNER_BETA_POLICY.commissionBps,
  };
}

describe("affiliate and partner commercial policy", () => {
  it("is versioned but remains disconnected from runtime", () => {
    expect(REFERRAL_PROGRAM_POLICY_VERSION).toBe(1);
    expect(REFERRAL_PROGRAM_POLICY_RUNTIME_STATUS).toBe("not_activated");
    expect(AFFILIATE_REWARD_MAX_EQUIVALENT_MONTHS).toBe(12);
    expect(PARTNER_BETA_POLICY).toMatchObject({
      commissionBps: 1000,
      payoutThresholdCents: 6000,
      automaticAccrualEnabled: false,
      automaticPayoutEnabled: false,
    });
  });

  it("fails closed when identity, attribution or payment is uncertain", () => {
    expect(
      evaluateAffiliateRewardPolicy({
        ...validAffiliateInput(),
        isSelfReferral: null,
      }),
    ).toEqual({
      status: "review_required",
      reason: "identity_not_confirmed",
    });
    expect(
      evaluateAffiliateRewardPolicy({
        ...validAffiliateInput(),
        attributionState: "disputed",
      }),
    ).toEqual({
      status: "review_required",
      reason: "disputed_attribution",
    });
    expect(
      evaluatePartnerCommissionPolicy({
        ...validPartnerInput(),
        paymentState: "unknown",
      }),
    ).toEqual({
      status: "review_required",
      reason: "payment_not_verified",
    });
  });

  it("blocks self referrals, missing attribution and reversed payments", () => {
    expect(
      evaluateAffiliateRewardPolicy({
        ...validAffiliateInput(),
        isSelfReferral: true,
      }),
    ).toEqual({ status: "ineligible", reason: "self_referral" });
    expect(
      evaluateAffiliateRewardPolicy({
        ...validAffiliateInput(),
        attributionState: "missing",
      }),
    ).toEqual({ status: "ineligible", reason: "missing_attribution" });
    expect(
      evaluatePartnerCommissionPolicy({
        ...validPartnerInput(),
        paymentState: "chargeback",
      }),
    ).toEqual({ status: "ineligible", reason: "refund_or_chargeback" });
  });

  it("grants five scans per user for each eligible paid month", () => {
    expect(evaluateAffiliateRewardPolicy(validAffiliateInput())).toEqual({
      status: "eligible",
      value: {
        scansPerUser: 5,
        equivalentMonths: 1,
        rewardWindowRemainingMonths: 11,
      },
    });
    expect(
      evaluateAffiliateRewardPolicy({
        ...validAffiliateInput(),
        rewardedEquivalentMonths: 12,
      }),
    ).toEqual({
      status: "ineligible",
      reason: "reward_window_exhausted",
    });
  });

  it("converts annual revenue into capped economic month equivalents", () => {
    expect(
      evaluateAffiliateRewardPolicy({
        ...validAffiliateInput(),
        billingInterval: "year",
        eligibleRevenueCents: 4900,
      }),
    ).toEqual({
      status: "eligible",
      value: {
        scansPerUser: 40,
        equivalentMonths: 8,
        rewardWindowRemainingMonths: 4,
      },
    });
    expect(
      evaluateAffiliateRewardPolicy({
        ...validAffiliateInput(),
        plan: "pro_plus",
        billingInterval: "year",
        eligibleRevenueCents: 14900,
      }),
    ).toEqual({
      status: "eligible",
      value: {
        scansPerUser: 50,
        equivalentMonths: 10,
        rewardWindowRemainingMonths: 2,
      },
    });
    expect(
      evaluateAffiliateRewardPolicy({
        ...validAffiliateInput(),
        plan: "pro_plus",
        billingInterval: "year",
        eligibleRevenueCents: 14900,
        rewardedEquivalentMonths: 9,
      }),
    ).toEqual({
      status: "eligible",
      value: {
        scansPerUser: 15,
        equivalentMonths: 3,
        rewardWindowRemainingMonths: 0,
      },
    });
  });

  it("keeps Partner beta at ten percent with manual accrual and payout", () => {
    expect(evaluatePartnerCommissionPolicy(validPartnerInput())).toEqual({
      status: "eligible",
      value: {
        commissionBps: 1000,
        commissionCents: 59,
        payoutThresholdCents: 6000,
        automaticAccrualEnabled: false,
        automaticPayoutEnabled: false,
      },
    });
    expect(
      evaluatePartnerCommissionPolicy({
        ...validPartnerInput(),
        partnerStatus: "paused",
      }),
    ).toEqual({ status: "ineligible", reason: "partner_not_active" });
    expect(
      evaluatePartnerCommissionPolicy({
        ...validPartnerInput(),
        commissionBps: 2000,
      }),
    ).toEqual({
      status: "review_required",
      reason: "invalid_commercial_input",
    });
  });

  it("does not turn invalid or absent amounts into zero-value decisions", () => {
    expect(
      evaluateAffiliateRewardPolicy({
        ...validAffiliateInput(),
        eligibleRevenueCents: null,
      }),
    ).toEqual({
      status: "review_required",
      reason: "invalid_commercial_input",
    });
    expect(
      evaluatePartnerCommissionPolicy({
        ...validPartnerInput(),
        eligibleRevenueCents: 1.5,
      }),
    ).toEqual({
      status: "review_required",
      reason: "invalid_commercial_input",
    });
    expect(
      evaluatePartnerCommissionPolicy({
        ...validPartnerInput(),
        eligibleRevenueCents: 0,
      }),
    ).toEqual({ status: "ineligible", reason: "no_eligible_revenue" });
    expect(
      evaluatePartnerCommissionPolicy({
        ...validPartnerInput(),
        eligibleRevenueCents: 1,
      }),
    ).toEqual({ status: "ineligible", reason: "no_commission" });
  });
});
