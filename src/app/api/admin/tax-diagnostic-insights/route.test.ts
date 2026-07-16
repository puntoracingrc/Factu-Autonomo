import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { checkRateLimit, type RateLimitResult } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET } from "./route";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/rate-limit")>(
    "@/lib/server/rate-limit",
  );
  return { ...actual, checkRateLimit: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const ALLOWED_RATE_LIMIT: RateLimitResult = {
  allowed: true,
  limit: 60,
  remaining: 59,
  resetAt: Date.parse("2026-07-16T10:10:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

function request() {
  return new Request("http://localhost/api/admin/tax-diagnostic-insights", {
    headers: { Authorization: "Bearer token" },
  });
}

function expectPrivateHeaders(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  );
  expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("x-robots-tag")).toBe(
    "noindex, nofollow, noarchive",
  );
}

function adminQuery(rows: Array<Record<string, unknown>>) {
  const query = {
    select: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  query.select.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lt.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return { from: vi.fn().mockReturnValue(query), query };
}

describe("GET /api/admin/tax-diagnostic-insights", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T10:00:00.000Z"));
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "admin-1" },
    } as never);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED_RATE_LIMIT);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it("rejects a normal user before reading any analytics row", async () => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Solo administradores" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    } as never);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expectPrivateHeaders(response);
  });

  it("returns only aggregates and never selects or exports subject identities", async () => {
    const store = adminQuery([
      {
        occurred_at: "2026-07-15T09:00:00.000Z",
        session_id: "22222222-2222-4222-8222-222222222222",
        event_type: "tax_diagnostic_started",
        engine_version: "engine.v1",
        ruleset_version: "rules.v1",
        fiscal_year: 2026,
        properties: { entryPoint: "DIRECT" },
      },
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(store as never);

    const response = await GET(request());
    const body = await response.json();
    const serialized = JSON.stringify(body);
    const selectedColumns = String(store.query.select.mock.calls[0]?.[0]);

    expect(response.status).toBe(200);
    expect(body.available).toBe(true);
    expect(body.report.funnel.started).toBe(1);
    expect(selectedColumns).not.toContain("anonymous_subject_id");
    expect(serialized).not.toContain("session_id");
    expect(serialized).not.toContain("22222222-2222-4222-8222-222222222222");
    expectPrivateHeaders(response);
  });
});
