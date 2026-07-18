import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PaidPlanId } from "./plans";
import { AI_UNITS_PER_SCAN } from "./scan-limits";
import { REFERRAL_BONUS_SCANS } from "./referral-codes";

export const REFERRAL_MIN_PAYMENT_CENTS = 199;

export const ELIGIBLE_REFERRAL_BILLING_REASONS = [
  "subscription_create",
  "subscription_cycle",
] as const;

export type EligibleReferralBillingReason =
  (typeof ELIGIBLE_REFERRAL_BILLING_REASONS)[number];

export interface PaidReferralInvoiceInput {
  refereeUserId: string;
  stripeEventId: string;
  stripeInvoiceId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  plan: PaidPlanId;
  amountPaidCents: number;
  currency: string;
  billingReason: string | null | undefined;
  collectionMethod: string | null | undefined;
  paidOutOfBand: boolean;
  paidAt: Date;
}

export type PaidReferralRewardStatus =
  | "applied"
  | "already_applied"
  | "not_attributed"
  | "not_eligible";

export function isEligiblePaidReferralInvoice(
  input: Pick<
    PaidReferralInvoiceInput,
    | "amountPaidCents"
    | "billingReason"
    | "collectionMethod"
    | "currency"
    | "paidOutOfBand"
  >,
): input is typeof input & { billingReason: EligibleReferralBillingReason } {
  return (
    Number.isSafeInteger(input.amountPaidCents) &&
    input.amountPaidCents >= REFERRAL_MIN_PAYMENT_CENTS &&
    input.collectionMethod === "charge_automatically" &&
    input.paidOutOfBand === false &&
    input.currency === "eur" &&
    ELIGIBLE_REFERRAL_BILLING_REASONS.includes(
      input.billingReason as EligibleReferralBillingReason,
    )
  );
}

export async function grantPaidReferralReward(
  input: PaidReferralInvoiceInput,
  adminOverride?: SupabaseClient,
): Promise<PaidReferralRewardStatus> {
  if (!isEligiblePaidReferralInvoice(input)) return "not_eligible";
  const admin = adminOverride ?? getSupabaseAdmin();
  if (!admin) throw new Error("Affiliate reward store unavailable");

  const { data, error } = await admin.rpc("grant_paid_affiliate_reward", {
    p_referee_user_id: input.refereeUserId,
    p_stripe_event_id: input.stripeEventId,
    p_stripe_invoice_id: input.stripeInvoiceId,
    p_stripe_subscription_id: input.stripeSubscriptionId,
    p_stripe_customer_id: input.stripeCustomerId,
    p_source_plan: input.plan,
    p_source_amount_cents: input.amountPaidCents,
    p_currency: input.currency,
    p_billing_reason: input.billingReason,
    p_paid_at: input.paidAt.toISOString(),
    p_scan_credits: REFERRAL_BONUS_SCANS,
    p_units_per_scan: AI_UNITS_PER_SCAN,
  });

  if (error) throw new Error("Affiliate reward grant failed");
  if (
    data === "applied" ||
    data === "already_applied" ||
    data === "not_attributed" ||
    data === "not_eligible"
  ) {
    return data;
  }
  throw new Error("Affiliate reward result invalid");
}
