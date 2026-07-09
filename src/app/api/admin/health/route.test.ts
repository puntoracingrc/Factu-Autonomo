import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { isAdminUser } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/admin/access", () => ({
  isAdminUser: vi.fn(),
}));

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function request() {
  return new Request("http://localhost/api/admin/health", {
    headers: { Authorization: "Bearer token" },
  });
}

function rateLimitBucketFromMock(rows: Array<Record<string, unknown>> = []) {
  return {
    select: vi.fn(() => ({
      gte: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: rows,
            error: null,
          })),
        })),
      })),
    })),
  };
}

describe("GET /api/admin/health", () => {
  beforeEach(() => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(isAdminUser).mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("requiere sesion admin", async () => {
    vi.mocked(isAdminUser).mockReturnValue(false);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("devuelve resumen normalizado", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "server_rate_limit_buckets") {
          return rateLimitBucketFromMock([
            {
              namespace: "security_csp_report",
              request_count: 12,
              updated_at: "2026-07-09T08:05:00.000Z",
            },
            {
              namespace: "security_csp_report",
              request_count: 8,
              updated_at: "2026-07-09T08:10:00.000Z",
            },
          ]);
        }

        return rateLimitBucketFromMock();
      }),
      rpc: vi.fn(async () => ({
        data: {
          generatedAt: "2026-07-09T08:00:00.000Z",
          database: { bytes: 280_000_000, limitBytes: 8_589_934_592 },
          users: { total: 6, active7d: 3, active30d: 4, new7d: 1 },
          sync: {
            rows: 5_342,
            deletedRows: 109,
            cloudUsers: 2,
            updated24h: 38,
            updated7d: 420,
            activeUsers24h: 1,
            activeUsers7d: 2,
            latestSyncAt: "2026-07-09T06:03:00.000Z",
          },
          usage: { monthKey: "2026-07", documentsCreated: 10 },
          errors: { last24h: 0, last7d: 1 },
        },
        error: null,
      })),
    } as never);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.health.level).toBe("ok");
    expect(body.health.summary.syncRows).toBe(5342);
    expect(body.health.abuse.totalRequests).toBe(20);
    expect(body.health.abuse.namespaces[0].namespace).toBe("security_csp_report");
  });

  it("usa lectura alternativa si falta una pieza del esquema", async () => {
    const from = vi.fn((table: string) => {
      if (table === "server_rate_limit_buckets") {
        return rateLimitBucketFromMock([
          {
            namespace: "google_auth_token",
            request_count: 140,
            updated_at: new Date().toISOString(),
          },
        ]);
      }

      if (table === "sync_entities") {
        return {
          select: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: [
                {
                  user_id: "user-1",
                  entity_type: "documents",
                  deleted: false,
                  updated_at: new Date().toISOString(),
                },
              ],
              count: 1,
              error: null,
            })),
          })),
        };
      }

      if (table === "user_usage") {
        return {
          select: vi.fn((columns: string) => ({
            eq: vi.fn(async () => {
              if (columns.includes("customer_ai_autofills_created")) {
                return {
                  data: null,
                  error: {
                    code: "42703",
                    message:
                      "column customer_ai_autofills_created does not exist",
                  },
                };
              }

              return {
                data: [{ documents_created: 2, expense_scans_created: 1 }],
                error: null,
              };
            }),
          })),
        };
      }

      if (table === "app_error_events") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: null,
                error: {
                  code: "42P01",
                  message: "relation app_error_events does not exist",
                },
              })),
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [], error: null })),
        })),
      };
    });

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      rpc: vi.fn(async () => ({
        data: null,
        error: {
          code: "42703",
          message: "column uu.customer_ai_autofills_created does not exist",
        },
      })),
      from,
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({
            data: {
              users: [
                {
                  id: "user-1",
                  email: "cliente@example.com",
                  created_at: new Date().toISOString(),
                  last_sign_in_at: new Date().toISOString(),
                },
              ],
              total: 1,
            },
            error: null,
          })),
        },
      },
    } as never);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.monitoringAvailable).toBe(true);
    expect(body.degraded).toBe(true);
    expect(body.health.summary.syncRows).toBe(1);
    expect(body.health.abuse.level).toBe("action");
    expect(body.health.topUsers[0].email).toBe("cliente@example.com");
  });
});
