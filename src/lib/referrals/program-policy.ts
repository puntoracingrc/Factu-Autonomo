import { PLANS, type PaidPlanId } from "@/lib/billing/plans";
import { REFERRAL_BONUS_SCANS } from "@/lib/billing/referral-codes";
import {
  PARTNER_COMMISSION_BPS,
  PARTNER_PAYOUT_THRESHOLD_CENTS,
  calculatePartnerCommissionCents,
} from "@/lib/partners/contracts";

export const REFERRAL_PROGRAM_POLICY_VERSION = 1;
export const REFERRAL_PROGRAM_POLICY_RUNTIME_STATUS = "not_activated" as const;
export const AFFILIATE_REWARD_MAX_EQUIVALENT_MONTHS = 12;

export type CommercialAttributionState =
  | "confirmed"
  | "missing"
  | "disputed";
export type CommercialPaymentState =
  | "verified_paid"
  | "refunded"
  | "chargeback"
  | "unknown";
export type CommercialBillingInterval = "month" | "year";

export type CommercialPolicyIneligibleReason =
  | "self_referral"
  | "missing_attribution"
  | "refund_or_chargeback"
  | "reward_window_exhausted"
  | "partner_not_active"
  | "no_eligible_revenue"
  | "no_commission";

export type CommercialPolicyReviewReason =
  | "identity_not_confirmed"
  | "disputed_attribution"
  | "payment_not_verified"
  | "invalid_commercial_input";

export type CommercialPolicyDecision<T> =
  | { status: "eligible"; value: T }
  | { status: "ineligible"; reason: CommercialPolicyIneligibleReason }
  | { status: "review_required"; reason: CommercialPolicyReviewReason };

interface CommercialGateInput {
  attributionState: CommercialAttributionState;
  paymentState: CommercialPaymentState;
  isSelfReferral: boolean | null;
}

export interface AffiliateRewardPolicyInput extends CommercialGateInput {
  plan: PaidPlanId | null;
  billingInterval: CommercialBillingInterval | null;
  /** Importe cobrado elegible, sin IVA y despues de descuentos. */
  eligibleRevenueCents: number | null;
  rewardedEquivalentMonths: number | null;
}

export interface AffiliateRewardPolicyValue {
  scansPerUser: number;
  equivalentMonths: number;
  rewardWindowRemainingMonths: number;
}

export interface PartnerCommissionPolicyInput extends CommercialGateInput {
  partnerStatus: "active" | "paused" | null;
  /** Importe cobrado elegible, sin IVA y despues de descuentos. */
  eligibleRevenueCents: number | null;
  commissionBps: number | null;
}

export interface PartnerCommissionPolicyValue {
  commissionBps: number;
  commissionCents: number;
  payoutThresholdCents: number;
  automaticAccrualEnabled: false;
  automaticPayoutEnabled: false;
}

export const PARTNER_BETA_POLICY = {
  commissionBps: PARTNER_COMMISSION_BPS,
  payoutThresholdCents: PARTNER_PAYOUT_THRESHOLD_CENTS,
  automaticAccrualEnabled: false,
  automaticPayoutEnabled: false,
} as const;

function evaluateCommercialGate(
  input: CommercialGateInput,
): Exclude<CommercialPolicyDecision<never>, { status: "eligible" }> | null {
  if (input.isSelfReferral === null) {
    return { status: "review_required", reason: "identity_not_confirmed" };
  }
  if (input.isSelfReferral) {
    return { status: "ineligible", reason: "self_referral" };
  }
  if (input.attributionState === "disputed") {
    return { status: "review_required", reason: "disputed_attribution" };
  }
  if (input.attributionState === "missing") {
    return { status: "ineligible", reason: "missing_attribution" };
  }
  if (input.paymentState === "unknown") {
    return { status: "review_required", reason: "payment_not_verified" };
  }
  if (
    input.paymentState === "refunded" ||
    input.paymentState === "chargeback"
  ) {
    return { status: "ineligible", reason: "refund_or_chargeback" };
  }
  return null;
}

function isSafeNonNegativeInteger(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value >= 0;
}

