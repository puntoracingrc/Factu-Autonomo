import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));
vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(
    () => new Response(JSON.stringify({ error: "limit" }), { status: 429 }),
  ),
}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function request() {
  return new Request("http://localhost/api/support/recovery-tools", {
    headers: { Authorization: "Bearer user-token" },
  });
}

function queryBuilder(result: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => result),
  };
  return builder;
}

describe("support recovery tools route", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as never);
  });

  afterEach(() => vi.resetAllMocks());

  it("rechaza una sesión no autenticada sin abrir el cliente admin", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("consulta solo el usuario autenticado y no expone datos internos", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    const builder = queryBuilder({
      data: [
        {
          id: "grant-1",
          user_id: "user-1",
          tool_id: "local_backup_restore",
          granted_by: "admin-secret-id",
          granted_at: "2026-08-26T10:00:00.000Z",
          expires_at: "2099-08-26T11:00:00.000Z",
          reason: "Motivo interno privado",
          revoked_at: null,
          revoked_by: null,
          revocation_reason: null,
        },
      ],
      error: null,
    });
    const from = vi.fn(() => builder);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(getUserFromBearer).toHaveBeenCalledWith("Bearer user-token", {
      requireEmailConfirmed: true,
    });
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(body.grants).toEqual([
      {
        id: "grant-1",
        toolId: "local_backup_restore",
        grantedAt: "2026-08-26T10:00:00.000Z",
        expiresAt: "2099-08-26T11:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("admin-secret-id");
    expect(JSON.stringify(body)).not.toContain("Motivo interno privado");
  });
});
