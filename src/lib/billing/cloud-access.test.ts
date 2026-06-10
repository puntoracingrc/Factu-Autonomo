import { describe, expect, it, vi } from "vitest";
import { canUseCloudForUser } from "./cloud-access";

vi.mock("./repository", () => ({
  fetchUserSubscription: vi.fn(async () => ({
    userId: "u1",
    plan: "free",
    status: "inactive",
  })),
}));

describe("cloud access", () => {
  it("bloquea nube en plan gratis con billing activo", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const result = await canUseCloudForUser("u1");
    expect(result.allowed).toBe(false);
    vi.unstubAllEnvs();
  });

  it("permite nube sin billing", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    const result = await canUseCloudForUser("u1");
    expect(result.allowed).toBe(true);
    vi.unstubAllEnvs();
  });
});
