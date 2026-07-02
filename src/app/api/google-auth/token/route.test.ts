import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/google-auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Google Auth token route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID: "google-auth-client-id",
      GOOGLE_AUTH_CLIENT_SECRET: "google-auth-client-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("intercambia un codigo de Google por id token", async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(
        JSON.stringify({
          id_token: "id-token",
          access_token: "access-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ code: "oauth-code" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      idToken: "id-token",
      accessToken: "access-token",
    });

    const init = fetchMock.mock.calls[0]?.[1];
    const params = init?.body as URLSearchParams;
    expect(params.get("code")).toBe("oauth-code");
    expect(params.get("client_id")).toBe("google-auth-client-id");
    expect(params.get("redirect_uri")).toBe("postmessage");
    expect(params.get("grant_type")).toBe("authorization_code");
  });

  it("rechaza respuestas sin token de identidad", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: "access-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ code: "oauth-code" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Google no ha autorizado el inicio de sesión.",
    });
  });

  it("no habla con Google si falta el secreto", async () => {
    process.env.GOOGLE_AUTH_CLIENT_SECRET = "";
    process.env.GOOGLE_DRIVE_CLIENT_SECRET = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ code: "oauth-code" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Google Login no está configurado en el servidor.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
