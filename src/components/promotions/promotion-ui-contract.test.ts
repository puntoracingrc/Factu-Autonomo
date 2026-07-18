import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminPage = readFileSync(new URL("../../app/admin/page.tsx", import.meta.url), "utf8");
const adminPanel = readFileSync(new URL("../admin/AdminPromotionsPanel.tsx", import.meta.url), "utf8");
const affiliatesPage = readFileSync(new URL("../../app/afiliados/page.tsx", import.meta.url), "utf8");
const accountPage = readFileSync(new URL("../../app/cuenta/page.tsx", import.meta.url), "utf8");
const redeemer = readFileSync(new URL("./PromoCodeRedeemer.tsx", import.meta.url), "utf8");
const billingContext = readFileSync(new URL("../../context/BillingContext.tsx", import.meta.url), "utf8");

describe("promotion UI contract", () => {
  it("adds a dedicated Admin section with bounded current benefits", () => {
    expect(adminPage).toContain('id: "promociones"');
    expect(adminPage).toContain("<AdminPromotionsPanel />");
    expect(adminPanel).toContain('value="plan_access"');
    expect(adminPanel).toContain('value="ai_scans"');
    expect(adminPanel).toContain("Usos máximos");
    expect(adminPanel).toContain("Caduca");
  });

  it("shows the full bearer code only in the creation response", () => {
    expect(adminPanel).toContain("Se muestra completo una sola vez");
    expect(adminPanel).toContain("codeMasked");
    expect(adminPanel).not.toContain("code_hash");
  });

  it("keeps user redemption separate from referral attribution", () => {
    expect(affiliatesPage).not.toContain("<PromoCodeRedeemer />");
    expect(accountPage).toContain("<PromoCodeRedeemer />");
    expect(redeemer).toContain("/api/promotions/redeem");
    expect(redeemer).not.toContain("/api/referrals/redeem");
    expect(redeemer).not.toContain("stripe");
    expect(redeemer).toContain('new Event("fa-billing-refresh")');
    expect(billingContext).toContain('addEventListener("fa-billing-refresh"');
  });
});
