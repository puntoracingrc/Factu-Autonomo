import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as checkoutPost } from "../src/app/api/billing/checkout/route";
import { POST as portalPost } from "../src/app/api/billing/portal/route";
import { POST as welcomePost } from "../src/app/api/email/welcome/route";
import { getUserFromBearer } from "../src/lib/billing/server-auth";
import { getStripe } from "../src/lib/billing/stripe";
import { isEmailConfigured } from "../src/lib/email/config";
import { sendWelcomeEmailForUser } from "../src/lib/email/welcome";
import { getSupabaseAdmin } from "../src/lib/supabase/admin";

vi.mock("../src/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("../src/lib/billing/stripe", () => ({
  getStripe: vi.fn(),
  priceIdForInterval: vi.fn((interval: "monthly" | "yearly") =>
    interval === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY,
  ),
}));

vi.mock("../src/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("../src/lib/email/config", () => ({
  isEmailConfigured: vi.fn(),
}));

vi.mock("../src/lib/email/welcome", () => ({
  sendWelcomeEmailForUser: vi.fn(),
}));

function authenticatedRequest(url: string, body?: Record<string, unknown>) {
  return new Request(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function fakeCheckoutStripe() {
  return {
    checkout: {
      sessions: {
        create: vi.fn(async () => ({
          url: "https://checkout.stripe.test/session",
        })),
      },
    },
  };
}

function fakePortalStripe() {
  return {
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({
          url: "https://billing.stripe.test/session",
        })),
      },
    },
  };
}

function fakeAdmin(customerId: string | null = null) {
  const maybeSingle = vi.fn(async () => ({
    data: customerId ? { stripe_customer_id: customerId } : null,
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from, select, eq, maybeSingle };
}

describe("cloud and Stripe production routes", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("checkout usa dominio publico en success/cancel y conserva user_id", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://facturacion-autonomos.app/");
    vi.stubEnv("STRIPE_PRICE_MONTHLY", "price_monthly");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user_1",
      email: "cliente@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    const stripe = fakeCheckoutStripe();
    vi.mocked(getStripe).mockReturnValue(stripe as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(fakeAdmin("cus_existing") as never);

    const response = await checkoutPost(
      authenticatedRequest("http://localhost/api/billing/checkout", {
        interval: "monthly",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.test/session");
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_existing",
        customer_email: undefined,
        line_items: [{ price: "price_monthly", quantity: 1 }],
        success_url: "https://facturacion-autonomos.app/precios?checkout=success",
        cancel_url: "https://facturacion-autonomos.app/precios?checkout=cancel",
        metadata: { user_id: "user_1" },
        subscription_data: { metadata: { user_id: "user_1" } },
      }),
    );
  });

  it("checkout rechaza usuario ausente y precio no configurado", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValueOnce(null);

    const unauthorized = await checkoutPost(
      authenticatedRequest("http://localhost/api/billing/checkout", {
        interval: "monthly",
      }),
    );

    expect(unauthorized.status).toBe(401);
    expect(getStripe).not.toHaveBeenCalled();

    vi.resetAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user_1",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(getStripe).mockReturnValue(fakeCheckoutStripe() as never);

    const missingPrice = await checkoutPost(
      authenticatedRequest("http://localhost/api/billing/checkout", {
        interval: "yearly",
      }),
    );

    expect(missingPrice.status).toBe(503);
  });

  it("portal usa dominio publico para volver a configuracion", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://facturacion-autonomos.app/");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user_1",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    const stripe = fakePortalStripe();
    vi.mocked(getStripe).mockReturnValue(stripe as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(fakeAdmin("cus_existing") as never);

    const response = await portalPost(
      authenticatedRequest("http://localhost/api/billing/portal"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://billing.stripe.test/session");
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_existing",
      return_url: "https://facturacion-autonomos.app/configuracion",
    });
  });

  it("portal rechaza usuario ausente o sin cliente Stripe", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValueOnce(null);

    const unauthorized = await portalPost(
      authenticatedRequest("http://localhost/api/billing/portal"),
    );

    expect(unauthorized.status).toBe(401);
    expect(getStripe).not.toHaveBeenCalled();

    vi.resetAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user_1",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(getStripe).mockReturnValue(fakePortalStripe() as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(fakeAdmin(null) as never);

    const noCustomer = await portalPost(
      authenticatedRequest("http://localhost/api/billing/portal"),
    );

    expect(noCustomer.status).toBe(400);
  });

  it("welcome no convierte en 500 publico un fallo no critico de email", async () => {
    vi.mocked(isEmailConfigured).mockReturnValue(true);
    vi.mocked(sendWelcomeEmailForUser).mockResolvedValue({
      ok: false,
      error: "provider rejected recipient",
    });

    const response = await welcomePost(
      new Request("http://localhost/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user_1",
          email: "cliente@example.com",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Email de bienvenida pendiente");
  });
});
