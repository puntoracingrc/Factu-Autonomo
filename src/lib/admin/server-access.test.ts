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
      getUserSessionFromBearer: vi.fn(async () => null),
    }));

    const { getAdminAccessFromRequest } = await import("./server-access");
    const result = await getAdminAccessFromRequest(request());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("rechaza una sesion cuyo email no esta autorizado", async () => {
    vi.doMock("@/lib/billing/server-auth", () => ({
      getUserSessionFromBearer: vi.fn(async () => ({
        user: { id: "user-1", email: "cliente@example.com" },
        sessionId: "22222222-2222-4222-8222-222222222222",
        aal: "aal2",
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

  it("bloquea al admin autorizado mientras la sesión siga en AAL1", async () => {
    vi.doMock("@/lib/billing/server-auth", () => ({
      getUserSessionFromBearer: vi.fn(async () => ({
        user: { id: "admin-1", email: "admin@example.com" },
        sessionId: "22222222-2222-4222-8222-222222222222",
        aal: "aal1",
      })),
    }));
    vi.doMock("@/lib/admin/access", () => ({
      isAdminUser: vi.fn(() => true),
    }));
    const { getAdminAccessFromRequest } = await import("./server-access");
    const result = await getAdminAccessFromRequest(request());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      expect(result.response.headers.get("X-Admin-MFA-Required")).toBe("1");
      await expect(result.response.json()).resolves.toMatchObject({
        code: "admin_mfa_required",
        adminMfa: { required: true, satisfied: false, currentLevel: "aal1" },
      });
    }
  });

  it("autoriza al admin solo con claims verificados en AAL2", async () => {
    vi.doMock("@/lib/billing/server-auth", () => ({
      getUserSessionFromBearer: vi.fn(async () => ({
        user: { id: "admin-1", email: "admin@example.com" },
        sessionId: "22222222-2222-4222-8222-222222222222",
        aal: "aal2",
      })),
    }));
    vi.doMock("@/lib/admin/access", () => ({
      isAdminUser: vi.fn(() => true),
    }));

    const { getAdminAccessFromRequest } = await import("./server-access");
    const result = await getAdminAccessFromRequest(request());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("admin-1");
      expect(result.mfa).toEqual({
        required: true,
        satisfied: true,
        currentLevel: "aal2",
      });
    }
  });

  it("exige AAL2 también en las rutas de aprendizaje Admin", async () => {
    vi.doMock("@/lib/billing/server-auth", () => ({
      getUserSessionFromBearer: vi.fn(async () => ({
        user: {
          id: "learning-1",
          email: "persianasalmar@gmail.com",
        },
        sessionId: "22222222-2222-4222-8222-222222222222",
        aal: "aal1",
      })),
    }));

    const { getAdminAiLearningAccessFromRequest } = await import(
      "./server-access"
    );
    const result = await getAdminAiLearningAccessFromRequest(request());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toMatchObject({
        code: "admin_mfa_required",
      });
    }
  });
});
