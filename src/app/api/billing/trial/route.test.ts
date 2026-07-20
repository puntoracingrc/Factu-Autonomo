import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { ensureFreeSubscriptionServer } from "@/lib/billing/server-repository";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/server-repository", () => ({
  ensureFreeSubscriptionServer: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  rateLimitExceededResponse: vi.fn(),
}));

function request(token: string | null) {
  return new Request("https://example.test/api/billing/trial", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("POST /api/billing/trial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requiere una cuenta confirmada", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(request(null));

    expect(response.status).toBe(401);
    expect(ensureFreeSubscriptionServer).not.toHaveBeenCalled();
  });

  it("mantiene compatibilidad inicializando Gratis sin conceder trial", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-free",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(ensureFreeSubscriptionServer).mockResolvedValue({
      userId: "user-free",
      plan: "free",
      status: "inactive",
      scanTrialRemaining: 2,
      scanCredits: 0,
      aiCreditUnits: 0,
    });

    const response = await POST(request("token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subscription).toMatchObject({
      userId: "user-free",
      plan: "free",
      status: "inactive",
    });
    expect(ensureFreeSubscriptionServer).toHaveBeenCalledWith("user-free");
  });
});
