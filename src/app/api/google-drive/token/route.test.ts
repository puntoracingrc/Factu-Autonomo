import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/google-drive/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  });

  afterEach(() => {
    process.env = originalEnv;
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
});
