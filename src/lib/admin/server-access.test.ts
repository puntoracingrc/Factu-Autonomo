import { afterEach, describe, expect, it, vi } from "vitest";

function request() {
  return new Request("https://facturacion-autonomos.app/api/admin/test", {
    headers: { Authorization: "Bearer session-token" },
  });
}

describe("admin server access", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("requiere una sesion autenticada", async () => {
    vi.doMock("@/lib/billing/server-auth", () => ({
      getUserFromBearer: vi.fn(async () => null),
    }));

    const { getAdminAccessFromRequest } = await import("./server-access");
    const result = await getAdminAccessFromRequest(request());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("rechaza una sesion cuyo email no esta autorizado", async () => {
    vi.doMock("@/lib/billing/server-auth", () => ({
      getUserFromBearer: vi.fn(async () => ({
        id: "user-1",
        email: "cliente@example.com",
      })),
    }));
    vi.doMock("@/lib/admin/access", () => ({
      isAdminUser: vi.fn(() => false),
    }));

    const { getAdminAccessFromRequest } = await import("./server-access");
    const result = await getAdminAccessFromRequest(request());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("autoriza al admin por sesion y allowlist aunque quede una flag MFA obsoleta", async () => {
    vi.doMock("@/lib/billing/server-auth", () => ({
      getUserFromBearer: vi.fn(async () => ({
        id: "admin-1",
        email: "admin@example.com",
      })),
    }));
    vi.doMock("@/lib/admin/access", () => ({
      isAdminUser: vi.fn(() => true),
    }));
    vi.stubEnv("ADMIN_MFA_REQUIRED", "true");

    const { getAdminAccessFromRequest } = await import("./server-access");
    const result = await getAdminAccessFromRequest(request());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.id).toBe("admin-1");
  });
});
