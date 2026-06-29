import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { consumeImportAiReview } from "@/lib/billing/scan-usage-server";
import { reviewImportWithAi } from "@/lib/import-ai/review";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/server-repository", () => ({
  fetchUserSubscriptionServer: vi.fn(),
}));

vi.mock("@/lib/billing/scan-usage-server", () => ({
  consumeImportAiReview: vi.fn(),
}));

vi.mock("@/lib/import-ai/review", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/import-ai/review")>();
  return {
    ...actual,
    reviewImportWithAi: vi.fn(),
  };
});

function request(token: string | null, body: Record<string, unknown>) {
  return new Request("http://localhost/api/imports/review", {
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

function body() {
  return {
    sourceName: "Holded",
    confidenceLabel: "fixture_inferido",
    summary: {
      customers: 12,
      invoices: 8,
      expenses: 3,
      dateRange: "2026-01-01 a 2026-06-30",
    },
    warnings: ["2 documentos tienen totales a revisar."],
    unsupported: [
      {
        label: "Adjuntos",
        reason: "Se conservan como referencia, no se importan todavía.",
        count: 2,
      },
    ],
  };
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

describe("POST /api/imports/review", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("permite revisar una importacion a un usuario Pro", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      proSubscription("user-pro"),
    );
    vi.mocked(consumeImportAiReview).mockResolvedValue({
      allowed: true,
      quota: {} as Awaited<ReturnType<typeof consumeImportAiReview>>["quota"],
    });
    vi.mocked(reviewImportWithAi).mockResolvedValue({
      data: {
        overallConfidence: "media",
        verdict: "Importacion razonable, revisa adjuntos.",
        improvements: [],
        risks: [],
        questions: [],
        recommendedAction: "revisar",
      },
    });

    const response = await POST(request("token-pro", body()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.verdict).toContain("Importacion razonable");
    expect(fetchUserSubscriptionServer).toHaveBeenCalledWith("user-pro");
    expect(consumeImportAiReview).toHaveBeenCalledWith("user-pro");
    expect(reviewImportWithAi).toHaveBeenCalledWith(
      expect.objectContaining({ sourceName: "Holded" }),
    );
  });

  it("rechaza usuario gratuito sin consumir saldo IA", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-free",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      freeSubscription("user-free"),
    );

    const response = await POST(request("token-free", body()));

    expect(response.status).toBe(402);
    expect(consumeImportAiReview).not.toHaveBeenCalled();
    expect(reviewImportWithAi).not.toHaveBeenCalled();
  });

  it("si no puede descontar IA no llama al proveedor IA", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      proSubscription("user-pro"),
    );
    vi.mocked(consumeImportAiReview).mockResolvedValue({
      allowed: false,
      reason:
        "No hemos podido descontar el uso de IA. Inténtalo de nuevo en unos minutos.",
      quota: {} as Awaited<ReturnType<typeof consumeImportAiReview>>["quota"],
      blockedByQuota: false,
    });

    const response = await POST(request("token-pro", body()));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).not.toContain("Supabase");
    expect(reviewImportWithAi).not.toHaveBeenCalled();
  });
});
