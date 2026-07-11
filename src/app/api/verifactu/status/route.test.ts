import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { GET } from "./route";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(() =>
    Response.json({ error: "rate_limited" }, { status: 429 }),
  ),
}));

function request(authorization?: string) {
  return new Request("http://localhost/api/verifactu/status", {
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

describe("GET /api/verifactu/status", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("rechaza peticiones sin bearer verificado", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sesión requerida" });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Authorization");
  });

  it("devuelve únicamente el modo desactivado sin inferir configuración", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-1",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await GET(request("Bearer test-token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ submissionMode: "disabled" });
    expect(JSON.stringify(body)).not.toMatch(
      /software|producer|developer|nif|address|certificate|channel|host|config|test|production|simulated/i,
    );
    expect(getUserFromBearer).toHaveBeenCalledWith("Bearer test-token", {
      requireEmailConfirmed: true,
    });
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ namespace: "verifactu_status" }),
      "user-1",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Authorization");
  });

  it("conserva cabeceras privadas también al limitar", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-1",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 120,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });

    const response = await GET(request("Bearer test-token"));

    expect(response.status).toBe(429);
    expect(rateLimitExceededResponse).toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Authorization");
  });
});
