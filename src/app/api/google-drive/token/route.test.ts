import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { POST } from "./route";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

function makeRequest(
  body: unknown,
  authorization = "Bearer test-token",
): Request {
  return new Request("http://localhost:3000/api/google-drive/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("Google Drive token route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_APP_URL: "https://facturacion-autonomos.app",
      NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID: "google-client-id",
      GOOGLE_DRIVE_CLIENT_SECRET: "google-client-secret",
    };
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-1",
      email: "ana@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("intercambia un codigo valido de una URL propia", async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(
        JSON.stringify({
          access_token: "access-token",
          expires_in: 1800,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({
        code: "oauth-code",
        redirectUri: "https://facturacion-autonomos.app/drive/callback",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      accessToken: "access-token",
      expiresIn: 1800,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    const init = fetchMock.mock.calls[0]?.[1];
    const params = init?.body as URLSearchParams;
    expect(params.get("code")).toBe("oauth-code");
    expect(params.get("client_id")).toBe("google-client-id");
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(getUserFromBearer).toHaveBeenCalledWith("Bearer test-token", {
      requireEmailConfirmed: true,
    });
  });

  it("acepta el callback local permitido para pruebas en navegador", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: "local-access-token",
          expires_in: 900,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({
        code: "local-oauth-code",
        redirectUri: "http://localhost:3001/drive/callback",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      accessToken: "local-access-token",
      expiresIn: 900,
    });
  });

  it("rechaza callbacks externos", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({
        code: "oauth-code",
        redirectUri: "https://evil.example/drive/callback",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "El retorno de Google Drive no es válido.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza peticiones sin cuenta confirmada", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest(
        {
          code: "oauth-code",
          redirectUri: "https://facturacion-autonomos.app/drive/callback",
        },
        "",
      ),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: EMAIL_CONFIRMATION_REQUIRED_MESSAGE,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no intenta hablar con Google si falta configuracion del servidor", async () => {
    process.env.GOOGLE_DRIVE_CLIENT_SECRET = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({
        code: "oauth-code",
        redirectUri: "https://facturacion-autonomos.app/drive/callback",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Google Drive no está configurado en el servidor.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
