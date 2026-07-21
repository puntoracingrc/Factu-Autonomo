import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { ensureFreeSubscriptionServer } from "@/lib/billing/server-repository";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/server-repository", () => ({
  ensureFreeSubscriptionServer: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(),
}));

function request(token: string | null) {
  return new Request("https://example.test/api/billing/subscription", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("POST /api/billing/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 600,
      remaining: 599,
      resetAt: Date.now() + 600_000,
      retryAfterSeconds: 600,
      backend: "memory",
    });
  });

  it("requiere una cuenta confirmada", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(request(null));

    expect(response.status).toBe(401);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(ensureFreeSubscriptionServer).not.toHaveBeenCalled();
  });

  it("devuelve la suscripcion vigente sin cachearla", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(ensureFreeSubscriptionServer).mockResolvedValue({
      userId: "user-pro",
      plan: "pro",
      status: "active",
      scanTrialRemaining: 2,
      scanCredits: 0,
      aiCreditUnits: 0,
    });

    const response = await POST(request("token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body.subscription).toMatchObject({
      userId: "user-pro",
      plan: "pro",
      status: "active",
    });
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "billing_subscription",
        limit: 600,
        windowMs: 10 * 60_000,
      },
      "user-pro",
    );
  });

  it("conserva el limite de abuso sin convertirlo en una suscripcion Gratis", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-limited",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 600,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });
    vi.mocked(rateLimitExceededResponse).mockReturnValue(
      Response.json({ error: "Demasiados intentos" }, { status: 429 }) as never,
    );

    const response = await POST(request("token"));

    expect(response.status).toBe(429);
    expect(ensureFreeSubscriptionServer).not.toHaveBeenCalled();
  });
});
