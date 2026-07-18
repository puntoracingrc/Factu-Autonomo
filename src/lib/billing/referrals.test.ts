import { describe, expect, it, vi } from "vitest";
import { getOrCreateReferralCode, summarizeReferralStats } from "./referrals";
import {
  buildReferralShareUrl,
  normalizeReferralCode,
  REFERRAL_BONUS_SCANS,
} from "./referral-codes";

describe("referral codes", () => {
  it("bonus scans is positive", () => {
    expect(REFERRAL_BONUS_SCANS).toBeGreaterThan(0);
  });

  it("limpia y pone mayúsculas", () => {
    expect(normalizeReferralCode(" abc-12xy ")).toBe("ABC12XY");
  });

  it("abre el registro con el codigo de invitacion", () => {
    expect(buildReferralShareUrl("https://app.test", "ABC12XY9")).toBe(
      "https://app.test/cuenta?modo=crear&ref=ABC12XY9#inicio-sesion",
    );
  });

  it("uses the explicit server client for Partner links", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { code: "PARTNER8" },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    await expect(
      getOrCreateReferralCode("partner-user-id", { from } as never),
    ).resolves.toBe("PARTNER8");
    expect(from).toHaveBeenCalledWith("referral_codes");
    expect(eq).toHaveBeenCalledWith("user_id", "partner-user-id");
  });

  it("summarizes registered, paid, unpaid and plan levels without identities", () => {
    const stats = summarizeReferralStats(
      ["free-user", "pro-user", "plus-user", "pro-user"],
      [
        {
          user_id: "pro-user",
          plan: "pro",
          status: "active",
          stripe_subscription_id: "sub_pro",
          current_period_end: "2026-08-18T00:00:00.000Z",
        },
        {
          user_id: "plus-user",
          plan: "pro_plus",
          status: "past_due",
          stripe_subscription_id: "sub_plus",
          current_period_end: "2026-08-18T00:00:00.000Z",
        },
      ],
      [
        { referee_user_id: "pro-user", scan_credits_per_user: 5 },
        { referee_user_id: "pro-user", scan_credits_per_user: 5 },
      ],
      true,
      new Date("2026-07-18T00:00:00.000Z"),
    );

    expect(stats).toMatchObject({
      registeredCount: 3,
      payingCount: 1,
      inactiveCount: 2,
      rewardedSubscribersCount: 1,
      rewardEventsCount: 2,
      scansEarned: 10,
      hasRedeemed: true,
    });
    expect(stats.planCounts).toEqual([
      { plan: "free", label: "Gratis", count: 1, paying: 0 },
      { plan: "trial", label: "Prueba Pro", count: 0, paying: 0 },
      { plan: "pro", label: "Pro", count: 1, paying: 1 },
      { plan: "pro_plus", label: "Pro+ IA", count: 1, paying: 0 },
    ]);
  });
});
