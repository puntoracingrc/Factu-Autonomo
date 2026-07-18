import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createPromoCampaign, listPromoCampaigns } from "@/lib/promotions/repository";
import { checkRateLimit, type RateLimitResult } from "@/lib/server/rate-limit";
import { GET, POST } from "./route";

vi.mock("@/lib/admin/server-access", () => ({ getAdminAccessFromRequest: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/promotions/repository", () => ({
  createPromoCampaign: vi.fn(),
  listPromoCampaigns: vi.fn(),
  PromotionRepositoryError: class PromotionRepositoryError extends Error {},
}));
vi.mock("@/lib/server/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/rate-limit")>(
    "@/lib/server/rate-limit",
  );
  return { ...actual, checkRateLimit: vi.fn() };
});

const ALLOWED: RateLimitResult = {
  allowed: true,
  limit: 120,
  remaining: 119,
  resetAt: Date.parse("2026-07-18T12:00:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

function request(method: "GET" | "POST" = "GET", body?: unknown) {
  return new Request("https://facturacion-autonomos.app/api/admin/promotions", {
    method,
    headers: {
      Authorization: "Bearer admin-token",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("Admin promotions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "22222222-2222-4222-8222-222222222222" },
    } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED);
    vi.mocked(listPromoCampaigns).mockResolvedValue([]);
  });

  it("requires Admin before reading campaigns", async () => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Solo administradores" }, { status: 403 }),
    } as never);
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(listPromoCampaigns).not.toHaveBeenCalled();
  });

  it("lists only masked campaign summaries with private headers", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(await response.json()).toEqual({ campaigns: [] });
  });

  it("rejects malformed campaigns before database access", async () => {
    const response = await POST(request("POST", { name: "x" }));
    expect(response.status).toBe(400);
    expect(createPromoCampaign).not.toHaveBeenCalled();
  });

  it("returns the bearer code exactly once when creation succeeds", async () => {
    vi.mocked(createPromoCampaign).mockResolvedValue({
      code: "FACTU-11111111-22222222-33333333",
      campaign: { id: "campaign" } as never,
    });
    const response = await POST(
      request("POST", {
        name: "Mes Pro",
        benefit: { kind: "plan_access", plan: "pro", durationDays: 30 },
        startsAt: "2026-07-18T00:00:00.000Z",
        expiresAt: "2026-08-18T23:59:59.000Z",
        maxRedemptions: 100,
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.codeShownOnce).toBe(true);
    expect(body.code).toBe("FACTU-11111111-22222222-33333333");
  });
});
