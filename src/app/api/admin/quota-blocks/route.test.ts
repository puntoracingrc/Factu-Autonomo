import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  rateLimitExceededResponse: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function request(days = 7) {
  return new Request(
    `http://localhost/api/admin/quota-blocks?days=${days}&limit=100`,
    { headers: { Authorization: "Bearer admin" } },
  );
}

function adminWithRows(rows: unknown[], count = rows.length) {
  const limit = vi.fn(async () => ({ data: rows, error: null, count }));
  const order = vi.fn(() => ({ limit }));
  const gte = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ gte }));
  const from = vi.fn(() => ({ select }));
  const getUserById = vi.fn(async () => ({
    data: { user: { email: "free@example.test" } },
    error: null,
  }));
  return { from, auth: { admin: { getUserById } }, getUserById };
}

describe("GET /api/admin/quota-blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "admin-1" },
    } as never);
  });

  it("exige una cuenta administradora antes de consultar Supabase", async () => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
      }),
    } as never);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("muestra la cuenta y el motivo sin exponer ids de fichas", async () => {
    const admin = adminWithRows([
      {
        id: "22222222-2222-4222-8222-222222222222",
        user_id: "11111111-1111-4111-8111-111111111111",
        metric: "customers",
        plan: "free",
        period_key: "lifetime",
        current_usage: 15,
        included_limit: 15,
        effective_limit: 15,
        credit_balance: 0,
        capacity_bonus: 0,
        reset_at: null,
        source: "automatic_customer",
        created_at: "2026-08-26T12:00:00.000Z",
      },
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const response = await GET(request(30));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      monitoringAvailable: true,
      rangeDays: 30,
      total: 1,
      uniqueAccounts: 1,
      byMetric: { customers: 1 },
      events: [
        {
          metric: "customers",
          source: "automatic_customer",
          account: { email: "free@example.test" },
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("user_id");
    expect(JSON.stringify(body)).not.toContain("subject_id");
  });

  it("mantiene la misma clave anónima para eventos de una misma cuenta", async () => {
    const shared = {
      user_id: "11111111-1111-4111-8111-111111111111",
      plan: "free",
      period_key: "2026-08",
      current_usage: 15,
      included_limit: 15,
      effective_limit: 15,
      credit_balance: 0,
      capacity_bonus: 0,
      reset_at: "2026-08-31T22:00:00.000Z",
      source: "app",
      created_at: "2026-08-26T12:00:00.000Z",
    };
    const admin = adminWithRows([
      {
        ...shared,
        id: "22222222-2222-4222-8222-222222222222",
        metric: "documents",
      },
      {
        ...shared,
        id: "33333333-3333-4333-8333-333333333333",
        metric: "manual_expenses",
      },
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const response = await GET(request());
    const body = await response.json();

    expect(body.events[0].account.key).toBe("account-1");
    expect(body.events[1].account.key).toBe("account-1");
    expect(admin.getUserById).toHaveBeenCalledTimes(1);
  });
});
