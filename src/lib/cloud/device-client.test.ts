import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import {
  releaseCurrentCloudDeviceSession,
  retireCurrentCloudDevice,
} from "./device-client";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

describe("cloud device client", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    values.set("factura-autonomo-cloud-device-token-v1", "x".repeat(64));
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "test-access-token" } },
        }),
      },
    } as never);
  });

  afterEach(() => {
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
    expect(
      values.get("factura-autonomo-cloud-device-token-v1"),
    ).toBeUndefined();
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
    expect(values.get("factura-autonomo-cloud-device-token-v1")).toBe(
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
    expect(values.get("factura-autonomo-cloud-device-token-v1")).toBe(
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
});
