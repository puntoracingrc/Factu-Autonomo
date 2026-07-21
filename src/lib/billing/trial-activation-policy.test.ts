import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const billingContext = readFileSync(
  new URL("../../context/BillingContext.tsx", import.meta.url),
  "utf8",
);
const serverRepository = readFileSync(
  new URL("./server-repository.ts", import.meta.url),
  "utf8",
);
const clientRepository = readFileSync(
  new URL("./repository.ts", import.meta.url),
  "utf8",
);
const bonusScans = readFileSync(
  new URL("./grant-bonus-scans.ts", import.meta.url),
  "utf8",
);
const promotionMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260718120000_promotion_codes.sql",
    import.meta.url,
  ),
  "utf8",
);
const adminRoute = readFileSync(
  new URL("../../app/api/admin/users/[userId]/route.ts", import.meta.url),
  "utf8",
);
const pricing = readFileSync(
  new URL("../../app/precios/page.tsx", import.meta.url),
  "utf8",
);
const terms = readFileSync(
  new URL("../../app/legal/terminos/page.tsx", import.meta.url),
  "utf8",
);

describe("Pro trial activation policy", () => {
  it("initializes newly registered accounts as Gratis", () => {
    expect(billingContext).toContain("ensureFreeSubscription");
    expect(billingContext).not.toContain("ensureTrialSubscription");
    expect(clientRepository).toContain('fetch("/api/billing/subscription"');
    expect(clientRepository).not.toContain('fetch("/api/billing/trial"');
    expect(serverRepository).toContain('plan: "free"');
    expect(serverRepository).toContain('status: "inactive"');
    expect(bonusScans).toContain('plan: "free"');
    expect(bonusScans).not.toContain('plan: "trial"');
  });

  it("keeps explicit promotion and Admin activation paths", () => {
    expect(promotionMigration).toContain("benefit_kind = 'plan_access'");
    expect(promotionMigration).toContain(
      "promotional_plan = campaign.benefit_plan",
    );
    expect(adminRoute).toContain("coerceAdminPlan(body.plan)");
    expect(adminRoute).toContain("trial_ends_at: normalizeAdminDate(body.trialEndsAt)");
  });

  it("does not advertise an automatic trial", () => {
    expect(pricing).not.toContain("14 días de prueba al crear cuenta");
    expect(pricing).not.toContain("activar la prueba de 14 días");
    expect(terms).not.toContain("14 días de Pro al crear cuenta");
  });
});
