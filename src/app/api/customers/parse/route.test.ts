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

  it("resuelve localmente sin consultar plan, consumir cuota ni llamar a OpenAI", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await POST(
      request("token-pro", {
        text: [
          "Laura Pruebas Garcia",
          "NIF 00000000T",
          "laura@example.test",
          "Calle Mayor 1, 28013 Madrid",
        ].join("\n"),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("local");
    expect(body.data.customer.firstName).toBe("Laura");
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalled();
    expect(consumeCustomerAiAutofill).not.toHaveBeenCalled();
    expect(extractCustomerFromText).not.toHaveBeenCalled();
    expect(enrichCustomerPostalCode).not.toHaveBeenCalled();
  });

  it("autoriza a un usuario Pro autenticado cuando pide fallback IA explicito", async () => {
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
        customer: { customerType: "person", firstName: "Cliente", lastName: "Pro" },
        confidence: 0.95,
        warnings: [],
      },
    });
    vi.mocked(enrichCustomerPostalCode).mockResolvedValue({
      customer: {
        customerType: "person",
        firstName: "Cliente",
        lastName: "Pro",
        postalCode: "08017",
      },
      confidence: 0.95,
      warnings: [],
    });

    const response = await POST(
      request("token-pro", {
        text: "Calle Mayor 1, Barcelona, sin nombre claro",
        allowAi: true,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("ai");
    expect(body.data.customer.firstName).toBe("Cliente");
    expect(fetchUserSubscriptionServer).toHaveBeenCalledWith("user-pro");
    expect(consumeCustomerAiAutofill).toHaveBeenCalledWith("user-pro");
  });

  it("permite relleno local a un usuario gratuito sin consumo IA", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-free",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await POST(
      request("token-free", {
        text: "Cliente: Taller Demo SL\nCIF B12345678\nCalle Mayor 1, 28013 Madrid",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("local");
    expect(body.data.customer.firstName).toBe("Taller Demo SL");
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalled();
    expect(consumeCustomerAiAutofill).not.toHaveBeenCalled();
    expect(extractCustomerFromText).not.toHaveBeenCalled();
  });

  it("rechaza a un usuario gratuito cuando pide fallback IA", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-free",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      freeSubscription("user-free"),
    );

    const response = await POST(
      request("token-free", {
        text: "Calle Mayor 1, Barcelona, sin nombre claro",
        allowAi: true,
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

  it("falla cerrado en produccion aunque billing este desactivado", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(
      new Request("https://facturacion-autonomos.app/api/customers/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{json-no-valido",
      }),
    );

    expect(response.status).toBe(401);
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalled();
    expect(consumeCustomerAiAutofill).not.toHaveBeenCalled();
    expect(extractCustomerFromText).not.toHaveBeenCalled();
    expect(enrichCustomerPostalCode).not.toHaveBeenCalled();
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
        customer: {
          customerType: "person",
          firstName: "Cliente",
          lastName: "Token",
        },
        confidence: 0.95,
        warnings: [],
      },
    });
    vi.mocked(enrichCustomerPostalCode).mockResolvedValue({
      customer: {
        customerType: "person",
        firstName: "Cliente",
        lastName: "Token",
      },
      confidence: 0.95,
      warnings: [],
    });

    const response = await POST(
      request("token-real", {
        userId: "otro-usuario",
        plan: "pro",
        text: "Calle Mayor 1, Barcelona, sin nombre claro",
        allowAi: true,
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
        text: "Calle Mayor 1, Barcelona, sin nombre claro",
        allowAi: true,
      }),
    );

    expect(response.status).toBe(402);
    expect(consumeCustomerAiAutofill).not.toHaveBeenCalled();
  });

  it("mantiene el autorrelleno Pro si falla temporalmente el registro de uso IA", async () => {
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
    vi.mocked(extractCustomerFromText).mockResolvedValue({
      data: {
        customer: { customerType: "person", firstName: "Cliente", lastName: "Pro" },
        confidence: 0.9,
        warnings: [],
      },
    });
    vi.mocked(enrichCustomerPostalCode).mockResolvedValue({
      customer: { customerType: "person", firstName: "Cliente", lastName: "Pro" },
      confidence: 0.9,
      warnings: [],
    });

    const response = await POST(
      request("token-pro", {
        text: "Calle Mayor 1, Barcelona, sin nombre claro",
        allowAi: true,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.customer.firstName).toBe("Cliente");
    expect(body.usageWarning).not.toContain("Supabase");
    expect(extractCustomerFromText).toHaveBeenCalled();
  });
});
