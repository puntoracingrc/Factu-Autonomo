import { describe, expect, it, vi } from "vitest";

import {
  CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT,
  pullCentralInvoiceAuthorityEventsFromBrowser,
} from "./events-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function eventPayload(overrides: Record<string, unknown> = {}) {
  return {
    schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1",
    eventId: "event-1",
    documentId: "document-1",
    identityId: "identity-1",
    eventType: "invoice_issued",
    createdAt: "2026-07-27T12:00:00.000Z",
    fullNumber: "F-2026-0001",
    sequence: 1,
    documentVersion: 1,
    documentPayload: {
      id: "local-document-1",
      number: "F-2026-0001",
      total: 121,
    },
    emittedHash: "sha256:document",
    safeSummary: {
      kind: "invoice",
      fullNumber: "F-2026-0001",
    },
    ...overrides,
  };
}

describe("central invoice authority events client", () => {
  it("no contacta la ruta sin sesion o dispositivo local", async () => {
    const fetchImpl = vi.fn();
    const result = await pullCentralInvoiceAuthorityEventsFromBrowser(
      {},
      {
        fetchImpl,
        getAccessToken: async () => null,
        getDeviceToken: () => "device-token",
      },
    );

    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("lee eventos con bearer, token de dispositivo y cursor seguro", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        ok: true,
        schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE_V1",
        events: [eventPayload()],
        nextCursor: {
          afterCreatedAt: "2026-07-27T12:00:00.000Z",
          afterEventId: "event-1",
        },
      }),
    );

    const result = await pullCentralInvoiceAuthorityEventsFromBrowser(
      {
        afterCreatedAt: "2026-07-27T11:00:00.000Z",
        afterEventId: "00000000-0000-4000-8000-000000000001",
        limit: 500,
      },
      {
        fetchImpl,
        getAccessToken: async () => "access-token",
        getDeviceToken: () => "device-token",
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-invoice-authority/events?afterCreatedAt=2026-07-27T11%3A00%3A00.000Z&afterEventId=00000000-0000-4000-8000-000000000001&limit=100",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "X-Factu-Device-Token": "device-token",
        }),
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT,
      events: [
        {
          eventId: "event-1",
          fullNumber: "F-2026-0001",
          documentVersion: 1,
        },
      ],
      nextCursor: {
        afterEventId: "event-1",
      },
    });
    expect(JSON.stringify(result)).not.toContain("emittedSnapshot");
  });

  it("convierte errores de ruta en errores seguros para sincronizacion", async () => {
    const result = await pullCentralInvoiceAuthorityEventsFromBrowser(
      {},
      {
        fetchImpl: vi.fn(async () =>
          jsonResponse(403, {
            ok: false,
            error: {
              code: "DEVICE_LIMIT_REACHED",
              message: "Este dispositivo no tiene acceso.",
            },
          }),
        ),
        getAccessToken: async () => "access-token",
        getDeviceToken: () => "device-token",
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: "DEVICE_LIMIT_REACHED",
      message: "Este dispositivo no tiene acceso.",
    });
  });

  it("rechaza payloads exitosos sin eventos completos", async () => {
    const result = await pullCentralInvoiceAuthorityEventsFromBrowser(
      {},
      {
        fetchImpl: vi.fn(async () =>
          jsonResponse(200, {
            ok: true,
            schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE_V1",
            events: [eventPayload({ sequence: 0 })],
            nextCursor: null,
          }),
        ),
        getAccessToken: async () => "access-token",
        getDeviceToken: () => "device-token",
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: "CENTRAL_AUTHORITY_EVENTS_INVALID_RESPONSE",
    });
  });

  it("usa limite conservador si el llamador pasa un valor no entero", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        ok: true,
        schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_ROUTE_V1",
        events: [],
        nextCursor: null,
      }),
    );

    await pullCentralInvoiceAuthorityEventsFromBrowser(
      { limit: 3.5 },
      {
        fetchImpl,
        getAccessToken: async () => "access-token",
        getDeviceToken: () => "device-token",
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-invoice-authority/events?limit=50",
      expect.any(Object),
    );
  });
});
