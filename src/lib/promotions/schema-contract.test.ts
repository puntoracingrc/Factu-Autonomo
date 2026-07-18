import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260718120000_promotion_codes.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("promotion schema contract", () => {
  it("keeps bearer codes hashed and all promotion tables server-only", () => {
    expect(migration).toContain("code_hash text not null unique");
    expect(migration).not.toContain("code_plaintext");
    expect(migration).toContain(
      "revoke all on table public.promo_campaigns from public, anon, authenticated",
    );
    expect(migration).toContain("grant all on table public.promo_campaigns to service_role");
  });

  it("applies redemption atomically without changing Stripe plan fields", () => {
    const functionBody = migration.slice(migration.indexOf("create or replace function public.redeem_promo_code"));
    expect(functionBody).toContain("for update");
    expect(migration).toContain("unique (campaign_id, user_id)");
    expect(functionBody).toContain("promotional_plan = campaign.benefit_plan");
    expect(functionBody).not.toContain("stripe_subscription_id =");
    expect(functionBody).not.toContain("stripe_customer_id =");
  });

  it("rejects paid-plan replacement and limits execution to service role", () => {
    expect(migration).toContain("'paid_plan_active'");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain(
      "revoke all on function public.redeem_promo_code(uuid, text, timestamptz)",
    );
  });
});
