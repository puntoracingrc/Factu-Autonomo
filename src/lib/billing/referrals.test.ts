import { describe, expect, it } from "vitest";
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

  it("incluye ref en configuracion", () => {
    expect(buildReferralShareUrl("https://app.test", "ABC12XY9")).toBe(
      "https://app.test/configuracion?ref=ABC12XY9",
    );
  });
});
