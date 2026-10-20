import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import {
  cloudDeviceTokenStorageKey,
} from "@/lib/cloud/device-token";
import { setActiveWorkspaceOwnerScope } from "@/lib/workspace-owner-runtime";
import {
  registerCurrentCloudDevice,
  recoverRevokedCloudDeviceAfterFreshSignIn,
  releaseCurrentCloudDeviceSession,
  retireCurrentCloudDevice,
} from "./device-client";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

describe("cloud device client", () => {
  const USER_ID = "cloud-device-user-0001";
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    setActiveWorkspaceOwnerScope(USER_ID);
    values.set(cloudDeviceTokenStorageKey(USER_ID), "x".repeat(64));
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "test-access-token",
              user: { id: USER_ID },
            },
          },
        }),
      },
    } as never);
  });

  afterEach(() => {
    setActiveWorkspaceOwnerScope(null);
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("forgets the token only after the server retires the current device", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ plan: "pro", limit: 2, devices: [] }),
        ),
    );

    const result = await retireCurrentCloudDevice();

    expect(result.error).toBeUndefined();
    expect(values.get(cloudDeviceTokenStorageKey(USER_ID))).toBeUndefined();
  });

  it("keeps the token when the server cannot release the slot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            plan: "pro",
            limit: 2,
            devices: [],
            error: "No se pudo retirar",
          },
          { status: 400 },
        ),
      ),
    );

    const result = await retireCurrentCloudDevice();

    expect(result.error).toBe("No se pudo retirar");
    expect(values.get(cloudDeviceTokenStorageKey(USER_ID))).toBe(
      "x".repeat(64),
    );
  });

  it("releases the session lease without deleting the device token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(releaseCurrentCloudDeviceSession()).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cloud/devices/session",
      expect.objectContaining({ method: "DELETE", keepalive: true }),
    );
    expect(values.get(cloudDeviceTokenStorageKey(USER_ID))).toBe(
      "x".repeat(64),
    );
  });

  it("does not create a device token just to close a session", async () => {
    values.clear();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(releaseCurrentCloudDeviceSession()).resolves.toBe(true);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
  });

  it("notifies central auto-sync after registering an allowed device", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        plan: "pro_plus",
        limit: 5,
        devices: [],
        allowed: true,
      }),
    );
    const dispatchEvent = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { dispatchEvent });

    const result = await registerCurrentCloudDevice();

    expect(result.allowed).toBe(true);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it("does not emit a reactivation wakeup for a routine heartbeat", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          plan: "pro_plus",
          limit: 5,
          devices: [],
          allowed: true,
        }),
      ),
    );
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });

    const result = await registerCurrentCloudDevice({
      markSynced: true,
      notifyReactivated: false,
    });

    expect(result.allowed).toBe(true);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("replaces a revoked token only after a fresh sign-in", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            plan: "pro_plus",
            limit: 5,
            devices: [],
            allowed: false,
            reason: "device_revoked",
            message: "Dispositivo desactivado.",
          },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          plan: "pro_plus",
          limit: 5,
          devices: [],
          allowed: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
        .mockReturnValueOnce("00000000-0000-4000-8000-000000000002"),
    });
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });

    const result = await recoverRevokedCloudDeviceAfterFreshSignIn();

    expect(result.allowed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(values.get(cloudDeviceTokenStorageKey(USER_ID))).toBe(
      "00000000-0000-4000-8000-000000000001.00000000-0000-4000-8000-000000000002",
    );
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it("keeps an active token unchanged after a fresh sign-in", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        plan: "pro_plus",
        limit: 5,
        devices: [],
        allowed: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await recoverRevokedCloudDeviceAfterFreshSignIn();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(values.get(cloudDeviceTokenStorageKey(USER_ID))).toBe(
      "x".repeat(64),
    );
  });

  it("coalesces concurrent identical claims but does not cache completed authorization", async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", fetchMock);
    const first = registerCurrentCloudDevice({ notifyReactivated: false });
    const second = registerCurrentCloudDevice({ notifyReactivated: false });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    resolve(Response.json({ plan: "pro", limit: null, devices: [], allowed: true }));
    expect((await first).allowed).toBe(true);
    expect((await second).allowed).toBe(true);
    fetchMock.mockResolvedValueOnce(Response.json({ plan: "pro", devices: [], allowed: false, reason: "device_revoked" }));
    expect((await registerCurrentCloudDevice({ notifyReactivated: false })).reason).toBe("device_revoked");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a sync stamp separate from ordinary registration", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ plan: "pro", devices: [], allowed: true }));
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([
      registerCurrentCloudDevice({ notifyReactivated: false }),
      registerCurrentCloudDevice({ notifyReactivated: false, markSynced: true }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves rate-limit and authentication messages instead of hiding their cause", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Demasiados intentos" }, { status: 429 })));
    expect((await registerCurrentCloudDevice()).error).toBe("Demasiados intentos");
  });
});
