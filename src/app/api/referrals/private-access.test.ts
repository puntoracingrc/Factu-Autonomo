import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(),
}));

import { GET } from "./me/route";
import { POST } from "./redeem/route";

function request(method: "GET" | "POST") {
  return new Request(`https://example.test/api/referrals`, {
    method,
    headers: {
      Authorization: "Bearer test-token",
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify({ code: "TEST" }) } : {}),
  });
}

describe("private referral API access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "other-user",
      email: "usuario@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
  });

  it("closes referral data for accounts outside the preview", async () => {
    const response = await GET(request("GET"));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("closes referral redemption for accounts outside the preview", async () => {
    const response = await POST(request("POST"));

    expect(response.status).toBe(404);
    expect(checkRateLimit).not.toHaveBeenCalled();
  });
});
