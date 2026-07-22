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
  resetAt: Date.parse("2026-07-22T16:10:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

function request() {
  return new Request("http://localhost/api/admin/expense-learning-insights", {
    headers: { Authorization: "Bearer token" },
  });
}

function metric(overrides: Record<string, unknown> = {}) {
  return {
    contribution_schema_version: "expense-engine-aggregate-contribution.v1",
    observation_schema_version: "expense-engine-observation.v1",
    engine_version: "expense-local-engine.v1",
    privacy_policy_version: "2026-07-21",
    week_start: "2026-07-06",
    structural_archetype_group: "TABLE",
    metric_family: "HUMAN_REVIEW",
    comparison_scope: "NONE",
    metric_key: "VALUE",
    bucket_kind: "EXACT",
    bucket_value: "CONFIRMED",
    support_band: "K10_19",
    promoted_at: "2026-07-13T00:00:00+00:00",
    expires_at: "2027-08-13T00:00:00+00:00",
    ...overrides,
  };
}

function adminRpc(data: unknown, error: unknown = null) {
  return { rpc: vi.fn().mockResolvedValue({ data, error }) };
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
  expect(response.headers.get("vary")).toBe("Authorization");
}

describe("GET /api/admin/expense-learning-insights", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T16:00:00.000Z"));
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

  it("rejects non-admin access before touching Supabase", async () => {
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

  it("applies the distributed rate limit before opening the Admin client", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      ...ALLOWED_RATE_LIMIT,
      allowed: false,
      remaining: 0,
    });

    const response = await GET(request());

    expect(response.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "admin_expense_learning_insights",
        limit: 60,
        windowMs: 10 * 60_000,
      },
      "admin-1",
    );
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expectPrivateHeaders(response);
  });

  it("returns only promoted bands without identities or exact support counts", async () => {
    const store = adminRpc([
      metric(),
      metric({ bucket_value: "CORRECTED" }),
      metric({
        week_start: "2026-06-29",
        structural_archetype_group: "SUMMARY",
        bucket_kind: "COARSENED_OTHER",
        bucket_value: "OTHER",
        support_band: "K20_49",
        promoted_at: "2026-07-06T00:00:00+00:00",
        expires_at: "2027-08-06T00:00:00+00:00",
      }),
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(store as never);

    const response = await GET(request());
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.schemaVersion).toBe("expense-learning-admin-insights.v1");
    expect(body.metrics).toHaveLength(3);
    expect(body.metrics[0]).toEqual({
      weekStart: "2026-07-06",
      structuralArchetypeGroup: "TABLE",
      bucketKind: "EXACT",
      bucketValue: "CONFIRMED",
      supportBand: "K10_19",
      promotedAt: "2026-07-13T00:00:00.000Z",
      expiresAt: "2027-08-13T00:00:00.000Z",
    });
    expect(store.rpc).toHaveBeenCalledWith(
      "read_expense_learning_closed_week_metrics_v1",
    );
    for (const forbidden of [
      "user_id",
      "document",
      "contributor",
      "supporting_contributors",
      "claim",
      "hmac",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expectPrivateHeaders(response);
  });

  it("fails closed on malformed or composition-inconsistent rows", async () => {
    const malformedRows = [
      [metric({ supporting_contributors: 10 })],
      [metric({ bucket_value: "OTHER" })],
      [
        metric({ bucket_kind: "COARSENED_OTHER", bucket_value: "OTHER" }),
        metric({ bucket_value: "CONFIRMED" }),
      ],
      Array.from({ length: 1025 }, () => metric()),
    ];

    for (const rows of malformedRows) {
      vi.mocked(getSupabaseAdmin).mockReturnValue(adminRpc(rows) as never);
      const response = await GET(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "No se pudieron cargar las métricas agregadas.",
      });
      expectPrivateHeaders(response);
    }
  });

  it("converges RPC errors, missing configuration, and thrown capabilities", async () => {
    const cases = [
      () => vi.mocked(getSupabaseAdmin).mockReturnValue(null),
      () =>
        vi
          .mocked(getSupabaseAdmin)
          .mockReturnValue(adminRpc(null, { code: "PGRST202" }) as never),
      () => vi.mocked(getSupabaseAdmin).mockImplementation(() => {
        throw new Error("secret detail");
      }),
    ];

    for (const configure of cases) {
      configure();
      const response = await GET(request());
      const serialized = JSON.stringify(await response.json());
      expect(response.status).toBe(503);
      expect(serialized).toBe(
        JSON.stringify({
          error: "No se pudieron cargar las métricas agregadas.",
        }),
      );
      expect(serialized).not.toContain("PGRST202");
      expect(serialized).not.toContain("secret detail");
      expectPrivateHeaders(response);
    }
  });
});
