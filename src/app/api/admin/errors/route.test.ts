import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { resetRateLimitBucketsForTests } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function request(
  method: "GET" | "PATCH" = "GET",
  body?: Record<string, unknown>,
  status?: "pending" | "resolved" | "archived",
) {
  const url = new URL("http://localhost/api/admin/errors");
  url.searchParams.set("limit", "80");
  if (status) url.searchParams.set("status", status);
  return new Request(url, {
    method,
    headers: {
      Authorization: "Bearer token",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function adminClient(
  rows: Array<Record<string, unknown>>,
  options: { identityLookupFails?: boolean } = {},
) {
  const limit = vi.fn(async () => ({ data: rows, error: null }));
  const order = vi.fn(() => ({ limit }));
  const builder: Record<string, unknown> = {};
  const neq = vi.fn(() => builder);
  const is = vi.fn(() => builder);
  const not = vi.fn(() => builder);
  Object.assign(builder, { neq, is, not, order });
  const select = vi.fn(() => builder);
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
    is,
    not,
  };
}

function archiveAdminClient(
  rows: unknown[],
  error: { message: string } | null = null,
) {
  const rpc = vi.fn(async () => ({
    data: rows,
    error,
  }));

  return {
    client: { rpc },
    rpc,
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
    const { client, getUserById, is } = adminClient([
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
        resolution_source: null,
        archived_at: null,
      },
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(is).toHaveBeenCalledWith("resolved_at", null);
    expect(is).toHaveBeenCalledWith("archived_at", null);
    expect(getUserById).toHaveBeenCalledOnce();
    expect(body.errors[0].actor).toEqual({
      key: "account-1",
      kind: "user",
      email: "ana@example.test",
    });
    expect(body.errors[0]).not.toHaveProperty("user_id");
    expect(JSON.stringify(body)).not.toContain("user-1");
  });

  it("separa solucionados y archivados de la lista pendiente", async () => {
    const { client, is, not } = adminClient([
      {
        id: "event-resolved",
        user_id: null,
        severity: "warning",
        area: "browser",
        code: null,
        message: "Evento resuelto",
        route: null,
        created_at: "2026-07-21T21:15:00.000Z",
        resolved_at: "2026-07-22T08:00:00.000Z",
        resolution_source: "sync_cycle_verified",
        archived_at: null,
      },
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);

    const response = await GET(request("GET", undefined, "resolved"));

    expect(response.status).toBe(200);
    expect(not).toHaveBeenCalledWith("resolved_at", "is", null);
    expect(is).toHaveBeenCalledWith("archived_at", null);

    const archivedResponse = await GET(
      request("GET", undefined, "archived"),
    );
    expect(archivedResponse.status).toBe(200);
    expect(not).toHaveBeenCalledWith("archived_at", "is", null);
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

  it("protege la confirmacion antes de leer el body o acceder a datos", async () => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
      }),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/admin/errors", {
        method: "PATCH",
        headers: { Authorization: "Bearer invalid" },
        body: "{",
      }),
    );

    expect(response.status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rechaza identidades, claves extra e ids no validos", async () => {
    const invalidBodies = [
      { eventIds: ["event-1"] },
      {
        eventIds: ["11111111-1111-4111-8111-111111111111"],
        userId: "22222222-2222-4222-8222-222222222222",
      },
      { eventIds: [] },
    ];

    for (const body of invalidBodies) {
      const response = await PATCH(request("PATCH", body));
      expect(response.status).toBe(400);
    }
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("archiva solo eventos solucionados y responde tras readback completo", async () => {
    const firstId = "11111111-1111-4111-8111-111111111111";
    const secondId = "22222222-2222-4222-8222-222222222222";
    const resolvedAt = "2026-07-22T07:00:00.000Z";
    const archivedAt = "2026-07-22T08:00:00.000Z";
    const mock = archiveAdminClient([
      {
        id: firstId,
        resolved_at: resolvedAt,
        archived_at: archivedAt,
        user_id: "must-not-leak",
      },
      { id: secondId, resolved_at: resolvedAt, archived_at: archivedAt },
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(mock.client as never);

    const response = await PATCH(
      request("PATCH", { eventIds: [firstId, secondId, firstId] }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mock.rpc).toHaveBeenCalledWith(
      "archive_resolved_app_error_events_v1",
      { p_event_ids: [firstId, secondId] },
    );
    expect(body.archived).toEqual([
      { id: firstId, resolved_at: resolvedAt, archived_at: archivedAt },
      { id: secondId, resolved_at: resolvedAt, archived_at: archivedAt },
    ]);
    expect(JSON.stringify(body)).not.toContain("user_id");
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
  });

  it("falla cerrado si el readback no confirma todos los eventos", async () => {
    const firstId = "11111111-1111-4111-8111-111111111111";
    const missingId = "22222222-2222-4222-8222-222222222222";
    const mock = archiveAdminClient([
      {
        id: firstId,
        resolved_at: "2026-07-22T07:00:00.000Z",
        archived_at: "2026-07-22T08:00:00.000Z",
      },
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(mock.client as never);

    const response = await PATCH(
      request("PATCH", { eventIds: [firstId, missingId] }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Solo se pueden archivar errores solucionados.",
    });
  });
});
