import { afterEach, describe, expect, it, vi } from "vitest";

function jwtWithPayload(payload: Record<string, unknown>) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64url");
  return `${encode({ alg: "none" })}.${encode(payload)}.signature`;
}

function requestWithAal(aal: string) {
  return new Request("https://facturacion-autonomos.app/api/admin/test", {
    headers: { Authorization: `Bearer ${jwtWithPayload({ aal })}` },
  });
}

describe("admin server access", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("allows admin without MFA when the switch is disabled", async () => {
    vi.doMock("@/lib/billing/server-auth", () => ({
      getUserFromBearer: vi.fn(async () => ({
        id: "admin-1",
        email: "admin@example.com",
      })),
    }));
    vi.doMock("@/lib/admin/access", () => ({
      isAdminUser: vi.fn(() => true),
    }));
    vi.stubEnv("ADMIN_MFA_REQUIRED", "false");

    const { getAdminAccessFromRequest } = await import("./server-access");
    const result = await getAdminAccessFromRequest(requestWithAal("aal1"));

    expect(result.ok).toBe(true);
  });

  it("blocks admin with aal1 when MFA is required", async () => {
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
    const result = await getAdminAccessFromRequest(requestWithAal("aal1"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      expect(await result.response.json()).toMatchObject({
        code: "admin_mfa_required",
      });
    }
  });

  it("allows admin with aal2 when MFA is required", async () => {
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
    const result = await getAdminAccessFromRequest(requestWithAal("aal2"));

    expect(result.ok).toBe(true);
  });
});
