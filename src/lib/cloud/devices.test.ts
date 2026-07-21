import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cloudDeviceLimitForPlan,
  ensureCloudDeviceAccess,
  hashCloudDeviceSessionId,
  hashCloudDeviceToken,
  inferCloudDeviceKind,
  releaseCloudDeviceSessionForUser,
  revokeCloudDeviceForUser,
  revokeCurrentCloudDeviceForUser,
} from "./devices";

const SESSION_ONE = "11111111-1111-4111-8111-111111111111";
const SESSION_TWO = "22222222-2222-4222-8222-222222222222";

const serverRepository = vi.hoisted(() => ({
  fetchUserSubscriptionServer: vi.fn(),
}));

const supabaseAdmin = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/billing/server-repository", () => ({
  fetchUserSubscriptionServer: serverRepository.fetchUserSubscriptionServer,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: supabaseAdmin.getSupabaseAdmin,
}));

type DeviceRow = {
  id: string;
  user_id: string;
  token_hash: string;
  name: string;
  kind: string;
  status: string;
  created_at: string;
  last_seen_at: string;
  last_sync_at: string | null;
  revoked_at: string | null;
};

function createFakeAdmin(
  rows: DeviceRow[] = [],
  options: { failFirstInsertAfterPersist?: boolean } = {},
) {
  let sequence = rows.length;
  let insertFailed = false;
  const table = [...rows];
  const leases = new Map<string, string>();

  function matches(row: DeviceRow, filters: Array<[string, unknown]>) {
    return filters.every(
      ([key, value]) => row[key as keyof DeviceRow] === value,
    );
  }

  function query(operation: "select" | "insert" | "update", payload?: unknown) {
    const filters: Array<[string, unknown]> = [];
    const builder = {
      select: () => builder,
      order: () =>
        Promise.resolve({
          data: table.filter((row) => matches(row, filters)),
          error: null,
        }),
      eq: (key: string, value: unknown) => {
        filters.push([key, value]);
        return builder;
      },
      single: () => {
        if (operation !== "insert") {
          return Promise.resolve({
            data: null,
            error: { message: "unsupported" },
          });
        }
        const input = payload as Partial<DeviceRow>;
        sequence += 1;
        const now = new Date().toISOString();
        const row: DeviceRow = {
          id: `device-${sequence}`,
          user_id: String(input.user_id),
          token_hash: String(input.token_hash),
          name: String(input.name),
          kind: String(input.kind ?? "unknown"),
          status: String(input.status ?? "active"),
          created_at: now,
          last_seen_at: String(input.last_seen_at ?? now),
          last_sync_at:
            (input.last_sync_at as string | null | undefined) ?? null,
          revoked_at: (input.revoked_at as string | null | undefined) ?? null,
        };
        table.push(row);
        if (options.failFirstInsertAfterPersist && !insertFailed) {
          insertFailed = true;
          return Promise.resolve({
            data: null,
            error: { code: "23505", message: "duplicate key value" },
          });
        }
        return Promise.resolve({ data: row, error: null });
      },
      then: (
        resolve: (value: { data?: unknown; error: null }) => void,
        reject: (error: unknown) => void,
      ) => {
        try {
          if (operation === "update") {
            const patch = payload as Partial<DeviceRow>;
            for (const row of table) {
              if (matches(row, filters)) Object.assign(row, patch);
            }
            resolve({ data: null, error: null });
            return;
          }
          resolve({
            data: table.filter((row) => matches(row, filters)),
            error: null,
          });
        } catch (error) {
          reject(error);
        }
      },
    };
    return builder;
  }

  return {
    rows: table,
    leases,
    client: {
      rpc: (
        name: string,
        args: {
          p_user_id: string;
          p_token_hash: string;
          p_session_hash: string;
        },
      ) => {
        const row = table.find(
          (candidate) =>
            candidate.user_id === args.p_user_id &&
            candidate.token_hash === args.p_token_hash,
        );
        if (name === "release_cloud_device_session") {
          if (leases.get(args.p_token_hash) === args.p_session_hash) {
            leases.delete(args.p_token_hash);
          }
          return Promise.resolve({ data: true, error: null });
        }
        if (!row) {
          return Promise.resolve({ data: "device_missing", error: null });
        }
        if (row.status === "revoked") {
          return Promise.resolve({ data: "device_revoked", error: null });
        }
        const currentSession = leases.get(args.p_token_hash);
        if (currentSession && currentSession !== args.p_session_hash) {
          return Promise.resolve({ data: "session_conflict", error: null });
        }
        leases.set(args.p_token_hash, args.p_session_hash);
        return Promise.resolve({ data: "claimed", error: null });
      },
      from: () => ({
        select: () => query("select"),
        insert: (payload: unknown) => query("insert", payload),
        update: (payload: unknown) => query("update", payload),
      }),
    },
  };
}

