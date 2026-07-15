import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildUnlimitedAiQuota,
  hasUnlimitedAiAccess,
} from "./unlimited-ai-access";

describe("unlimited admin AI access", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(["admin-one@example.com", "admin-two@example.com"])(
    "concede el mismo acceso ilimitado a %s desde ADMIN_EMAILS",
    (email) => {
      vi.stubEnv(
        "ADMIN_EMAILS",
        "admin-one@example.com,admin-two@example.com",
      );

      expect(hasUnlimitedAiAccess({ email })).toBe(true);
    },
  );

  it("no concede acceso ilimitado a un usuario normal", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");

    expect(hasUnlimitedAiAccess({ email: "cliente@example.com" })).toBe(false);
  });

  it("representa la cuota ilimitada sin consumir creditos persistidos", () => {
    const quota = buildUnlimitedAiQuota();

    expect(quota.plan).toBe("pro");
    expect(quota.remaining).toBe(Number.MAX_SAFE_INTEGER);
    expect(quota.remainingUnits).toBe(Number.MAX_SAFE_INTEGER);
  });
});
