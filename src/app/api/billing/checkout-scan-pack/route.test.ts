import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getStripe, scanPackPriceId } from "@/lib/billing/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/billing/config", () => ({
  getAppUrl: vi.fn(() => "https://example.test"),
}));

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/stripe", () => ({
  getStripe: vi.fn(),
  scanPackPriceId: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  rateLimitExceededResponse: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("POST /api/billing/checkout-scan-pack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "buyer@example.test",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(scanPackPriceId).mockReturnValue("price_test_pack");
  });

  it("sella la Checkout Session con el contrato atómico versionado", async () => {
    const create = vi.fn(async () => ({
      id: "cs_test_atomic",
      url: "https://checkout.stripe.test/cs_test_atomic",
    }));
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create } },
    } as never);

    const maybeSingle = vi.fn(async () => ({
      data: {
        user_id: "11111111-1111-4111-8111-111111111111",
        plan: "pro",
        status: "active",
        current_period_end: "2099-01-01T00:00:00.000Z",
        stripe_customer_id: "cus_test_buyer",
      },
    }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const response = await POST(
      new Request("https://example.test/api/billing/checkout-scan-pack", {
        method: "POST",
        headers: { authorization: "Bearer test" },
      }),
    );

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: {
          user_id: "11111111-1111-4111-8111-111111111111",
          checkout_type: "scan_pack",
          scan_credits: "10",
          fulfillment_contract: "scan_pack_atomic_v1",
        },
      }),
    );
  });
});
