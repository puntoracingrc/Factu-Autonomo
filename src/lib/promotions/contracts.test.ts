import { describe, expect, it } from "vitest";
import {
  maskPromoCode,
  normalizePromoCode,
  parsePromoBenefit,
  parsePromoCampaignInput,
} from "./contracts";
import { hashPromoCode } from "./server-code";

describe("promotion contracts", () => {
  it("normalizes bounded opaque codes", () => {
    expect(normalizePromoCode(" factu-abcd-1234 ")).toBe("FACTU-ABCD-1234");
    expect(normalizePromoCode("short")).toBeNull();
    expect(normalizePromoCode("FACTU_<script>")).toBeNull();
  });

  it("stores a hash and only exposes a masked suffix", () => {
    const code = "FACTU-12345678-ABCDEF12-99887766";
    expect(hashPromoCode(code)).toMatch(/^[a-f0-9]{64}$/);
    expect(maskPromoCode(code)).toBe("FACTU-****-7766");
  });

  it("accepts current benefits and rejects unregistered modules", () => {
    expect(parsePromoBenefit({ kind: "ai_scans", scanCredits: 10 })).toEqual({
      kind: "ai_scans",
      scanCredits: 10,
    });
    expect(
      parsePromoBenefit({ kind: "plan_access", plan: "pro_plus", durationDays: 30 }),
    ).toEqual({ kind: "plan_access", plan: "pro_plus", durationDays: 30 });
    expect(
      parsePromoBenefit({ kind: "module_access", moduleKey: "future", durationDays: 30 }),
    ).toBeNull();
  });

  it("requires an ordered validity window and bounded uses", () => {
    expect(
      parsePromoCampaignInput({
        name: "Mes Pro",
        benefit: { kind: "plan_access", plan: "pro", durationDays: 30 },
        startsAt: "2026-07-18T00:00:00.000Z",
        expiresAt: "2026-08-18T00:00:00.000Z",
        maxRedemptions: 100,
      }),
    ).not.toBeNull();
    expect(
      parsePromoCampaignInput({
        name: "Mes Pro",
        benefit: { kind: "plan_access", plan: "pro", durationDays: 30 },
        startsAt: "2026-08-18T00:00:00.000Z",
        expiresAt: "2026-07-18T00:00:00.000Z",
        maxRedemptions: 100,
      }),
    ).toBeNull();
  });
});
