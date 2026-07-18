import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { redeemPromoCode } from "@/lib/promotions/repository";
import { checkRateLimit, type RateLimitResult } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("@/lib/billing/server-auth", () => ({ getUserFromBearer: vi.fn() }));
vi.mock("@/lib/promotions/repository", () => ({
  redeemPromoCode: vi.fn(),
  PromotionRepositoryError: class PromotionRepositoryError extends Error {},
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/rate-limit")>(
    "@/lib/server/rate-limit",
  );
  return { ...actual, checkRateLimit: vi.fn() };
});

const ALLOWED: RateLimitResult = {
  allowed: true,
  limit: 10,
  remaining: 9,
  resetAt: Date.parse("2026-07-18T12:00:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

function request(code: unknown) {
  return new Request("https://facturacion-autonomos.app/api/promotions/redeem", {
    method: "POST",
    headers: { Authorization: "Bearer user-token", "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

describe("Promotion redemption API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED);
  });

  it("requires a confirmed authenticated account", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);
    const response = await POST(request("FACTU-11111111-22222222-33333333"));
    expect(response.status).toBe(401);
    expect(redeemPromoCode).not.toHaveBeenCalled();
  });

  it("rejects invalid characters before hashing or database access", async () => {
    const response = await POST(request("<script>"));
    expect(response.status).toBe(400);
    expect(redeemPromoCode).not.toHaveBeenCalled();
  });

  it("applies an atomic benefit and returns private headers", async () => {
    vi.mocked(redeemPromoCode).mockResolvedValue({
      status: "applied",
      campaignName: "Bienvenida",
      benefit: { kind: "ai_scans", scanCredits: 10 },
      benefitEndsAt: null,
    });
    const response = await POST(request("factu-11111111-22222222-33333333"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(body.status).toBe("applied");
    expect(redeemPromoCode).toHaveBeenCalledWith(expect.anything(), {
      userId: "user-1",
      code: "FACTU-11111111-22222222-33333333",
    });
  });

  it("does not replace an active paid subscription", async () => {
    vi.mocked(redeemPromoCode).mockResolvedValue({
      status: "paid_plan_active",
      campaignName: "Mes Pro",
      benefit: { kind: "plan_access", plan: "pro", durationDays: 30 },
      benefitEndsAt: null,
    });
    const response = await POST(request("FACTU-11111111-22222222-33333333"));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.message).toContain("no modifica ni sustituye");
  });
});
