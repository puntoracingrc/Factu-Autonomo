import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: mocks.auth,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: mocks.rateLimit,
  rateLimitExceededResponse: mocks.rateLimitResponse,
}));

import { POST } from "./route";

function request(): Request {
  return new Request("http://localhost/api/verifactu/register", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ id: "user-test" });
  mocks.rateLimit.mockResolvedValue({ allowed: true });
});

describe("POST /api/verifactu/register containment", () => {
  it("exige sesión confirmada antes de responder", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.rateLimit).not.toHaveBeenCalled();
  });

  it("mantiene el límite de abuso aunque la función esté cerrada", async () => {
    const limited = new Response("limit", { status: 429 });
    mocks.rateLimit.mockResolvedValue({ allowed: false });
    mocks.rateLimitResponse.mockReturnValue(limited);

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("no ofrece ningún camino latente de registro", async () => {
    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error:
        "El registro VeriFactu no está habilitado hasta completar los controles fiscales de servidor.",
    });
    expect(response.headers.get("vary")).toBe("Authorization");
  });

  it("rechaza cuerpos declarados grandes sin procesarlos", async () => {
    const oversized = new Request(
      "http://localhost/api/verifactu/register",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test",
          "Content-Length": "2048",
        },
      },
    );

    const response = await POST(oversized);

    expect(response.status).toBe(413);
  });
});
