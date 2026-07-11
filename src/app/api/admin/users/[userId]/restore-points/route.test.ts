import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { isAdminUser } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ADMIN_RESTORE_ENTITY_TYPES,
  type AdminSyncEntityRow,
} from "@/lib/admin/user-restore";
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

function jwtWithPayload(payload: Record<string, unknown>) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(payload)}.signature`;
}

function request(body?: unknown, aal = "aal2") {
  return new Request("http://localhost/api/admin/users/user-1/restore-points", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${jwtWithPayload({ aal })}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function asyncBuilder(result: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
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
    vi.unstubAllEnvs();
  });

  it("rechaza cuentas no admin", async () => {
    vi.mocked(isAdminUser).mockReturnValue(false);

    const response = await GET(request(), params);

    expect(response.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("exige AAL2 en todo el perímetro aunque la flag MFA global esté desactivada", async () => {
    vi.stubEnv("ADMIN_MFA_REQUIRED", "false");
    const from = vi.fn();
    const getUserById = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: { admin: { getUserById } },
      from,
    } as never);

    const response = await GET(request(undefined, "aal1"), params);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("X-Admin-MFA-Required")).toBe("1");
    expect(body).toMatchObject({ code: "admin_mfa_required" });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(getUserById).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("bloquea el apply con AAL2 antes de leer o mutar datos", async () => {
    vi.stubEnv("ADMIN_MFA_REQUIRED", "false");
    const from = vi.fn();
    const getUserById = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: { admin: { getUserById } },
      from,
    } as never);

    const response = await POST(
      request({ action: "restore", restorePointId: "restore-1" }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: false,
      blocked: true,
      mode: "preview_only",
      code: "admin_restore_transaction_required",
    });
    expect(getUserById).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("permite crear una copia con AAL2 sin mutar sync_entities", async () => {
    const syncBuilder = asyncBuilder({ data: [], error: null });
    const restorePointBuilder = asyncBuilder({
      data: {
        id: "restore-new",
        user_id: "user-1",
        created_at: "2026-07-11T23:00:00.000Z",
        created_by: "admin-1",
        label: "Copia soporte admin",
        reason: "Diagnóstico sintético",
        source: "admin_manual",
        summary: {},
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
        action: "create",
        label: "Copia soporte admin",
        reason: "Diagnóstico sintético",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      mode: "preview_only",
      restorePoint: {
        id: "restore-new",
        source: "admin_manual",
      },
    });
    expect(restorePointBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        created_by: "admin-1",
        source: "admin_manual",
      }),
    );
    expect(syncBuilder.upsert).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalledWith("admin_user_restore_events");
  });

  it("mantiene la vista previa sin ejecutar escrituras", async () => {
    const syncBuilder = asyncBuilder({ data: [], error: null });
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
    const getUserById = vi.fn(async () => ({
      data: { user: { email: "cliente@example.com" } },
      error: null,
    }));
    const from = vi.fn((table: string) =>
      table === "sync_entities" ? syncBuilder : restorePointBuilder,
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: { getUserById },
      },
      from,
    } as never);

    const response = await POST(
      request({
        action: "preview",
        restorePointId: "restore-1",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      mode: "preview_only",
      restorePoint: { id: "restore-1" },
      diff: { totalChanges: expect.any(Number) },
    });
    expect(getUserById).toHaveBeenCalledWith("user-1");
    expect(syncBuilder.order).toHaveBeenCalledTimes(
      ADMIN_RESTORE_ENTITY_TYPES.length,
    );
    expect(syncBuilder.order).toHaveBeenCalledWith("entity_id", {
      ascending: true,
    });
    expect(syncBuilder.upsert).not.toHaveBeenCalled();
    expect(restorePointBuilder.insert).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalledWith("admin_user_restore_events");
  });

  it("pagina 501 filas con cursor inmutable aunque cambie updated_at", async () => {
    const customerRows: AdminSyncEntityRow[] = Array.from(
      { length: 501 },
      (_, index) => {
        const sequence = String(index + 1).padStart(4, "0");
        const id = `customer-${sequence}`;
        return {
          entity_type: "customer",
          entity_id: id,
          payload: {
            id,
            firstName: `Cliente ${sequence}`,
            lastName: "",
            name: `Cliente ${sequence}`,
            createdAt: "2026-07-01T10:00:00.000Z",
            updatedAt: "2026-07-01T10:00:00.000Z",
          },
          deleted: false,
          updated_at: "2026-07-01T10:00:00.000Z",
        };
      },
    );
    let selectedEntityType = "";
    let afterEntityId: string | null = null;
    const syncBuilder = {
      select: vi.fn(() => syncBuilder),
      eq: vi.fn((field: string, value: string) => {
        if (field === "entity_type") {
          selectedEntityType = value;
          afterEntityId = null;
        }
        return syncBuilder;
      }),
      order: vi.fn(() => syncBuilder),
      gt: vi.fn((field: string, value: string) => {
        expect(field).toBe("entity_id");
        afterEntityId = value;
        customerRows[0] = {
          ...customerRows[0],
          updated_at: "2026-07-11T23:00:00.000Z",
        };
        return syncBuilder;
      }),
      limit: vi.fn(async () => {
        if (selectedEntityType !== "customer") {
          return { data: [], error: null };
        }
        const data = customerRows
          .filter((row) => !afterEntityId || row.entity_id > afterEntityId)
          .slice(0, 500);
        return { data, error: null };
      }),
    };
    const restorePointsBuilder = asyncBuilder({ data: [], error: null });
    const from = vi.fn((table: string) =>
      table === "sync_entities" ? syncBuilder : restorePointsBuilder,
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

    const response = await GET(request(), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("preview_only");
    expect(body.current).toMatchObject({
      customers: 501,
      activeEntities: expect.any(Number),
      totalRows: 501,
    });
    expect(syncBuilder.gt).toHaveBeenCalledTimes(1);
    expect(syncBuilder.gt).toHaveBeenCalledWith(
      "entity_id",
      "customer-0500",
    );
    expect(syncBuilder.limit).toHaveBeenCalledTimes(
      ADMIN_RESTORE_ENTITY_TYPES.length + 1,
    );
  });
});
