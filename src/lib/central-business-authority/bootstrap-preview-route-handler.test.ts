import { describe, expect, it, vi } from "vitest";

import type { CentralBusinessBootstrapCentralRow } from "./bootstrap-preview";
import { createCentralBusinessBootstrapPreviewRouteHandler } from "./bootstrap-preview-route-handler";

function request(
  method = "POST",
  body = JSON.stringify({
    entities: [
      {
        entityType: "customer",
        entityId: "customer-a",
        payload: { id: "customer-a", name: "Cliente A" },
      },
    ],
  }),
) {
  return {
    method,
    headers: new Headers({
      authorization: "Bearer synthetic",
      "x-factu-device-token": "synthetic-device",
    }),
    readBody: async () => body,
  };
}

function dependencies() {
  return {
    authenticate: vi.fn(
      async (): Promise<{
        userId: string;
        sessionId: string;
      } | null> => ({
        userId: "user-a",
        sessionId: "session-a",
      }),
    ),
    rateLimit: vi.fn(async () => ({ allowed: true as const })),
    verifyDevice: vi.fn(async () => ({
      allowed: true as const,
      deviceId: "device-a",
    })),
    listCentralEntities: vi.fn(
      async (): Promise<CentralBusinessBootstrapCentralRow[] | null> => [],
    ),
  };
}

describe("central business bootstrap preview route", () => {
  it("autentica y verifica el dispositivo antes de leer datos", async () => {
    const deps = dependencies();
    deps.authenticate.mockResolvedValueOnce(null);
    const handler = createCentralBusinessBootstrapPreviewRouteHandler(deps);

    const result = await handler.handle(request());

    expect(result.status).toBe(401);
    expect(deps.verifyDevice).not.toHaveBeenCalled();
    expect(deps.listCentralEntities).not.toHaveBeenCalled();
    expect(result.headers["Cache-Control"]).toContain("no-store");
  });

  it("devuelve una vista previa privada sin payloads", async () => {
    const deps = dependencies();
    const handler = createCentralBusinessBootstrapPreviewRouteHandler(deps);

    const result = await handler.handle(request());

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      schema: "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_ROUTE_V1",
      preview: {
        summary: { create: 1, conflict: 0 },
        canCommit: true,
      },
    });
    expect(JSON.stringify(result.body)).not.toContain("Cliente A");
    expect(deps.listCentralEntities).toHaveBeenCalledWith("user-a");
  });

  it("abstiene cuando la lectura central no está disponible", async () => {
    const deps = dependencies();
    deps.listCentralEntities.mockResolvedValueOnce(null);
    const handler = createCentralBusinessBootstrapPreviewRouteHandler(deps);

    const result = await handler.handle(request());

    expect(result.status).toBe(503);
    expect(result.body).toEqual({
      ok: false,
      error: { code: "CENTRAL_BUSINESS_BOOTSTRAP_UNAVAILABLE" },
    });
  });

  it("rechaza duplicados y métodos no admitidos", async () => {
    const deps = dependencies();
    const handler = createCentralBusinessBootstrapPreviewRouteHandler(deps);
    const duplicate = JSON.stringify({
      entities: [
        {
          entityType: "customer",
          entityId: "customer-a",
          payload: { id: "customer-a" },
        },
        {
          entityType: "customer",
          entityId: "customer-a",
          payload: { id: "customer-a" },
        },
      ],
    });

    expect((await handler.handle(request("GET"))).status).toBe(405);
    expect((await handler.handle(request("POST", duplicate))).body).toEqual({
      ok: false,
      error: { code: "DUPLICATE_BOOTSTRAP_ENTITY" },
    });
  });
});
