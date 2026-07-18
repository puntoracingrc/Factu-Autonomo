import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("paid Affiliate reward protection", () => {
  it("keeps attribution separate from any value grant", () => {
    const referrals = source("src/lib/billing/referrals.ts");
    const baseSchema = source("supabase/referrals.sql");

    expect(referrals).toContain("Attribution never grants value");
    expect(referrals).toContain("bonusScans: 0");
    expect(referrals).toContain('program: referrer.program');
    expect(referrals).not.toContain("grantBonusScans");
    expect(baseSchema).toContain("Registrar un código no concede valor");
    expect(baseSchema).toContain("no autorizan recompensas");
  });

  it("requires a signed eligible Stripe payment and matching server state", () => {
    const webhook = source("src/app/api/webhooks/stripe/route.ts");
    const reward = source("src/lib/billing/paid-referral-rewards.ts");

    expect(webhook).toContain("constructEvent");
    expect(webhook).toContain('case "invoice.paid"');
    expect(webhook).toContain('subscription.status === "active"');
    expect(webhook).toContain("subscriptionCustomerId === customerId");
    expect(webhook).toContain("strictPaidPlanFromStripe(subscription)");
    expect(reward).toContain('input.collectionMethod === "charge_automatically"');
    expect(reward).toContain("input.paidOutOfBand === false");
    expect(reward).toContain("REFERRAL_MIN_PAYMENT_CENTS");
  });

  it("grants both sides atomically from a private idempotent ledger", () => {
    const migration = source(
      "supabase/migrations/20260718143000_affiliate_paid_rewards.sql",
    );

    expect(migration).toContain("stripe_event_id text not null unique");
    expect(migration).toContain("stripe_invoice_id text not null unique");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain("revoke all on table public.affiliate_reward_entries");
    expect(migration).toContain("v_updated <> 2");
    expect(migration).toContain("affiliate reward identity conflict");
    expect(migration).toContain("program = 'affiliate'");
  });

  it("keeps Partners separate and exposes only aggregate Affiliate stats", () => {
    const referrals = source("src/lib/billing/referrals.ts");
    const partners = source("src/lib/partners/repository.ts");
    const api = source("src/app/api/referrals/me/route.ts");

    expect(referrals).toContain('.eq("program", "affiliate")');
    expect(partners).toContain('.eq("program", "partner")');
    expect(api).toContain("registeredCount");
    expect(api).toContain("payingCount");
    expect(api).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(api).not.toContain("referee_user_id");
    expect(api).not.toContain("email");
  });
});
