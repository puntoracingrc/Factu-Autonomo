import { describe, expect, it, vi } from "vitest";

import type { CentralBusinessAuthorityActivation } from "./activation";
import {
  createCentralBusinessAuthorityStatusRouteHandler,
  type CentralBusinessAuthorityStatusRouteDependencies,
} from "./status-route-handler";
import type { CentralBusinessAuthorityStatusProbeClient } from "./status-readiness";

const activation: CentralBusinessAuthorityActivation = {
  requestedMode: "canary",
  effectiveMode: "canary",
  enabled: true,
  writesEnabled: true,
  appliesToUser: true,
  production: true,
  reason: "canary_enabled",
};

function probeClient(): CentralBusinessAuthorityStatusProbeClient {
  return {
    from() {
      return {
        select() {
          return { limit: async () => ({ error: null }) };
        },
      };
    },
    async rpc(name) {
      return {
        error: {
          code: "P0001",
          message:
            name === "mutate_central_business_entity_v1"
              ? "invalid central business mutation command"
              : "invalid central business event pull request",
        },
      };
    },
  };
}

function deps(
  overrides: Partial<CentralBusinessAuthorityStatusRouteDependencies> = {},
): CentralBusinessAuthorityStatusRouteDependencies {
  return {
    authenticate: vi.fn(async () => ({
      userId: "00000000-0000-4000-8000-000000000001",
      sessionId: "00000000-0000-4000-8000-000000000002",
      userEmail: "puntoracingrc@gmail.com",
    })),
    rateLimit: vi.fn(async () => ({ allowed: true as const })),
    verifyDevice: vi.fn(async () => ({
      allowed: true as const,
      deviceId: "device-hash",
    })),
    getProbeClient: vi.fn(() => probeClient()),
    evaluateActivation: vi.fn(() => activation),
    now: vi.fn(() => "2026-07-29T15:00:00.000Z"),
    ...overrides,
  };
}

function request(
  dependencies: CentralBusinessAuthorityStatusRouteDependencies,
  method = "GET",
) {
  return createCentralBusinessAuthorityStatusRouteHandler(dependencies).handle({
    method,
    headers: new Headers({
      authorization: "Bearer token",
      "x-factu-device-token": "device-token",
      "user-agent": "vitest",
    }),
  });
}

describe("central business authority status route", () => {
  it("solo declara escrituras posibles con activacion, dispositivo y schema listos", async () => {
    const response = await request(deps());
    expect(response.status).toBe(200);
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(response.body).toMatchObject({
      ok: true,
      readiness: { ready: true },
      summary: {
        writesPossible: true,
        modeAllowsWrites: true,
        serverSchemaReady: true,
        deviceVerified: true,
      },
    });
  });

  it("rechaza sesion o dispositivo antes de tocar Supabase", async () => {
    const noAuth = deps({ authenticate: vi.fn(async () => null) });
    expect((await request(noAuth)).status).toBe(401);
    expect(noAuth.getProbeClient).not.toHaveBeenCalled();

    const revoked = deps({
      verifyDevice: vi.fn(async () => ({
        allowed: false as const,
        status: 403,
        code: "device_revoked",
        message: "Dispositivo revocado.",
      })),
    });
    expect((await request(revoked)).status).toBe(403);
    expect(revoked.getProbeClient).not.toHaveBeenCalled();
  });

  it("informa schema bloqueado aunque el modo solicite escribir", async () => {
    const response = await request(deps({ getProbeClient: () => null }));
    expect(response.body).toMatchObject({
      readiness: { ready: false, blockers: ["missing_admin_client"] },
      summary: {
        writesPossible: false,
        modeAllowsWrites: true,
        serverSchemaReady: false,
      },
    });
  });

  it("expone solo GET y OPTIONS", async () => {
    const dependencies = deps();
    const response = await request(dependencies, "POST");
    expect(response.status).toBe(405);
    expect(response.headers.Allow).toBe("GET, OPTIONS");
    expect(dependencies.authenticate).not.toHaveBeenCalled();
  });
});
