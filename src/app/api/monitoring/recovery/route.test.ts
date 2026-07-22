import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { resetRateLimitBucketsForTests } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashCloudDeviceToken } from "@/lib/cloud/devices";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function request(body: unknown, authorization = "Bearer token") {
  return new Request("http://localhost/api/monitoring/recovery", {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      "X-Factu-Device-Token": "synthetic-device-token-000000000001",
    },
    body: JSON.stringify(body),
  });
}

function recoveryAdminClient(error: { message: string } | null = null) {
  const is = vi.fn(async () => ({ data: null, error }));
  const or = vi.fn(() => ({ is }));
  const inCodes = vi.fn((column: string, values: readonly string[]) => {
    void column;
    void values;
    return { or };
  });
  const eqArea = vi.fn((column: string, value: string) => {
    void column;
    void value;
    return { in: inCodes };
  });
  const eqUser = vi.fn((column: string, value: string) => {
    void column;
    void value;
    return { eq: eqArea };
  });
  const update = vi.fn(() => ({ eq: eqUser }));
  return {
    client: { from: vi.fn(() => ({ update })) },
    update,
    eqUser,
    eqArea,
    inCodes,
    or,
    is,
  };
}

describe("POST /api/monitoring/recovery", () => {
  beforeEach(() => {
    vi.stubEnv("SERVER_RATE_LIMIT_BACKEND", "memory");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-from-bearer",
    } as never);
    resetRateLimitBucketsForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
    resetRateLimitBucketsForTests();
  });

  it("requires a confirmed bearer before reading the body or database", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/monitoring/recovery", {
        method: "POST",
        headers: { Authorization: "Bearer invalid" },
        body: "{",
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(getUserFromBearer).toHaveBeenCalledWith("Bearer invalid", {
      requireEmailConfirmed: true,
    });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("rejects unknown keys, identity and recovery kinds", async () => {
    for (const body of [
      { kind: "unknown" },
      { kind: "sync_cycle_verified", userId: "user-from-body" },
      {},
    ]) {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("requires a valid device token before reading the recovery body", async () => {
    const response = await POST(
      new Request("http://localhost/api/monitoring/recovery", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kind: "sync_cycle_verified" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("vary")).toContain("X-Factu-Device-Token");
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("derives identity from auth and resolves only transient push failures", async () => {
    const mock = recoveryAdminClient();
    vi.mocked(getSupabaseAdmin).mockReturnValue(mock.client as never);

    const response = await POST(request({ kind: "sync_push_verified" }));

    expect(response.status).toBe(200);
    expect(mock.update).toHaveBeenCalledWith({
      resolved_at: expect.any(String),
      resolution_source: "sync_push_verified",
    });
    expect(mock.eqUser).toHaveBeenCalledWith("user_id", "user-from-bearer");
    expect(mock.eqArea).toHaveBeenCalledWith("area", "sync");
    expect(mock.inCodes).toHaveBeenCalledWith("code", [
      "push_failed",
      "push_preflight_failed",
    ]);
    const deviceScopeHash = hashCloudDeviceToken(
      "synthetic-device-token-000000000001",
    );
    expect(mock.or).toHaveBeenCalledWith(
      `device_scope_hash.eq.${deviceScopeHash},device_scope_hash.is.null`,
    );
    expect(mock.is).toHaveBeenCalledWith("resolved_at", null);
    expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(JSON.stringify(mock.update.mock.calls)).not.toContain(
      "synthetic-device-token",
    );
  });

  it("keeps fiscal divergence exclusive to durable cloud repair", async () => {
    const cycle = recoveryAdminClient();
    vi.mocked(getSupabaseAdmin).mockReturnValue(cycle.client as never);
    await POST(request({ kind: "sync_cycle_verified" }));
    expect(cycle.inCodes.mock.calls[0][1]).not.toContain(
      "fiscal_workspace_diverged",
    );

    const repair = recoveryAdminClient();
    vi.mocked(getSupabaseAdmin).mockReturnValue(repair.client as never);
    await POST(request({ kind: "cloud_repair_verified" }));
    expect(repair.inCodes.mock.calls[0][1]).toContain(
      "fiscal_workspace_diverged",
    );
    expect(repair.inCodes.mock.calls[0][1]).not.toContain(
      "legacy_repair_migration_failed",
    );
  });

  it("returns a generic private failure without reflecting storage details", async () => {
    const mock = recoveryAdminClient({ message: "sensitive database detail" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(mock.client as never);

    const response = await POST(request({ kind: "sync_cycle_verified" }));
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toBe('{"ok":false}');
    expect(body).not.toContain("sensitive");
  });
});
