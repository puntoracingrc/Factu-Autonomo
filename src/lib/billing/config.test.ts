import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isBillingEnforced, isBillingEnforcedForEnv } from "./config";

describe("billing public configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["true", true],
    ["false", false],
    ["TRUE", false],
    ["1", false],
    [undefined, false],
  ] as const)(
    "treats NEXT_PUBLIC_BILLING_ENABLED=%s as %s",
    (value, expected) => {
      expect(
        isBillingEnforcedForEnv({ NEXT_PUBLIC_BILLING_ENABLED: value }),
      ).toBe(expected);
    },
  );

  it("reads the public build flag through the client-safe entry point", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    expect(isBillingEnforced()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    expect(isBillingEnforced()).toBe(false);
  });

  it("keeps a direct public env access that Next can inline", () => {
    const source = readFileSync(new URL("./config.ts", import.meta.url), "utf8");

    expect(source).toContain(
      'process.env.NEXT_PUBLIC_BILLING_ENABLED === "true"',
    );
    expect(source).not.toMatch(/env\s*=\s*process\.env/);
  });
});
