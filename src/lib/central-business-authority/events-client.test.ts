import { describe, expect, it, vi } from "vitest";

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
