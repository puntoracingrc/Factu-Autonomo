import { beforeEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  resetRateLimitBucketsForTests,
} from "./rate-limit";

describe("server rate limit", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
  });

  function request(ip = "203.0.113.10") {
    return new Request("https://facturacion-autonomos.app/api/test", {
      headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
    });
  }

  function vercelRequest(vercelIp: string, forwardedIp: string) {
    return new Request("https://facturacion-autonomos.app/api/test", {
      headers: {
        "x-forwarded-for": forwardedIp,
        "x-vercel-forwarded-for": `${vercelIp}, 10.0.0.1`,
      },
    });
  }

  it("allows requests until the policy limit is exceeded", () => {
    const policy = { namespace: "test", limit: 2, windowMs: 60_000 };

    expect(checkRateLimit(request(), policy, null, 1_000).allowed).toBe(true);
    expect(checkRateLimit(request(), policy, null, 2_000).allowed).toBe(true);
    const third = checkRateLimit(request(), policy, null, 3_000);

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterSeconds).toBe(58);
  });

  it("resets the bucket after the window expires", () => {
    const policy = { namespace: "test", limit: 1, windowMs: 10_000 };

    expect(checkRateLimit(request(), policy, null, 1_000).allowed).toBe(true);
    expect(checkRateLimit(request(), policy, null, 2_000).allowed).toBe(false);
    expect(checkRateLimit(request(), policy, null, 12_000).allowed).toBe(true);
  });

  it("separates buckets by namespace and subject", () => {
    const policy = { namespace: "uploads", limit: 1, windowMs: 10_000 };
    const otherPolicy = { namespace: "email", limit: 1, windowMs: 10_000 };

    expect(checkRateLimit(request(), policy, "user-a", 1_000).allowed).toBe(
      true,
    );
    expect(checkRateLimit(request(), policy, "user-a", 1_001).allowed).toBe(
      false,
    );
    expect(checkRateLimit(request(), policy, "user-b", 1_002).allowed).toBe(
      true,
    );
    expect(checkRateLimit(request(), otherPolicy, "user-a", 1_003).allowed).toBe(
      true,
    );
  });

  it("uses Vercel's forwarded IP header before generic forwarded values", () => {
    const policy = { namespace: "test", limit: 1, windowMs: 10_000 };

    expect(
      checkRateLimit(
        vercelRequest("198.51.100.10", "203.0.113.20"),
        policy,
        null,
        1_000,
      ).allowed,
    ).toBe(true);
    expect(
      checkRateLimit(
        vercelRequest("198.51.100.10", "203.0.113.30"),
        policy,
        null,
        1_001,
      ).allowed,
    ).toBe(false);
  });

  it("returns a safe 429 response with retry headers", async () => {
    const result = checkRateLimit(
      request(),
      { namespace: "test", limit: 0, windowMs: 60_000 },
      null,
      1_000,
    );
    const response = rateLimitExceededResponse(result);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("0");
    await expect(response.json()).resolves.toEqual({
      error: "Demasiados intentos. Prueba de nuevo en unos instantes.",
    });
  });
});
