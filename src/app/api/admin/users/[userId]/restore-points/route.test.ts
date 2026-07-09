import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { isAdminUser } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { EMPTY_DATA } from "@/lib/types";

vi.mock("@/lib/admin/access", () => ({
  isAdminUser: vi.fn(),
}));

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const params = { params: Promise.resolve({ userId: "user-1" }) };

function request(body?: unknown) {
  return new Request("http://localhost/api/admin/users/user-1/restore-points", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function asyncBuilder(result: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => result),
    range: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    insert: vi.fn(() => builder),
    upsert: vi.fn(async () => ({ error: null })),
  };
  return builder;
}

describe("admin user restore points route", () => {
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

  it("rechaza cuentas no admin", async () => {
    vi.mocked(isAdminUser).mockReturnValue(false);

    const response = await GET(request(), params);

    expect(response.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("no restaura si no se confirma el email exacto", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const syncBuilder = asyncBuilder({ data: [], error: null });
    syncBuilder.upsert = upsert;
    const restorePointBuilder = asyncBuilder({
      data: {
        id: "restore-1",
        user_id: "user-1",
        created_at: "2026-07-09T08:00:00.000Z",
        created_by: "admin-1",
        label: "Copia",
        reason: null,
        source: "admin_manual",
        summary: {},
        data: {
          ...EMPTY_DATA,
          customers: [
            {
              id: "customer-1",
              firstName: "Ana",
              lastName: "",
              name: "Ana",
              createdAt: "2026-07-01T10:00:00.000Z",
              updatedAt: "2026-07-01T10:00:00.000Z",
            },
          ],
        },
      },
      error: null,
    });
    const from = vi.fn((table: string) =>
      table === "sync_entities" ? syncBuilder : restorePointBuilder,
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { email: "cliente@example.com" } },
            error: null,
          })),
        },
      },
      from,
    } as never);

    const response = await POST(
      request({
        action: "restore",
        restorePointId: "restore-1",
        confirmEmail: "otro@example.com",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("email exacto");
    expect(upsert).not.toHaveBeenCalled();
  });
});
