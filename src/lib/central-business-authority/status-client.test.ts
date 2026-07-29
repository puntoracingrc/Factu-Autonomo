import { describe, expect, it, vi } from "vitest";

import { fetchCentralBusinessAuthorityStatusFromBrowser } from "./status-client";

const validPayload = {
  ok: true,
  schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_ROUTE_V1",
  activation: {
    requestedMode: "canary",
    effectiveMode: "canary",
    enabled: true,
    writesEnabled: true,
    appliesToUser: true,
    production: true,
    reason: "canary_enabled",
  },
  readiness: {
    schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS_V1",
    checkedAt: "2026-07-29T15:00:00.000Z",
    ready: true,
    checks: [
      {
        id: "table:central_business_entities",
        kind: "table",
        status: "ready",
        message: "ok",
        noBusinessRows: true,
        destructive: false,
      },
    ],
    blockers: [],
  },
  summary: {
    writesPossible: true,
    modeAllowsWrites: true,
    serverSchemaReady: true,
    deviceVerified: true,
  },
};

describe("central business authority status client", () => {
  it("envia sesion y dispositivo, exige no-store y valida la respuesta", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(validPayload, { status: 200 }),
    );
    const result = await fetchCentralBusinessAuthorityStatusFromBrowser({
      fetchImpl,
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });
    expect(result).toMatchObject({
      ok: true,
      summary: { writesPossible: true },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-business-authority/status",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "X-Factu-Device-Token": "device-token",
        }),
      }),
    );
  });

  it("falla cerrado sin credenciales, con red caida o payload incompleto", async () => {
    await expect(
      fetchCentralBusinessAuthorityStatusFromBrowser({
        getAccessToken: async () => null,
        getDeviceToken: () => null,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_STATUS_SESSION_REQUIRED",
    });
    await expect(
      fetchCentralBusinessAuthorityStatusFromBrowser({
        fetchImpl: async () => {
          throw new Error("offline");
        },
        getAccessToken: async () => "token",
        getDeviceToken: () => "device",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_STATUS_NETWORK_ERROR",
    });
    await expect(
      fetchCentralBusinessAuthorityStatusFromBrowser({
        fetchImpl: async () => Response.json({ ok: true }),
        getAccessToken: async () => "token",
        getDeviceToken: () => "device",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_STATUS_INVALID_RESPONSE",
    });
  });
});
