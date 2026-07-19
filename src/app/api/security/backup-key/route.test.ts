import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserFromBearer: vi.fn(),
  checkRateLimit: vi.fn(),
  deriveUserBackupKey: vi.fn(),
}));

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: mocks.getUserFromBearer,
}));
vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  rateLimitExceededResponse: vi.fn(() =>
    Response.json({ error: "limit" }, { status: 429 }),
  ),
}));
vi.mock("@/lib/security/backup-key-server", () => ({
  deriveUserBackupKey: mocks.deriveUserBackupKey,
}));

import { GET } from "./route";

describe("GET /api/security/backup-key", () => {
  beforeEach(() => {
    mocks.getUserFromBearer.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.deriveUserBackupKey.mockReset();
    mocks.getUserFromBearer.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.deriveUserBackupKey.mockReturnValue({
      ok: true,
      version: 1,
      keyBase64: Buffer.alloc(32, 3).toString("base64"),
    });
  });

  it("requiere una sesión válida", async () => {
    mocks.getUserFromBearer.mockResolvedValue(null);
    const response = await GET(
      new Request("http://localhost/api/security/backup-key"),
    );
    expect(response.status).toBe(401);
    expect(mocks.deriveUserBackupKey).not.toHaveBeenCalled();
  });

  it("entrega solo la clave derivada del usuario y sin caché", async () => {
    const response = await GET(
      new Request("http://localhost/api/security/backup-key?version=1", {
        headers: { Authorization: "Bearer session-token" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.deriveUserBackupKey).toHaveBeenCalledWith("user-1", "1");
    expect(await response.json()).toMatchObject({
      algorithm: "AES-GCM",
      version: 1,
    });
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ namespace: "backup_key", limit: 60 }),
      "user-1",
    );
  });

  it("registra aparte las claves de copia de una cuenta administrativa ilimitada", async () => {
    mocks.getUserFromBearer.mockResolvedValue({
      id: "admin-1",
      email: "persianasalmar@gmail.com",
    });

    const response = await GET(
      new Request("http://localhost/api/security/backup-key", {
        headers: { Authorization: "Bearer session-token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ namespace: "admin_backup_key", limit: 1_200 }),
      "admin-1",
    );
  });

  it("falla cerrado si falta la clave maestra", async () => {
    mocks.deriveUserBackupKey.mockReturnValue({
      ok: false,
      error: "not_configured",
    });
    const response = await GET(
      new Request("http://localhost/api/security/backup-key", {
        headers: { Authorization: "Bearer session-token" },
      }),
    );
    expect(response.status).toBe(503);
  });
});
