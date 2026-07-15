import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { checkRateLimit } from "@/lib/server/rate-limit";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(
    () => new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 }),
  ),
}));

function request() {
  return new Request("http://localhost/api/admin/vercel-usage", {
    headers: { Authorization: "Bearer token" },
  });
}

describe("GET /api/admin/vercel-usage", () => {
  beforeEach(() => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "admin-1", email: "admin@example.com" },
    } as Awaited<ReturnType<typeof getAdminAccessFromRequest>>);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 0,
      backend: "memory",
    } as Awaited<ReturnType<typeof checkRateLimit>>);
    vi.stubEnv("VERCEL_BILLING_CYCLE_START_DAY", "15");
    vi.stubEnv("VERCEL_BILLING_CYCLE_START_HOUR", "9");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("devuelve pendiente si faltan credenciales privadas", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.configured).toBe(false);
    expect(body.vercel).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lee Vercel y devuelve snapshot seguro", async () => {
    vi.stubEnv("VERCEL_BILLING_API_TOKEN", "vercel-test-token");
    vi.stubEnv("VERCEL_TEAM_ID", "team_test");
    vi.stubEnv("VERCEL_USAGE_PROJECT_SLUG", "factu-autonomo");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const jsonl = [
          {
            ServiceName: "Fluid Active CPU",
            ResourceName: "vercel-functions-fluid-cpu-duration",
            BilledCost: 15.32,
            Tags: { ProjectName: "regionatlas" },
          },
          {
            ServiceName: "Function Invocations",
            ResourceName: "vercel-functions-invocations",
            BilledCost: 0.31,
            Tags: { ProjectName: "factu-autonomo" },
          },
        ]
          .map((row) => JSON.stringify(row))
          .join("\n");
        return new Response(jsonl, { status: 200 });
      }),
    );

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.configured).toBe(true);
    expect(body.vercel.summary.totalCostUsd).toBe(15.63);
    expect(body.vercel.summary.primaryProjectSlug).toBe("factu-autonomo");
    expect(body.vercel.topProjects[0].project).toBe("regionatlas");
  });
});
