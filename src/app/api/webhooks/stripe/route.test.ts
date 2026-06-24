import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getStripe } from "@/lib/billing/stripe";
import {
  markStripeEventFailed,
  markStripeEventProcessed,
  reserveStripeEvent,
} from "@/lib/billing/stripe-events";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/billing/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("@/lib/billing/stripe-events", () => ({
  reserveStripeEvent: vi.fn(),
  markStripeEventProcessed: vi.fn(),
  markStripeEventFailed: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/billing/payment-receipt-email", () => ({
  findUserIdByStripeCustomer: vi.fn(),
  receiptFromCheckoutSession: vi.fn(() => null),
  sendPaymentReceiptEmail: vi.fn(),
}));

vi.mock("@/lib/billing/sync-billing-profile", () => ({
  syncBillingProfileFromCheckoutSession: vi.fn(async () => null),
  syncBillingProfileFromCustomerId: vi.fn(async () => null),
}));

vi.mock("@/lib/email/welcome", () => ({
  sendWelcomeEmailForUser: vi.fn(async () => undefined),
}));

function stripeRequest() {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body: "{}",
  });
}

function fakeStripe(event: unknown) {
  return {
    webhooks: {
      constructEvent: vi.fn(() => event),
    },
  };
}

function fakeAdmin(updateError: { message: string } | null = null) {
  const eq = vi.fn(async () => ({ error: updateError }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { from, update, eq };
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.mocked(markStripeEventProcessed).mockResolvedValue(undefined);
    vi.mocked(markStripeEventFailed).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("procesa un evento valido una sola vez", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = {
      id: "evt_valid",
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { user_id: "user_1" },
        },
      },
    };
    const admin = fakeAdmin();

    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue({
      reserved: true,
      duplicate: false,
      status: "processing",
    });

    const response = await POST(stripeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(reserveStripeEvent).toHaveBeenCalledWith(
      "evt_valid",
      "customer.subscription.deleted",
    );
    expect(admin.from).toHaveBeenCalledWith("user_subscriptions");
    expect(markStripeEventProcessed).toHaveBeenCalledWith("evt_valid");
    expect(markStripeEventFailed).not.toHaveBeenCalled();
  });

  it("rechaza firma invalida sin reservar evento", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("bad signature");
        }),
      },
    } as never);

    const response = await POST(stripeRequest());

    expect(response.status).toBe(400);
    expect(reserveStripeEvent).not.toHaveBeenCalled();
  });

  it("responde correctamente a un evento repetido sin repetir efectos", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = {
      id: "evt_duplicate",
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { user_id: "user_1" },
        },
      },
    };

    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue({
      reserved: false,
      duplicate: true,
      status: "processed",
    });

    const response = await POST(stripeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });

  it("marca failed y devuelve 500 ante un error recuperable", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = {
      id: "evt_retry",
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { user_id: "user_1" },
        },
      },
    };

    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      fakeAdmin({ message: "temporary database error" }) as never,
    );
    vi.mocked(reserveStripeEvent).mockResolvedValue({
      reserved: true,
      duplicate: false,
      status: "processing",
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(500);
    expect(markStripeEventFailed).toHaveBeenCalledWith(
      "evt_retry",
      expect.any(Error),
    );
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });
});
