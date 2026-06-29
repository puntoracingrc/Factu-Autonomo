import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { consumeCustomerAiAutofill } from "@/lib/billing/scan-usage-server";
import { enrichCustomerPostalCode } from "@/lib/customer-ai/geocoding";
import { extractCustomerFromText } from "@/lib/customer-ai/openai";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/server-repository", () => ({
  fetchUserSubscriptionServer: vi.fn(),
}));

vi.mock("@/lib/billing/scan-usage-server", () => ({
  consumeCustomerAiAutofill: vi.fn(),
}));

vi.mock("@/lib/customer-ai/geocoding", () => ({
  enrichCustomerPostalCode: vi.fn(),
}));

vi.mock("@/lib/customer-ai/openai", () => ({
  extractCustomerFromText: vi.fn(),
}));

function request(token: string | null, body: Record<string, unknown>) {
  return new Request("http://localhost/api/customers/parse", {
    method: "POST",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function proSubscription(userId: string) {
  return {
    userId,
    plan: "pro" as const,
    status: "active" as const,
    currentPeriodEnd: null,
    trialEndsAt: null,
    scanTrialRemaining: 0,
    scanCredits: 0,
    aiCreditUnits: 0,
  };
}

function freeSubscription(userId: string) {
  return {
    userId,
    plan: "free" as const,
    status: "inactive" as const,
    currentPeriodEnd: null,
    trialEndsAt: null,
    scanTrialRemaining: 0,
    scanCredits: 0,
    aiCreditUnits: 0,
  };
}

describe("POST /api/customers/parse", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("autoriza a un usuario Pro autenticado", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      proSubscription("user-pro"),
    );
    vi.mocked(consumeCustomerAiAutofill).mockResolvedValue({
      allowed: true,
      quota: {} as Awaited<
        ReturnType<typeof consumeCustomerAiAutofill>
      >["quota"],
    });
    vi.mocked(extractCustomerFromText).mockResolvedValue({
      data: {
        customer: { firstName: "Cliente", lastName: "Pro" },
        confidence: 0.95,
        warnings: [],
      },
    });
    vi.mocked(enrichCustomerPostalCode).mockResolvedValue({
      customer: {
        firstName: "Cliente",
        lastName: "Pro",
        postalCode: "08017",
      },
      confidence: 0.95,
      warnings: [],
    });

    const response = await POST(
      request("token-pro", {
        text: "Cliente Pro SL Calle Mayor 1 Barcelona",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.customer.firstName).toBe("Cliente");
    expect(fetchUserSubscriptionServer).toHaveBeenCalledWith("user-pro");
    expect(consumeCustomerAiAutofill).toHaveBeenCalledWith("user-pro");
  });

  it("rechaza a un usuario gratuito", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-free",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      freeSubscription("user-free"),
    );

    const response = await POST(
      request("token-free", {
        text: "Cliente Gratis SL Calle Mayor 1 Barcelona",
      }),
    );

    expect(response.status).toBe(402);
    expect(consumeCustomerAiAutofill).not.toHaveBeenCalled();
    expect(extractCustomerFromText).not.toHaveBeenCalled();
  });

  it("rechaza token ausente cuando billing esta activo", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(
      request(null, {
        text: "Cliente Sin Token SL Calle Mayor 1 Barcelona",
      }),
    );

    expect(response.status).toBe(401);
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalled();
  });

  it("usa el usuario del token aunque el cuerpo envie otro userId", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "token-user",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      proSubscription("token-user"),
    );
    vi.mocked(consumeCustomerAiAutofill).mockResolvedValue({
      allowed: true,
      quota: {} as Awaited<
        ReturnType<typeof consumeCustomerAiAutofill>
      >["quota"],
    });
    vi.mocked(extractCustomerFromText).mockResolvedValue({
      data: {
        customer: { firstName: "Cliente", lastName: "Token" },
        confidence: 0.95,
        warnings: [],
      },
    });
    vi.mocked(enrichCustomerPostalCode).mockResolvedValue({
      customer: { firstName: "Cliente", lastName: "Token" },
      confidence: 0.95,
      warnings: [],
    });

    const response = await POST(
      request("token-real", {
        userId: "otro-usuario",
        plan: "pro",
        text: "Cliente Token SL Calle Mayor 1 Barcelona",
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchUserSubscriptionServer).toHaveBeenCalledWith("token-user");
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalledWith("otro-usuario");
    expect(consumeCustomerAiAutofill).toHaveBeenCalledWith("token-user");
  });

  it("rechaza suscripcion inexistente", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-without-subscription",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(null);

    const response = await POST(
      request("token-no-sub", {
        text: "Cliente Sin Suscripcion SL Calle Mayor 1 Barcelona",
      }),
    );

    expect(response.status).toBe(402);
    expect(consumeCustomerAiAutofill).not.toHaveBeenCalled();
  });

  it("devuelve error temporal si no puede registrar el consumo IA", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      proSubscription("user-pro"),
    );
    vi.mocked(consumeCustomerAiAutofill).mockResolvedValue({
      allowed: false,
      reason:
        "No hemos podido descontar el uso de IA. Inténtalo de nuevo en unos minutos.",
      quota: {} as Awaited<
        ReturnType<typeof consumeCustomerAiAutofill>
      >["quota"],
      blockedByQuota: false,
    });

    const response = await POST(
      request("token-pro", {
        text: "Cliente Pro SL Calle Mayor 1 Barcelona",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).not.toContain("Supabase");
    expect(extractCustomerFromText).not.toHaveBeenCalled();
  });
});
