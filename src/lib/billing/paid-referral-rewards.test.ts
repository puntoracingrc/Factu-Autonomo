import { describe, expect, it, vi } from "vitest";
import {
  grantPaidReferralReward,
  isEligiblePaidReferralInvoice,
  REFERRAL_MIN_PAYMENT_CENTS,
} from "./paid-referral-rewards";

const paidAt = new Date("2026-07-18T12:00:00.000Z");

function validInput() {
  return {
    refereeUserId: "11111111-1111-4111-8111-111111111111",
    stripeEventId: "evt_paid_1",
    stripeInvoiceId: "in_paid_1",
    stripeSubscriptionId: "sub_paid_1",
    stripeCustomerId: "cus_paid_1",
    plan: "pro" as const,
    amountPaidCents: 599,
    currency: "eur",
    billingReason: "subscription_cycle",
    collectionMethod: "charge_automatically",
    paidOutOfBand: false,
    paidAt,
  };
}

describe("paid affiliate rewards", () => {
  it("accepts only initial or recurring positive subscription payments", () => {
    expect(isEligiblePaidReferralInvoice(validInput())).toBe(true);
    expect(
      isEligiblePaidReferralInvoice({
        ...validInput(),
        billingReason: "subscription_create",
      }),
    ).toBe(true);
    expect(
      isEligiblePaidReferralInvoice({
        ...validInput(),
        billingReason: "subscription_update",
      }),
    ).toBe(false);
    expect(
      isEligiblePaidReferralInvoice({
        ...validInput(),
        amountPaidCents: REFERRAL_MIN_PAYMENT_CENTS - 1,
      }),
    ).toBe(false);
    expect(
      isEligiblePaidReferralInvoice({
        ...validInput(),
        paidOutOfBand: true,
      }),
    ).toBe(false);
    expect(
      isEligiblePaidReferralInvoice({
        ...validInput(),
        collectionMethod: "send_invoice",
      }),
    ).toBe(false);
    expect(
      isEligiblePaidReferralInvoice({ ...validInput(), currency: "usd" }),
    ).toBe(false);
  });

  it("delegates the two-sided credit to one private atomic RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "applied", error: null });

    await expect(
      grantPaidReferralReward(validInput(), { rpc } as never),
    ).resolves.toBe("applied");

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith(
      "grant_paid_affiliate_reward",
      expect.objectContaining({
        p_stripe_event_id: "evt_paid_1",
        p_stripe_invoice_id: "in_paid_1",
        p_stripe_customer_id: "cus_paid_1",
        p_scan_credits: 5,
      }),
    );
  });

  it("does not call storage for free, tiny or unrelated invoices", async () => {
    const rpc = vi.fn();
    await expect(
      grantPaidReferralReward(
        { ...validInput(), amountPaidCents: 0 },
        { rpc } as never,
      ),
    ).resolves.toBe("not_eligible");
    await expect(
      grantPaidReferralReward(
        { ...validInput(), billingReason: "manual" },
        { rpc } as never,
      ),
    ).resolves.toBe("not_eligible");
    expect(rpc).not.toHaveBeenCalled();
  });
});
