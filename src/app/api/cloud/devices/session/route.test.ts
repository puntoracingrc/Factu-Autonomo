import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";

const mocks = vi.hoisted(() => ({
  getUserSessionFromBearer: vi.fn(),
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(),
  releaseCloudDeviceSessionForUser: vi.fn(),
}));

vi.mock("@/lib/billing/server-auth", () => ({
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
    releaseCloudDeviceSessionForUser:
      mocks.releaseCloudDeviceSessionForUser,
  };
});

function request() {
  return new Request("http://localhost/api/cloud/devices/session", {
    method: "DELETE",
    headers: {
      Authorization: "Bearer test-token",
      "X-Factu-Device-Token": "device-token-token-token-token-token-token",
    },
  });
}

describe("cloud device session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserSessionFromBearer.mockResolvedValue({
      user: { id: "user-1" },
      sessionId: "22222222-2222-4222-8222-222222222222",
    });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.releaseCloudDeviceSessionForUser.mockResolvedValue(true);
  });

  it("releases only the current verified session lease", async () => {
    const response = await DELETE(request());

    expect(response.status).toBe(200);
    expect(mocks.releaseCloudDeviceSessionForUser).toHaveBeenCalledWith({
      userId: "user-1",
      currentToken: "device-token-token-token-token-token-token",
      sessionId: "22222222-2222-4222-8222-222222222222",
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("fails closed without a verified Supabase session", async () => {
    mocks.getUserSessionFromBearer.mockResolvedValue(null);

    const response = await DELETE(request());

    expect(response.status).toBe(401);
    expect(mocks.releaseCloudDeviceSessionForUser).not.toHaveBeenCalled();
  });
});
