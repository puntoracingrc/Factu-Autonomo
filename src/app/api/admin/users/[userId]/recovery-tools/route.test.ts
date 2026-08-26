import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
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

const params = { params: Promise.resolve({ userId: "user-1" }) };

function request(body?: unknown) {
  return new Request("http://localhost/api/admin/users/user-1/recovery-tools", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer admin-token",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function historyBuilder(result: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => result),
  };
  return builder;
}

describe("admin user recovery tools route", () => {
  beforeEach(() => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "admin-1", email: "admin@example.com" },
    } as Awaited<ReturnType<typeof getAdminAccessFromRequest>>);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as never);
  });

  afterEach(() => vi.resetAllMocks());

  it("rechaza antes de tocar Supabase cuando no hay acceso admin", async () => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Solo admin" }), {
        status: 403,
      }),
    } as never);

    const response = await GET(request(), params);

    expect(response.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("lista el historial de la cuenta indicada", async () => {
    const builder = historyBuilder({ data: [], error: null });
    const from = vi.fn(() => builder);
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { id: "user-1" } },
            error: null,
          })),
        },
      },
      from,
    } as never);

    const response = await GET(request(), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(body).toEqual({ grants: [], activeGrants: [] });
  });

  it("valida herramienta, duración y motivo antes de escribir", async () => {
    const from = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { id: "user-1" } },
            error: null,
          })),
        },
      },
      from,
    } as never);

    const response = await POST(
      request({
        action: "grant",
        toolId: "discarded_document_retirement",
        durationMinutes: 31,
        reason: "x",
      }),
      params,
    );

    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("crea una concesión auditada y revoca las anteriores", async () => {
    const inserted = {
      id: "grant-new",
      user_id: "user-1",
      tool_id: "legacy_import_repair",
      granted_by: "admin-1",
      granted_at: "2026-08-26T10:00:00.000Z",
      expires_at: "2026-08-26T10:30:00.000Z",
      reason: "Revisar importación histórica",
      revoked_at: null,
      revoked_by: null,
      revocation_reason: null,
    };
    const insertBuilder = {
      insert: vi.fn(() => insertBuilder),
      select: vi.fn(() => insertBuilder),
      single: vi.fn(async () => ({ data: inserted, error: null })),
    };
    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => updateBuilder),
      is: vi.fn(() => updateBuilder),
      neq: vi.fn(async () => ({ error: null })),
    };
    const from = vi
      .fn()
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValueOnce(updateBuilder);
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { id: "user-1" } },
            error: null,
          })),
        },
      },
      from,
    } as never);

    const response = await POST(
      request({
        action: "grant",
        toolId: "legacy_import_repair",
        durationMinutes: 30,
        reason: "Revisar importación histórica",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      grant: {
        id: "grant-new",
        userId: "user-1",
        toolId: "legacy_import_repair",
        grantedBy: "admin-1",
      },
    });
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        tool_id: "legacy_import_repair",
        granted_by: "admin-1",
        reason: "Revisar importación histórica",
      }),
    );
    expect(updateBuilder.neq).toHaveBeenCalledWith("id", "grant-new");
  });
});