describe("cloud devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the free plan local-only", async () => {
    const fake = createFakeAdmin();
    supabaseAdmin.getSupabaseAdmin.mockReturnValue(fake.client);
    serverRepository.fetchUserSubscriptionServer.mockResolvedValue({
      userId: "u1",
      plan: "free",
      status: "inactive",
    });

    const result = await ensureCloudDeviceAccess({
      userId: "u1",
      token: "token-token-token-token-token-token",
      sessionId: SESSION_ONE,
    });

    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error("expected free plan to be blocked");
    expect(result.reason).toBe("cloud_not_in_plan");
    expect(fake.rows).toHaveLength(0);
  });

  it("limits Pro to two active devices", async () => {
    const fake = createFakeAdmin();
    supabaseAdmin.getSupabaseAdmin.mockReturnValue(fake.client);
    serverRepository.fetchUserSubscriptionServer.mockResolvedValue({
      userId: "u1",
      plan: "pro",
      status: "active",
    });

    const first = await ensureCloudDeviceAccess({
      userId: "u1",
      token: "first-token-token-token-token-token-token",
      sessionId: SESSION_ONE,
      userAgent: "Macintosh",
    });
    const second = await ensureCloudDeviceAccess({
      userId: "u1",
      token: "second-token-token-token-token-token-token",
      sessionId: SESSION_ONE,
      userAgent: "iPhone Mobile",
    });
    const third = await ensureCloudDeviceAccess({
      userId: "u1",
      token: "third-token-token-token-token-token-token",
      sessionId: SESSION_ONE,
      userAgent: "iPad",
    });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    if (third.allowed) throw new Error("expected third device to be blocked");
    expect(third.reason).toBe("device_limit_reached");
    expect(fake.rows.filter((row) => row.status === "active")).toHaveLength(2);
  });

  it("reconciles concurrent registration of the same browser", async () => {
    const fake = createFakeAdmin([], { failFirstInsertAfterPersist: true });
    supabaseAdmin.getSupabaseAdmin.mockReturnValue(fake.client);
    serverRepository.fetchUserSubscriptionServer.mockResolvedValue({
      userId: "u1",
      plan: "pro",
      status: "active",
    });

    const result = await ensureCloudDeviceAccess({
      userId: "u1",
      token: "same-token-token-token-token-token-token",
      sessionId: SESSION_ONE,
      userAgent: "Macintosh",
    });

    expect(result.allowed).toBe(true);
    expect(fake.rows).toHaveLength(1);
  });

  it("blocks a copied device token in a second live Supabase session", async () => {
    const token = "shared-token-token-token-token-token-token";
    const fake = createFakeAdmin();
    supabaseAdmin.getSupabaseAdmin.mockReturnValue(fake.client);
    serverRepository.fetchUserSubscriptionServer.mockResolvedValue({
      userId: "u1",
      plan: "pro",
      status: "active",
    });

    const first = await ensureCloudDeviceAccess({
      userId: "u1",
      token,
      sessionId: SESSION_ONE,
    });
    const copied = await ensureCloudDeviceAccess({
      userId: "u1",
      token,
      sessionId: SESSION_TWO,
    });

    expect(first.allowed).toBe(true);
    expect(copied.allowed).toBe(false);
    if (copied.allowed) throw new Error("expected copied session to be blocked");
    expect(copied.reason).toBe("device_session_conflict");
    expect(copied.message).toContain("cambios siguen guardados");
    expect(fake.leases.get(hashCloudDeviceToken(token))).toBe(
      hashCloudDeviceSessionId(SESSION_ONE),
    );
  });

  it("lets a new session claim the same device after explicit sign-out", async () => {
    const token = "released-token-token-token-token-token-token";
    const fake = createFakeAdmin();
    supabaseAdmin.getSupabaseAdmin.mockReturnValue(fake.client);
    serverRepository.fetchUserSubscriptionServer.mockResolvedValue({
      userId: "u1",
      plan: "pro",
      status: "active",
    });

    await ensureCloudDeviceAccess({
      userId: "u1",
      token,
      sessionId: SESSION_ONE,
    });
    const released = await releaseCloudDeviceSessionForUser({
      userId: "u1",
      currentToken: token,
      sessionId: SESSION_ONE,
    });
    const reclaimed = await ensureCloudDeviceAccess({
      userId: "u1",
      token,
      sessionId: SESSION_TWO,
    });

    expect(released).toBe(true);
    expect(reclaimed.allowed).toBe(true);
  });

  it("blocks devices outside the current limit after a downgrade", async () => {
    const now = new Date("2026-07-20T10:00:00.000Z");
    const fake = createFakeAdmin([
      {
        id: "device-newer",
        user_id: "u1",
        token_hash: hashCloudDeviceToken(
          "newer-token-token-token-token-token-token",
        ),
        name: "Nuevo",
        kind: "computer",
        status: "active",
        created_at: now.toISOString(),
        last_seen_at: now.toISOString(),
        last_sync_at: null,
        revoked_at: null,
      },
      {
        id: "device-older",
        user_id: "u1",
        token_hash: hashCloudDeviceToken(
          "older-token-token-token-token-token-token",
        ),
        name: "Antiguo",
        kind: "mobile",
        status: "active",
        created_at: "2026-07-18T10:00:00.000Z",
        last_seen_at: "2026-07-18T10:00:00.000Z",
        last_sync_at: null,
        revoked_at: null,
      },
      {
        id: "device-oldest",
        user_id: "u1",
        token_hash: hashCloudDeviceToken(
          "oldest-token-token-token-token-token-token",
        ),
        name: "Fuera de límite",
        kind: "tablet",
        status: "active",
        created_at: "2026-07-17T10:00:00.000Z",
        last_seen_at: "2026-07-17T10:00:00.000Z",
        last_sync_at: null,
        revoked_at: null,
      },
    ]);
    supabaseAdmin.getSupabaseAdmin.mockReturnValue(fake.client);
    serverRepository.fetchUserSubscriptionServer.mockResolvedValue({
      userId: "u1",
      plan: "pro",
      status: "active",
    });

    const result = await ensureCloudDeviceAccess({
      userId: "u1",
      token: "oldest-token-token-token-token-token-token",
      sessionId: SESSION_ONE,
    });

    expect(result.allowed).toBe(false);
    if (result.allowed)
      throw new Error("expected downgraded device to be blocked");
    expect(result.reason).toBe("device_limit_reached");
  });

  it("lets a new browser revoke a lost device and claim the released slot", async () => {
    const now = "2026-07-20T10:00:00.000Z";
    const fake = createFakeAdmin([
      {
        id: "lost-device",
        user_id: "u1",
        token_hash: hashCloudDeviceToken(
          "lost-token-token-token-token-token-token",
        ),
        name: "Móvil perdido",
        kind: "mobile",
        status: "active",
        created_at: now,
        last_seen_at: now,
        last_sync_at: now,
        revoked_at: null,
      },
      {
        id: "work-device",
        user_id: "u1",
        token_hash: hashCloudDeviceToken(
          "work-token-token-token-token-token-token",
        ),
        name: "Ordenador",
        kind: "computer",
        status: "active",
        created_at: now,
        last_seen_at: now,
        last_sync_at: now,
        revoked_at: null,
      },
    ]);
    supabaseAdmin.getSupabaseAdmin.mockReturnValue(fake.client);
    serverRepository.fetchUserSubscriptionServer.mockResolvedValue({
      userId: "u1",
      plan: "pro",
      status: "active",
    });

    const revoked = await revokeCloudDeviceForUser({
      userId: "u1",
      deviceId: "lost-device",
      currentToken: "new-token-token-token-token-token-token",
    });
    const claimed = await ensureCloudDeviceAccess({
      userId: "u1",
      token: "new-token-token-token-token-token-token",
      sessionId: SESSION_ONE,
      userAgent: "iPhone Mobile",
    });

    expect(revoked.ok).toBe(true);
    expect(fake.rows.find((row) => row.id === "lost-device")?.status).toBe(
      "revoked",
    );
    expect(claimed.allowed).toBe(true);
    expect(fake.rows.filter((row) => row.status === "active")).toHaveLength(2);
  });

  it("retires the current device when secure sign-out removes it", async () => {
    const token = "current-token-token-token-token-token-token";
    const fake = createFakeAdmin([
      {
        id: "current-device",
        user_id: "u1",
        token_hash: hashCloudDeviceToken(token),
        name: "Ordenador",
        kind: "computer",
        status: "active",
        created_at: "2026-07-20T10:00:00.000Z",
        last_seen_at: "2026-07-20T10:00:00.000Z",
        last_sync_at: "2026-07-20T10:00:00.000Z",
        revoked_at: null,
      },
    ]);
    supabaseAdmin.getSupabaseAdmin.mockReturnValue(fake.client);

    const result = await revokeCurrentCloudDeviceForUser({
      userId: "u1",
      currentToken: token,
    });

    expect(result.ok).toBe(true);
    expect(fake.rows[0]).toMatchObject({
      status: "revoked",
      revoked_at: expect.any(String),
    });
  });

  it("keeps Pro Plus available for multiple devices", () => {
    expect(cloudDeviceLimitForPlan("free")).toBe(0);
    expect(cloudDeviceLimitForPlan("pro")).toBe(2);
    expect(cloudDeviceLimitForPlan("trial")).toBe(2);
    expect(cloudDeviceLimitForPlan("pro_plus")).toBe(5);
    expect(inferCloudDeviceKind("Mozilla/5.0 iPad")).toBe("tablet");
  });
});
