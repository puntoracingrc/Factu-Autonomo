import { describe, expect, it, vi } from "vitest";
import { getOrCreateReferralCode } from "./referrals";
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
});
