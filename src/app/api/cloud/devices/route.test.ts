import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  getUserFromBearer: vi.fn(),
  getUserSessionFromBearer: vi.fn(),
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(),
  ensureCloudDeviceAccess: vi.fn(),
  listCloudDevicesForUser: vi.fn(),
  revokeCurrentCloudDeviceForUser: vi.fn(),
}));

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: mocks.getUserFromBearer,
  getUserSessionFromBearer: mocks.getUserSessionFromBearer,
}));
vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  rateLimitExceededResponse: mocks.rateLimitExceededResponse,
}));
vi.mock("@/lib/cloud/devices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloud/devices")>();
  return {
    ...actual,
    ensureCloudDeviceAccess: mocks.ensureCloudDeviceAccess,
    listCloudDevicesForUser: mocks.listCloudDevicesForUser,
    revokeCurrentCloudDeviceForUser: mocks.revokeCurrentCloudDeviceForUser,
  };
});

function request(
  method: "DELETE" | "GET" | "POST",
  body?: string,
  extraHeaders: Record<string, string> = {},
) {
  return new Request("http://localhost/api/cloud/devices", {
    method,
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      "X-Factu-Device-Token": "device-token-token-token-token-token-token",
      ...extraHeaders,
    },
    body,
  });
}

describe("cloud devices route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserFromBearer.mockResolvedValue({ id: "user-1" });
    mocks.getUserSessionFromBearer.mockResolvedValue({
      user: { id: "user-1" },
      sessionId: "22222222-2222-4222-8222-222222222222",
    });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.listCloudDevicesForUser.mockResolvedValue({
      plan: "pro",
      limit: 2,
      devices: [],
    });
    mocks.revokeCurrentCloudDeviceForUser.mockResolvedValue({
      ok: true,
      devices: [],
    });
  });

  it("requires a confirmed authenticated user", async () => {
    mocks.getUserFromBearer.mockResolvedValue(null);
    const response = await GET(request("GET"));
    expect(response.status).toBe(401);
    expect(mocks.listCloudDevicesForUser).not.toHaveBeenCalled();
  });

  it("requires verified session claims before claiming a device", async () => {
    mocks.getUserSessionFromBearer.mockResolvedValue(null);

    const response = await POST(request("POST", JSON.stringify({})));

    expect(response.status).toBe(401);
    expect(mocks.ensureCloudDeviceAccess).not.toHaveBeenCalled();
  });

  it("lists only devices for the authenticated user", async () => {
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    expect(mocks.listCloudDevicesForUser).toHaveBeenCalledWith({
      userId: "user-1",
      token: "device-token-token-token-token-token-token",
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("retires the authenticated current device", async () => {
    const response = await DELETE(request("DELETE"));
    expect(response.status).toBe(200);
    expect(mocks.revokeCurrentCloudDeviceForUser).toHaveBeenCalledWith({
      userId: "user-1",
      currentToken: "device-token-token-token-token-token-token",
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("returns a conflict when the plan device limit is full", async () => {
    mocks.ensureCloudDeviceAccess.mockResolvedValue({
      allowed: false,
      plan: "pro",
      limit: 2,
      reason: "device_limit_reached",
      message: "Límite alcanzado",
      devices: [],
    });
    const response = await POST(request("POST", JSON.stringify({})));
    expect(response.status).toBe(409);
    expect(mocks.ensureCloudDeviceAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        token: "device-token-token-token-token-token-token",
        sessionId: "22222222-2222-4222-8222-222222222222",
      }),
    );
  });

  it("returns a conflict when another session owns the same device token", async () => {
    mocks.ensureCloudDeviceAccess.mockResolvedValue({
      allowed: false,
      plan: "pro",
      limit: 2,
      reason: "device_session_conflict",
      message: "Otra sesión mantiene la concesión",
      devices: [],
    });

    const response = await POST(request("POST", JSON.stringify({})));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      reason: "device_session_conflict",
    });
  });

  it("rejects oversized bodies before claiming a device", async () => {
    const response = await POST(
      request("POST", "{}", { "Content-Length": "4096" }),
    );
    expect(response.status).toBe(413);
    expect(mocks.ensureCloudDeviceAccess).not.toHaveBeenCalled();
  });
});
