import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { resetRateLimitBucketsForTests } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function request() {
  return new Request("http://localhost/api/admin/errors?limit=80", {
    headers: { Authorization: "Bearer token" },
  });
}

function adminClient(
  rows: Array<Record<string, unknown>>,
  options: { identityLookupFails?: boolean } = {},
) {
  const limit = vi.fn(async () => ({ data: rows, error: null }));
  const order = vi.fn(() => ({ limit }));
  const neq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ neq }));
  const getUserById = vi.fn(async (userId: string) => {
    if (options.identityLookupFails) throw new Error("identity unavailable");
    return {
      data: {
        user: {
          id: userId,
          email: userId === "user-1" ? "ana@example.test" : undefined,
        },
      },
      error: null,
    };
  });

  return {
    client: {
      from: vi.fn(() => ({ select })),
      auth: { admin: { getUserById } },
    },
    getUserById,
  };
}

describe("GET /api/admin/errors", () => {
  beforeEach(() => {
    vi.stubEnv("SERVER_RATE_LIMIT_BACKEND", "memory");
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "admin-1" },
    } as never);
    resetRateLimitBucketsForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
    resetRateLimitBucketsForTests();
  });

  it("requiere una sesion admin antes de leer eventos o identidades", async () => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
      }),
    } as never);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("devuelve una identidad admin opaca sin exponer el user_id", async () => {
    const { client, getUserById } = adminClient([
      {
        id: "event-1",
        user_id: "user-1",
        severity: "error",
        area: "sync",
        code: "push_failed",
        message: "El expediente fiscal remoto ha divergido",
        route: "/clientes",
        created_at: "2026-07-21T21:15:00.000Z",
        resolved_at: null,
      },
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getUserById).toHaveBeenCalledOnce();
    expect(body.errors[0].actor).toEqual({
      key: "account-1",
      kind: "user",
      email: "ana@example.test",
    });
    expect(body.errors[0]).not.toHaveProperty("user_id");
    expect(JSON.stringify(body)).not.toContain("user-1");
  });

  it("agrupa con actor de sistema los eventos sin usuario", async () => {
    const { client, getUserById } = adminClient([
      {
        id: "event-system",
        user_id: null,
        severity: "warning",
        area: "browser",
        code: null,
        message: "Evento saneado",
        route: null,
        created_at: "2026-07-21T21:15:00.000Z",
        resolved_at: null,
      },
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);

    const response = await GET(request());
    const body = await response.json();

    expect(getUserById).not.toHaveBeenCalled();
    expect(body.errors[0].actor).toEqual({
      key: "system",
      kind: "system",
      email: null,
    });
  });

  it("mantiene visible el evento si no puede resolver la cuenta", async () => {
    const { client } = adminClient(
      [
        {
          id: "event-orphan",
          user_id: "deleted-user",
          severity: "error",
          area: "sync",
          code: "push_failed",
          message: "Evento conservado",
          route: "/clientes",
          created_at: "2026-07-21T21:15:00.000Z",
          resolved_at: null,
        },
      ],
      { identityLookupFails: true },
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.errors[0].actor).toEqual({
      key: "account-1",
      kind: "user",
      email: null,
    });
    expect(body.errors[0]).not.toHaveProperty("user_id");
  });
});
