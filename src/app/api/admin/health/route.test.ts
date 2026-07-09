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
  });

  it("degrada con mensaje si falta la migracion", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      rpc: vi.fn(async () => ({
        data: null,
        error: {
          code: "PGRST202",
          message: "Could not find the function admin_health_snapshot",
        },
      })),
    } as never);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.monitoringAvailable).toBe(false);
  });
});
