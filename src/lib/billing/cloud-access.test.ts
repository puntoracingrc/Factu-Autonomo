import { beforeEach, describe, expect, it, vi } from "vitest";
import { canUseCloudForUser } from "./cloud-access";

const repository = vi.hoisted(() => ({
  ensureFreeSubscription: vi.fn(),
}));

vi.mock("./repository", () => ({
  ensureFreeSubscription: repository.ensureFreeSubscription,
}));

describe("cloud access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloquea la nube para usuarios nuevos inicializados en Gratis", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    repository.ensureFreeSubscription.mockResolvedValueOnce({
      userId: "u1",
      plan: "free",
      status: "inactive",
    });

    const result = await canUseCloudForUser("u1");

    expect(result.allowed).toBe(false);
    expect(repository.ensureFreeSubscription).toHaveBeenCalledWith("u1");
    vi.unstubAllEnvs();
  });

  it("bloquea nube en plan gratis con billing activo", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    repository.ensureFreeSubscription.mockResolvedValueOnce({
      userId: "u1",
      plan: "free",
      status: "inactive",
    });
    const result = await canUseCloudForUser("u1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("plan con nube");
    vi.unstubAllEnvs();
  });

  it("permite nube sin billing", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    const result = await canUseCloudForUser("u1");
    expect(result.allowed).toBe(true);
    expect(repository.ensureFreeSubscription).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
