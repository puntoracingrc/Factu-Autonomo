import { describe, expect, it, vi } from "vitest";

import {
  CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT,
  fetchCentralInvoiceAuthorityStatusFromBrowser,
} from "./status-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function statusPayload(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE_V1",
    activation: {
      requestedMode: "off",
      effectiveMode: "off",
      enabled: false,
      fiscalWritesEnabled: false,
      appliesToUser: false,
      production: false,
      reason: "disabled",
    },
    readiness: {
      schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
      checkedAt: "2026-07-28T08:00:00.000Z",
      ready: true,
      checks: [
        {
          id: "admin_client",
          kind: "configuration",
          status: "ready",
          message: "Cliente servidor disponible.",
          noBusinessRows: true,
          destructive: false,
        },
      ],
      blockers: [],
    },
    summary: {
      fiscalWritesPossible: false,
      modeAllowsWrites: false,
      serverSchemaReady: true,
      deviceVerified: true,
    },
    ...overrides,
  };
}

describe("central invoice authority status client", () => {
  it("no contacta la ruta sin sesion o dispositivo local", async () => {
    const fetchImpl = vi.fn();
    const result = await fetchCentralInvoiceAuthorityStatusFromBrowser({
      fetchImpl,
      getAccessToken: async () => null,
      getDeviceToken: () => "device-token",
    });

    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("lee el status con bearer, token de dispositivo y no-store", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, statusPayload()));

    const result = await fetchCentralInvoiceAuthorityStatusFromBrowser({
      fetchImpl,
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-invoice-authority/status",
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
      schema: CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT,
      readiness: { ready: true },
      summary: {
        fiscalWritesPossible: false,
        serverSchemaReady: true,
      },
    });
    expect(JSON.stringify(result)).not.toContain("emittedSnapshot");
  });

  it("convierte errores de ruta en errores seguros para UI", async () => {
    const result = await fetchCentralInvoiceAuthorityStatusFromBrowser({
      fetchImpl: vi.fn(async () =>
        jsonResponse(403, {
          ok: false,
          error: {
            code: "device_revoked",
            message: "Dispositivo revocado.",
          },
        }),
      ),
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: "device_revoked",
      message: "Dispositivo revocado.",
    });
  });

  it("rechaza respuestas que no garanticen lectura no destructiva", async () => {
    const result = await fetchCentralInvoiceAuthorityStatusFromBrowser({
      fetchImpl: vi.fn(async () =>
        jsonResponse(
          200,
          statusPayload({
            readiness: {
              schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
              checkedAt: "2026-07-28T08:00:00.000Z",
              ready: true,
              checks: [
                {
                  id: "admin_client",
                  kind: "configuration",
                  status: "ready",
                  message: "Cliente servidor disponible.",
                  noBusinessRows: true,
                  destructive: true,
                },
              ],
              blockers: [],
            },
          }),
        ),
      ),
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: "CENTRAL_AUTHORITY_STATUS_INVALID_RESPONSE",
    });
  });
});
