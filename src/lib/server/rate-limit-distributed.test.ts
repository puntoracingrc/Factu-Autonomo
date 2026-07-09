import { afterEach, describe, expect, it, vi } from "vitest";

function request() {
  return new Request("https://facturacion-autonomos.app/api/test", {
    headers: { "x-forwarded-for": "203.0.113.50" },
  });
}

describe("distributed server rate limit", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses Supabase when the distributed backend is enabled", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          allowed: false,
          limit_count: 10,
          remaining_count: 0,
          reset_at: "2026-07-09T10:00:30.000Z",
          retry_after_seconds: 30,
        },
      ],
      error: null,
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      getSupabaseAdmin: () => ({ rpc }),
    }));
    vi.stubEnv("SERVER_RATE_LIMIT_BACKEND", "supabase");
    vi.stubEnv("SERVER_RATE_LIMIT_SALT", "test-salt");

    const { checkRateLimit } = await import("./rate-limit");
    const result = await checkRateLimit(request(), {
      namespace: "uploads",
      limit: 10,
      windowMs: 60_000,
    });

    expect(result.backend).toBe("supabase");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(30);
    expect(rpc).toHaveBeenCalledWith(
      "claim_rate_limit_bucket",
      expect.objectContaining({
        p_limit: 10,
        p_namespace: "uploads",
        p_window_ms: 60_000,
      }),
    );
  });

  it("falls back to memory if Supabase is unavailable", async () => {
    vi.doMock("@/lib/supabase/admin", () => ({
      getSupabaseAdmin: () => null,
    }));
    vi.stubEnv("SERVER_RATE_LIMIT_BACKEND", "supabase");

    const { checkRateLimit } = await import("./rate-limit");
    const result = await checkRateLimit(request(), {
      namespace: "uploads",
      limit: 10,
      windowMs: 60_000,
    });

    expect(result.backend).toBe("memory");
    expect(result.allowed).toBe(true);
  });
});
