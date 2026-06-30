import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/server-repository", () => ({
  fetchUserSubscriptionServer: vi.fn(),
}));

function request(token: string | null = "token-pro") {
  return new Request("http://localhost/api/reminders/realtime-session", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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

function mockOpenAiSession(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("POST /api/reminders/realtime-session", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("crea una sesion efimera para un usuario Pro", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      proSubscription("user-pro"),
    );
    const fetchMock = mockOpenAiSession(
      Response.json({
        client_secret: {
          value: "ek_test_secret",
          expires_at: 1_782_800_000,
        },
      }),
    );

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.clientSecret).toBe("ek_test_secret");
    expect(payload.expiresAt).toBe(1_782_800_000);
    expect(payload.model).toBe("gpt-realtime-whisper");
    expect(fetchUserSubscriptionServer).toHaveBeenCalledWith("user-pro");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/realtime/client_secrets",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test-key",
          "Content-Type": "application/json",
        }),
      }),
    );
    const body = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(body).toMatchObject({
      session: {
        type: "transcription",
        audio: {
          input: {
            transcription: {
              model: "gpt-realtime-whisper",
              language: "es",
              delay: "low",
            },
          },
        },
      },
    });
  });

  it("rechaza a un usuario gratis sin llamar a OpenAI", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-free",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      freeSubscription("user-free"),
    );
    const fetchMock = mockOpenAiSession(Response.json({}));

    const response = await POST(request());

    expect(response.status).toBe(402);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza token ausente cuando billing esta activo", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.mocked(getUserFromBearer).mockResolvedValue(null);
    const fetchMock = mockOpenAiSession(Response.json({}));

    const response = await POST(request(null));

    expect(response.status).toBe(401);
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("informa si falta la clave del servidor", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      proSubscription("user-pro"),
    );
    const fetchMock = mockOpenAiSession(Response.json({}));

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propaga como error seguro un fallo de OpenAI", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-pro",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(
      proSubscription("user-pro"),
    );
    mockOpenAiSession(
      Response.json({ error: { message: "bad secret" } }, { status: 500 }),
    );

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error).toBe("No se pudo iniciar la voz IA. Inténtalo de nuevo.");
  });

  it("permite desarrollo local sin billing ni sesion", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.mocked(getUserFromBearer).mockResolvedValue(null);
    const fetchMock = mockOpenAiSession(
      Response.json({ value: "ek_dev_secret", expires_at: 1_782_800_000 }),
    );

    const response = await POST(request(null));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.clientSecret).toBe("ek_dev_secret");
    expect(fetchUserSubscriptionServer).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
  });
});
