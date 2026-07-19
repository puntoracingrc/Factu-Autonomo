import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserFromBearer: vi.fn(),
  checkRateLimit: vi.fn(),
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

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/security/data-access-event", {
    method: "POST",
    headers: {
      Authorization: "Bearer session-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/security/data-access-event", () => {
  beforeEach(() => {
    mocks.getUserFromBearer.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.getUserFromBearer.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      limit: 180,
      remaining: 179,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "supabase",
    });
  });

  it("rechaza sesiones no válidas", async () => {
    mocks.getUserFromBearer.mockResolvedValue(null);
    const response = await POST(request({ type: "backup_local", itemCount: 1 }));
    expect(response.status).toBe(401);
  });

  it("registra una descarga grande solo mediante namespaces saneados", async () => {
    const response = await POST(
      request({
        type: "backup_local",
        itemCount: 5_000,
        byteLength: 11 * 1024 * 1024,
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.checkRateLimit).toHaveBeenCalledTimes(3);
    expect(
      mocks.checkRateLimit.mock.calls.map((call) => call[1].namespace),
    ).toEqual([
      "data_access_event",
      "data_backup_local",
      "data_backup_local_large",
    ]);
    expect(mocks.checkRateLimit.mock.calls.every((call) => call[2] === "user-1"))
      .toBe(true);
  });

  it("separa la sincronización automática de una descarga manual", async () => {
    const response = await POST(
      request({
        type: "cloud_pull",
        itemCount: 1,
        automatic: true,
      }),
    );

    expect(response.status).toBe(200);
    expect(
      mocks.checkRateLimit.mock.calls.map((call) => call[1].namespace),
    ).toEqual(["data_access_event", "data_cloud_pull_auto"]);
  });

  it("separa y amplía solo las operaciones automáticas del administrador", async () => {
    mocks.getUserFromBearer.mockResolvedValue({
      id: "admin-1",
      email: "persianasalmar@gmail.com",
    });

    const response = await POST(
      request({
        type: "backup_drive",
        itemCount: 5_000,
        byteLength: 11 * 1024 * 1024,
        automatic: true,
      }),
    );

    expect(response.status).toBe(200);
    expect(
      mocks.checkRateLimit.mock.calls.map((call) => call[1].namespace),
    ).toEqual([
      "admin_data_access_event",
      "data_admin_backup_drive_auto",
      "data_admin_backup_drive_auto_large",
    ]);
    expect(
      mocks.checkRateLimit.mock.calls.every((call) => call[1].limit === 1_200),
    ).toBe(true);
  });

  it("no amplía una descarga manual aunque la realice un administrador", async () => {
    mocks.getUserFromBearer.mockResolvedValue({
      id: "admin-1",
      email: "persianasalmar@gmail.com",
    });

    const response = await POST(
      request({
        type: "backup_local",
        itemCount: 5_000,
        byteLength: 11 * 1024 * 1024,
      }),
    );

    expect(response.status).toBe(200);
    expect(
      mocks.checkRateLimit.mock.calls.map((call) => call[1].namespace),
    ).toEqual([
      "data_access_event",
      "data_backup_local",
      "data_backup_local_large",
    ]);
    expect(
      mocks.checkRateLimit.mock.calls.every((call) => call[1].limit === 180),
    ).toBe(true);
  });

  it("rechaza tipos y tamaños manipulados", async () => {
    const response = await POST(
      request({ type: "database_dump", itemCount: -1, byteLength: 0 }),
    );
    expect(response.status).toBe(400);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });
});
