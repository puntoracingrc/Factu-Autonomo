import { afterEach, describe, expect, it, vi } from "vitest";

import { CLOUD_DEVICE_TOKEN_STORAGE_KEY } from "@/lib/cloud/device-token";
import { pullCentralBusinessEventsFromBrowser } from "./events-client";

const event = {
  schema: "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1",
  eventId: "event-1",
  eventSequence: 7,
  entityType: "customer",
  entityId: "customer-1",
  entityVersion: 2,
  operationKind: "upsert",
  payload: { id: "customer-1", name: "Synthetic" },
  contentHash: "hash-2",
  actorDeviceId: "device-hash",
  createdAt: "2026-07-29T16:00:00.000Z",
};

describe("central business events client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lee por cursor monotono y valida cada evento", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        ok: true,
        schema: "CENTRAL_BUSINESS_EVENTS_ROUTE_V1",
        events: [event],
        nextSequence: 7,
        hasMore: false,
      }),
    );
    const result = await pullCentralBusinessEventsFromBrowser(
      { afterSequence: 5, limit: 25 },
      {
        fetchImpl,
        getAccessToken: async () => "access-token",
        getDeviceToken: () => "device-token",
      },
    );

    expect(result).toMatchObject({
      ok: true,
      nextSequence: 7,
      events: [{ entityVersion: 2 }],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-business-authority/events?afterSequence=5&limit=25",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
  });

  it("crea un token local de dispositivo antes de recibir eventos centrales", async () => {
    const storage = new Map<string, string>();
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222");
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    vi.stubGlobal("crypto", { randomUUID });
    const fetchCalls: Parameters<typeof fetch>[] = [];
    const fetchImpl: typeof fetch = async (...args) => {
      fetchCalls.push(args);
      return Response.json({
        ok: true,
        schema: "CENTRAL_BUSINESS_EVENTS_ROUTE_V1",
        events: [],
        nextSequence: 0,
        hasMore: false,
      });
    };

    const result = await pullCentralBusinessEventsFromBrowser(
      { afterSequence: 0, limit: 1 },
      {
        fetchImpl,
        getAccessToken: async () => "access-token",
      },
    );

    expect(result).toMatchObject({ ok: true, nextSequence: 0 });
    const [, init] = fetchCalls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("X-Factu-Device-Token")).toBe(
      "11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222",
    );
    expect(storage.get(CLOUD_DEVICE_TOKEN_STORAGE_KEY)).toBe(
      headers.get("X-Factu-Device-Token"),
    );
  });

  it("no avanza ante red o evento invalido", async () => {
    await expect(
      pullCentralBusinessEventsFromBrowser(
        {},
        {
          fetchImpl: async () => {
            throw new Error("offline");
          },
          getAccessToken: async () => "token",
          getDeviceToken: () => "device",
        },
      ),
    ).resolves.toMatchObject({
      ok: false,
      retryable: true,
      code: "CENTRAL_BUSINESS_EVENTS_NETWORK_ERROR",
    });

    await expect(
      pullCentralBusinessEventsFromBrowser(
        {},
        {
          fetchImpl: async () =>
            Response.json({
              ok: true,
              schema: "CENTRAL_BUSINESS_EVENTS_ROUTE_V1",
              events: [{ ...event, entityVersion: 0 }],
              nextSequence: 7,
              hasMore: false,
            }),
          getAccessToken: async () => "token",
          getDeviceToken: () => "device",
        },
      ),
    ).resolves.toMatchObject({
      ok: false,
      retryable: true,
      code: "CENTRAL_BUSINESS_EVENTS_INVALID_RESPONSE",
    });
  });
});
