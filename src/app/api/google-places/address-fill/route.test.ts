import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { consumeAddressAutofill } from "@/lib/billing/scan-usage-server";
import {
  hasUnlimitedAiAccessForCompany,
  unlimitedAiUsageResult,
} from "@/lib/billing/unlimited-ai-access";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/companies/server", () => ({
  getCompanyRouteAuthFromBearer: vi.fn(async (authorization: string | null) => {
    const user = await getUserFromBearer(authorization, {
      requireEmailConfirmed: true,
    });
    if (!user) return null;
    return {
      userId: user.id,
      actorUserId: user.id,
      billingUserId: user.id,
      companyId: user.id,
      sessionId: "test-session",
      userEmail: user.email ?? null,
    };
  }),
}));

vi.mock("@/lib/billing/server-repository", () => ({
  fetchUserSubscriptionServer: vi.fn(),
}));

vi.mock("@/lib/billing/scan-usage-server", () => ({
  consumeAddressAutofill: vi.fn(),
}));

vi.mock("@/lib/billing/unlimited-ai-access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/billing/unlimited-ai-access")>();
  return {
    ...actual,
    hasUnlimitedAiAccessForCompany: vi.fn(),
    unlimitedAiUsageResult: vi.fn(actual.unlimitedAiUsageResult),
  };
});

function request(token: string | null) {
  return new Request("http://localhost/api/google-places/address-fill", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function subscription(plan: "free" | "pro" | "pro_plus" | "trial") {
  return {
    userId: `user-${plan}`,
    plan,
    status: plan === "free" ? ("inactive" as const) : ("active" as const),
    currentPeriodEnd: null,
    trialEndsAt: null,
    scanTrialRemaining: 0,
    scanCredits: 0,
    aiCreditUnits: 0,
  };
}

describe("POST /api/google-places/address-fill", () => {
  beforeEach(() => {
    vi.mocked(hasUnlimitedAiAccessForCompany).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("rechaza token ausente cuando billing esta activo", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(request(null));

    expect(response.status).toBe(401);
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalled();
    expect(consumeAddressAutofill).not.toHaveBeenCalled();
  });

  it("falla cerrado en produccion antes de consultar plan o consumir cuota", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(request(null));

    expect(response.status).toBe(401);
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalled();
    expect(consumeAddressAutofill).not.toHaveBeenCalled();
  });

  it("rechaza usuarios gratuitos sin consumir credito", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-free",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      subscription("free"),
    );

    const response = await POST(request("token-free"));

    expect(response.status).toBe(402);
    expect(consumeAddressAutofill).not.toHaveBeenCalled();
  });

  it("consume credito para usuarios Pro", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(subscription("pro"));
    vi.mocked(consumeAddressAutofill).mockResolvedValue({
      allowed: true,
      quota: {} as Awaited<ReturnType<typeof consumeAddressAutofill>>["quota"],
    });

    const response = await POST(request("token-pro"));

    expect(response.status).toBe(200);
    expect(consumeAddressAutofill).toHaveBeenCalledWith("user-pro");
  });

  it("no consulta plan ni consume credito cuando la empresa tiene IA ilimitada", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-admin",
      email: "socio@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(hasUnlimitedAiAccessForCompany).mockResolvedValue(true);

    const response = await POST(request("token-admin"));

    expect(response.status).toBe(200);
    expect(hasUnlimitedAiAccessForCompany).toHaveBeenCalledWith({
      user: { email: "socio@example.com" },
      companyId: "user-admin",
    });
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalled();
    expect(consumeAddressAutofill).not.toHaveBeenCalled();
    expect(unlimitedAiUsageResult).toHaveBeenCalledOnce();
  });

  it("devuelve pago requerido si el usuario Pro no tiene saldo IA", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(subscription("pro"));
    vi.mocked(consumeAddressAutofill).mockResolvedValue({
      allowed: false,
      blockedByQuota: true,
      reason: "Te has quedado sin saldo IA.",
      quota: { plan: "pro" } as Awaited<
        ReturnType<typeof consumeAddressAutofill>
      >["quota"],
    });

    const response = await POST(request("token-pro"));
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body.error).toBe("Te has quedado sin saldo IA.");
  });
});
