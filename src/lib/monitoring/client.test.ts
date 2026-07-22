import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { getLocalCloudDeviceToken } from "@/lib/cloud/device-token";
import { reportAppError, reportAppRecovery } from "./client";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

vi.mock("@/lib/cloud/device-token", () => ({
  CLOUD_DEVICE_TOKEN_HEADER: "X-Factu-Device-Token",
  getLocalCloudDeviceToken: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getLocalCloudDeviceToken).mockReturnValue(
    "synthetic-device-token-000000000001",
  );
});

describe("reportAppError", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("solo confirma el registro cuando Admin responde ok", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "access-token" } },
        }),
      },
    } as never);
    vi.stubGlobal("window", {
      location: { pathname: "/test", search: "", hash: "" },
      navigator: { userAgent: "synthetic-agent" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ok: true })),
    );

    await expect(
      reportAppError({ area: "test", message: "Synthetic error" }),
    ).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "/api/monitoring/error",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Factu-Device-Token":
            "synthetic-device-token-000000000001",
        }),
      }),
    );
  });

  it.each([
    Response.json({ ok: false }, { status: 202 }),
    Response.json({ error: "unavailable" }, { status: 503 }),
  ])("no anuncia recepción para una respuesta no confirmada", async (response) => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "access-token" } },
        }),
      },
    } as never);
    vi.stubGlobal("window", {
      location: { pathname: "/test", search: "", hash: "" },
      navigator: { userAgent: "synthetic-agent" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(
      reportAppError({ area: "test", message: "Synthetic error" }),
    ).resolves.toBe(false);
  });
});

describe("reportAppRecovery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("binds the recovery to the captured authenticated subject", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "access-token",
              user: { id: "user-a" },
            },
          },
        }),
      },
    } as never);
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      reportAppRecovery("user-a", "sync_cycle_verified"),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/monitoring/recovery",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Factu-Device-Token":
            "synthetic-device-token-000000000001",
        }),
        body: JSON.stringify({ kind: "sync_cycle_verified" }),
        cache: "no-store",
        credentials: "omit",
        keepalive: true,
      }),
    );
  });

  it("does not confirm recovery without the local device token", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "access-token",
              user: { id: "user-a" },
            },
          },
        }),
      },
    } as never);
    vi.mocked(getLocalCloudDeviceToken).mockReturnValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      reportAppRecovery("user-a", "sync_cycle_verified"),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send a recovery after an account switch", async () => {
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "access-token-b",
              user: { id: "user-b" },
            },
          },
        }),
      },
    } as never);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      reportAppRecovery("user-a", "cloud_repair_verified"),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("waits for an in-flight error before confirming recovery", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          user: { id: "user-a" },
        },
      },
    });
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: { getSession },
    } as never);
    vi.stubGlobal("window", {
      location: { pathname: "/test", search: "", hash: "" },
      navigator: { userAgent: "synthetic-agent" },
    });

    let finishErrorReport!: (response: Response) => void;
    const errorResponse = new Promise<Response>((resolve) => {
      finishErrorReport = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => errorResponse)
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const errorOperation = reportAppError({
      area: "sync",
      code: "push_failed",
      message: "Synthetic failure",
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const recoveryOperation = reportAppRecovery(
      "user-a",
      "sync_push_verified",
    );
    await vi.waitFor(() => expect(getSession).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finishErrorReport(Response.json({ ok: true }));

    await expect(errorOperation).resolves.toBe(true);
    const recoveryResult = await recoveryOperation;
    expect(getSupabaseClientAsync).toHaveBeenCalledTimes(2);
    expect(getSession).toHaveBeenCalledTimes(3);
    expect(getLocalCloudDeviceToken).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/monitoring/error");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/monitoring/recovery");
    expect(recoveryResult).toBe(true);
  });
});
