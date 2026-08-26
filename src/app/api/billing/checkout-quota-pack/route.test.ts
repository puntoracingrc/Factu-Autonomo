import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { resolveServerBillingPlan } from "@/lib/billing/quota-server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getStripe, quotaPackPriceId } from "@/lib/billing/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/billing/config", () => ({
  getAppUrl: vi.fn(() => "https://example.test"),
}));

vi.mock("@/lib/billing/quota-server", () => ({
  resolveServerBillingPlan: vi.fn(),
}));

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/stripe", () => ({
  getStripe: vi.fn(),
  quotaPackPriceId: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  rateLimitExceededResponse: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function request(pack: string) {
  return new Request("https://example.test/api/billing/checkout-quota-pack", {
    method: "POST",
    headers: {
      authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ pack }),
  });
}

describe("POST /api/billing/checkout-quota-pack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "buyer@example.test",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(resolveServerBillingPlan).mockResolvedValue("free");
    vi.mocked(quotaPackPriceId).mockReturnValue("price_documents_5");
    const maybeSingle = vi.fn(async () => ({
      data: { stripe_customer_id: "cus_test_buyer" },
      error: null,
    }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
  });

  it("crea un pago único sellado con pack, cantidad y contrato", async () => {
    const create = vi.fn(async () => ({
      id: "cs_test_quota_pack",
      url: "https://checkout.stripe.test/cs_test_quota_pack",
    }));
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create } },
    } as never);

    const response = await POST(request("documents_5"));

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        customer: "cus_test_buyer",
        automatic_tax: { enabled: true },
        tax_id_collection: { enabled: true },
        billing_address_collection: "required",
        customer_update: { address: "auto" },
        metadata: {
          user_id: "11111111-1111-4111-8111-111111111111",
          checkout_type: "quota_pack",
          quota_pack: "documents_5",
          quota_quantity: "5",
          fulfillment_contract: "quota_pack_atomic_v1",
        },
      }),
    );
  });

  it("rechaza nombres de pack manipulados antes de abrir Stripe", async () => {
    const response = await POST(request("documents_5000"));

    expect(response.status).toBe(400);
    expect(getStripe).not.toHaveBeenCalled();
  });

  it("no vende extras innecesarios a un plan sin límites", async () => {
    vi.mocked(resolveServerBillingPlan).mockResolvedValue("pro");
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create: vi.fn() } },
    } as never);

    const response = await POST(request("contacts_5"));

    expect(response.status).toBe(409);
  });
});
