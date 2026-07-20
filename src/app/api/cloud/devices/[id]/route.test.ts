import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";

const mocks = vi.hoisted(() => ({
  getUserFromBearer: vi.fn(),
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(),
  listCloudDevicesForUser: vi.fn(),
  revokeCloudDeviceForUser: vi.fn(),
}));

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: mocks.getUserFromBearer,
}));
vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  rateLimitExceededResponse: mocks.rateLimitExceededResponse,
}));
vi.mock("@/lib/cloud/devices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloud/devices")>();
  return {
    ...actual,
    listCloudDevicesForUser: mocks.listCloudDevicesForUser,
    revokeCloudDeviceForUser: mocks.revokeCloudDeviceForUser,
  };
});

function request() {
  return new Request("http://localhost/api/cloud/devices/lost-device", {
    method: "DELETE",
    headers: {
      Authorization: "Bearer test-token",
      "X-Factu-Device-Token": "new-token-token-token-token-token-token",
    },
  });
}

describe("cloud device revoke route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserFromBearer.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.revokeCloudDeviceForUser.mockResolvedValue({ ok: true, devices: [] });
    mocks.listCloudDevicesForUser.mockResolvedValue({
      plan: "pro",
      limit: 2,
      devices: [],
    });
  });

  it("revokes only within the authenticated user scope", async () => {
    const response = await DELETE(request(), {
      params: Promise.resolve({ id: "lost-device" }),
    });
    expect(response.status).toBe(200);
    expect(mocks.revokeCloudDeviceForUser).toHaveBeenCalledWith({
      userId: "user-1",
      deviceId: "lost-device",
      currentToken: "new-token-token-token-token-token-token",
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("does not reveal devices without authentication", async () => {
    mocks.getUserFromBearer.mockResolvedValue(null);
    const response = await DELETE(request(), {
      params: Promise.resolve({ id: "lost-device" }),
    });
    expect(response.status).toBe(401);
    expect(mocks.revokeCloudDeviceForUser).not.toHaveBeenCalled();
  });
});
