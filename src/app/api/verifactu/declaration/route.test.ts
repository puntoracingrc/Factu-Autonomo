import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { GET } from "./route";

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(() =>
    Response.json({ error: "rate_limited" }, { status: 429 }),
  ),
}));

function request() {
  return new Request("http://localhost/api/verifactu/declaration");
}

describe("GET /api/verifactu/declaration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });
  });

  it("no publica el borrador interno ni datos operativos", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ status: "draft_not_published" });
    expect(JSON.stringify(body)).not.toMatch(
      /declaration|statement|producer|developer|nif|address|environment|submit/i,
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("mantiene la misma contención al limitar", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 120,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });

    const response = await GET(request());

    expect(response.status).toBe(429);
    expect(rateLimitExceededResponse).toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });
});
