import { beforeEach, describe, expect, it, vi } from "vitest";
import { canUseCloudForUser } from "./cloud-access";

const repository = vi.hoisted(() => ({
  fetchUserSubscription: vi.fn(),
  ensureTrialSubscription: vi.fn(),
}));

vi.mock("./repository", () => ({
  fetchUserSubscription: repository.fetchUserSubscription,
  ensureTrialSubscription: repository.ensureTrialSubscription,
}));

describe("cloud access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activa la nube para usuarios nuevos cuando el trial se crea en servidor", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    repository.fetchUserSubscription.mockResolvedValueOnce(null);
    repository.ensureTrialSubscription.mockResolvedValueOnce({
      userId: "u1",
      plan: "trial",
      status: "trialing",
      trialEndsAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const result = await canUseCloudForUser("u1");

    expect(result.allowed).toBe(true);
    expect(repository.ensureTrialSubscription).toHaveBeenCalledWith("u1");
    vi.unstubAllEnvs();
  });

  it("bloquea nube en plan gratis con billing activo", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    repository.fetchUserSubscription.mockResolvedValueOnce({
      userId: "u1",
      plan: "free",
      status: "inactive",
    });
    const result = await canUseCloudForUser("u1");
    expect(result.allowed).toBe(false);
    vi.unstubAllEnvs();
  });

  it("permite nube sin billing", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    repository.fetchUserSubscription.mockResolvedValueOnce(null);
    const result = await canUseCloudForUser("u1");
    expect(result.allowed).toBe(true);
    expect(repository.ensureTrialSubscription).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