function planMonthlyPriceCents(plan: PaidPlanId): number | null {
  const price = PLANS[plan].priceMonthlyEur;
  if (price === null) return null;
  const cents = Math.round(price * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function paidEquivalentMonths(input: {
  plan: PaidPlanId;
  billingInterval: CommercialBillingInterval;
  eligibleRevenueCents: number;
}): number | null {
  if (input.billingInterval === "month") return 1;
  const monthlyPriceCents = planMonthlyPriceCents(input.plan);
  if (monthlyPriceCents === null) return null;
  return Math.max(
    1,
    Math.min(
      AFFILIATE_REWARD_MAX_EQUIVALENT_MONTHS,
      Math.round(input.eligibleRevenueCents / monthlyPriceCents),
    ),
  );
}

export function evaluateAffiliateRewardPolicy(
  input: AffiliateRewardPolicyInput,
): CommercialPolicyDecision<AffiliateRewardPolicyValue> {
  const gate = evaluateCommercialGate(input);
  if (gate) return gate;
  if (
    input.plan === null ||
    input.billingInterval === null ||
    !isSafeNonNegativeInteger(input.eligibleRevenueCents) ||
    !isSafeNonNegativeInteger(input.rewardedEquivalentMonths) ||
    input.rewardedEquivalentMonths > AFFILIATE_REWARD_MAX_EQUIVALENT_MONTHS
  ) {
    return { status: "review_required", reason: "invalid_commercial_input" };
  }
  if (input.eligibleRevenueCents === 0) {
    return { status: "ineligible", reason: "no_eligible_revenue" };
  }
  if (
    input.rewardedEquivalentMonths ===
    AFFILIATE_REWARD_MAX_EQUIVALENT_MONTHS
  ) {
    return { status: "ineligible", reason: "reward_window_exhausted" };
  }

  const candidateMonths = paidEquivalentMonths({
    plan: input.plan,
    billingInterval: input.billingInterval,
    eligibleRevenueCents: input.eligibleRevenueCents,
  });
  if (candidateMonths === null) {
    return { status: "review_required", reason: "invalid_commercial_input" };
  }
  const remainingMonths =
    AFFILIATE_REWARD_MAX_EQUIVALENT_MONTHS -
    input.rewardedEquivalentMonths;
  const equivalentMonths = Math.min(candidateMonths, remainingMonths);

  return {
    status: "eligible",
    value: {
      scansPerUser: equivalentMonths * REFERRAL_BONUS_SCANS,
      equivalentMonths,
      rewardWindowRemainingMonths: remainingMonths - equivalentMonths,
    },
  };
}

export function evaluatePartnerCommissionPolicy(
  input: PartnerCommissionPolicyInput,
): CommercialPolicyDecision<PartnerCommissionPolicyValue> {
  const gate = evaluateCommercialGate(input);
  if (gate) return gate;
  if (input.partnerStatus === null) {
    return { status: "review_required", reason: "identity_not_confirmed" };
  }
  if (input.partnerStatus !== "active") {
    return { status: "ineligible", reason: "partner_not_active" };
  }
  if (
    !isSafeNonNegativeInteger(input.eligibleRevenueCents) ||
    !isSafeNonNegativeInteger(input.commissionBps) ||
    input.commissionBps !== PARTNER_BETA_POLICY.commissionBps
  ) {
    return { status: "review_required", reason: "invalid_commercial_input" };
  }
  if (input.eligibleRevenueCents === 0) {
    return { status: "ineligible", reason: "no_eligible_revenue" };
  }

  const commissionCents = calculatePartnerCommissionCents(
    input.eligibleRevenueCents,
    input.commissionBps,
  );
  if (commissionCents === 0) {
    return { status: "ineligible", reason: "no_commission" };
  }

  return {
    status: "eligible",
    value: {
      commissionBps: input.commissionBps,
      commissionCents,
      payoutThresholdCents: PARTNER_PAYOUT_THRESHOLD_CENTS,
      automaticAccrualEnabled: false,
      automaticPayoutEnabled: false,
    },
  };
}
