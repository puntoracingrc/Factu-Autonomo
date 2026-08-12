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
        if (table === "central_business_entities") {
          return {
            select: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: [
                  {
                    user_id: "user-1",
                    entity_type: "customer",
                    deleted: false,
                    updated_at: "2026-07-09T06:03:00.000Z",
                  },
                  {
                    user_id: "user-1",
                    entity_type: "expense",
                    deleted: false,
                    updated_at: "2026-07-09T06:03:00.000Z",
                  },
                ],
                count: 2,
                error: null,
              })),
            })),
          };
        }
        if (table === "central_invoice_documents") {
          return {
            select: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: [
                  {
                    user_id: "user-1",
                    kind: "invoice",
                    lifecycle_status: "issued",
                    updated_at: "2026-07-09T06:03:00.000Z",
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
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: [], error: null })),
            })),
          };
        }
        if (table === "app_error_events") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          };
        }
        return rateLimitBucketFromMock();
      }),
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({
            data: {
              users: [
                {
                  id: "user-1",
                  email: "cliente@example.com",
                  created_at: "2026-07-01T08:00:00.000Z",
                  last_sign_in_at: "2026-07-09T08:00:00.000Z",
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
    expect(body.health.level).toBe("ok");
    expect(body.health.summary.syncRows).toBe(3);
    expect(body.health.abuse.totalRequests).toBe(20);
    expect(body.health.abuse.namespaces[0].namespace).toBe(
      "security_csp_report",
    );
  });

  it("tolera columnas de uso opcionales ausentes", async () => {
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

      if (table === "central_business_entities") {
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

      if (table === "central_invoice_documents") {
        return {
          select: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: [], count: 0, error: null })),
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
    expect(body.health.summary.syncRows).toBe(1);
    expect(body.health.abuse.level).toBe("action");
    expect(body.health.topUsers[0].email).toBe("cliente@example.com");
  });
});
