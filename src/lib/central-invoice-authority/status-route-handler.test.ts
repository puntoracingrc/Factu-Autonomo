import { describe, expect, it, vi } from "vitest";

import {
  type CentralInvoiceAuthorityActivation,
} from "./activation";
import {
  createCentralInvoiceAuthorityStatusRouteHandler,
  type CentralInvoiceAuthorityStatusRouteDependencies,
} from "./status-route-handler";
import type { CentralInvoiceAuthorityStatusProbeClient } from "./status-readiness";

const userId = "00000000-0000-4000-8000-000000000001";
const sessionId = "00000000-0000-4000-8000-000000000002";
const userEmail = "puntoracingrc@gmail.com";

const activeActivation: CentralInvoiceAuthorityActivation = {
  requestedMode: "required",
  effectiveMode: "required",
  enabled: true,
  fiscalWritesEnabled: true,
  appliesToUser: true,
  production: false,
  reason: "required_enabled",
};

const disabledActivation: CentralInvoiceAuthorityActivation = {
  requestedMode: "off",
  effectiveMode: "off",
  enabled: false,
  fiscalWritesEnabled: false,
  appliesToUser: false,
  production: false,
  reason: "disabled",
};

function readyProbeClient(): CentralInvoiceAuthorityStatusProbeClient {
  return {
    from() {
      return {
        select() {
          return {
            async limit() {
              return { data: null, error: null };
            },
          };
        },
      };
    },
    async rpc(name) {
      return {
        data: null,
        error:
          name === "issue_central_invoice_v1"
            ? {
                code: "P0001",
                message: "invalid central invoice issue command",
              }
            : {
                code: "P0001",
                message: "invalid central invoice event pull request",
              },
      };
    },
  };
}

function deps(
  overrides: Partial<CentralInvoiceAuthorityStatusRouteDependencies> = {},
): CentralInvoiceAuthorityStatusRouteDependencies {
  return {
    authenticate: vi.fn(async () => ({ userId, sessionId, userEmail })),
    rateLimit: vi.fn(async () => ({ allowed: true as const })),
    verifyDevice: vi.fn(async () => ({
      allowed: true as const,
      deviceId: "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
    })),
    getProbeClient: vi.fn(() => readyProbeClient()),
    evaluateActivation: vi.fn(() => disabledActivation),
    now: vi.fn(() => "2026-07-27T12:00:00.000Z"),
    ...overrides,
  };
}

async function request(
  dependencies: CentralInvoiceAuthorityStatusRouteDependencies,
  input: {
    method?: string;
    authorization?: string | null;
    deviceToken?: string | null;
    url?: string;
  } = {},
) {
  const handler = createCentralInvoiceAuthorityStatusRouteHandler(dependencies);
  const headers = new Headers();
  if (input.authorization !== null) {
    headers.set("authorization", input.authorization ?? "Bearer token");
  }
  if (input.deviceToken !== null) {
    headers.set("x-factu-device-token", input.deviceToken ?? "device-token");
  }
  headers.set("user-agent", "vitest");

  return handler.handle({
    method: input.method ?? "GET",
    headers,
    url:
      input.url ??
      "http://localhost/api/central-invoice-authority/status",
  });
}

describe("central invoice authority status route handler", () => {
  it("rechaza metodos no permitidos antes de autenticar", async () => {
    const dependencies = deps();
    const response = await request(dependencies, { method: "POST" });

    expect(response.status).toBe(405);
    expect(response.headers.Allow).toBe("GET, OPTIONS");
    expect(dependencies.authenticate).not.toHaveBeenCalled();
    expect(dependencies.getProbeClient).not.toHaveBeenCalled();
  });

  it("requiere sesion confirmada antes de rate limit o Supabase", async () => {
    const dependencies = deps({ authenticate: vi.fn(async () => null) });
    const response = await request(dependencies, { authorization: null });

    expect(response.status).toBe(401);
    expect(dependencies.rateLimit).not.toHaveBeenCalled();
    expect(dependencies.verifyDevice).not.toHaveBeenCalled();
    expect(dependencies.getProbeClient).not.toHaveBeenCalled();
  });

  it("bloquea dispositivos invalidos antes del preflight", async () => {
    const dependencies = deps({
      verifyDevice: vi.fn(async () => ({
        allowed: false as const,
        status: 403,
        code: "device_revoked",
        message: "Dispositivo revocado.",
      })),
    });
    const response = await request(dependencies);

    expect(response.status).toBe(403);
    expect(dependencies.getProbeClient).not.toHaveBeenCalled();
  });

  it("devuelve estado no-store con escritura fiscal imposible si el modo esta apagado", async () => {
    const dependencies = deps();
    const response = await request(dependencies);
    const body = response.body as {
      ok: boolean;
      readiness: { ready: boolean };
      summary: { fiscalWritesPossible: boolean; serverSchemaReady: boolean };
    };

    expect(response.status).toBe(200);
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(response.headers.Vary).toContain("Authorization");
    expect(body.ok).toBe(true);
    expect(body.readiness.ready).toBe(true);
    expect(body.summary).toEqual({
      fiscalWritesPossible: false,
      modeAllowsWrites: false,
      serverSchemaReady: true,
      deviceVerified: true,
    });
    expect(JSON.stringify(body)).not.toContain("documentPayload");
    expect(JSON.stringify(body)).not.toContain("emittedSnapshot");
  });

  it("solo permite escritura fiscal cuando activacion y esquema estan listos", async () => {
    const dependencies = deps({
      evaluateActivation: vi.fn(() => activeActivation),
    });
    const response = await request(dependencies);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      activation: { reason: "required_enabled" },
      readiness: { ready: true },
      summary: {
        fiscalWritesPossible: true,
        modeAllowsWrites: true,
        serverSchemaReady: true,
        deviceVerified: true,
      },
    });
    expect(dependencies.evaluateActivation).toHaveBeenCalledWith({
      userId,
      userEmail,
    });
  });

  it("expone bloqueo de schema aunque los flags pidan activar", async () => {
    const dependencies = deps({
      evaluateActivation: vi.fn(() => activeActivation),
      getProbeClient: vi.fn(() => null),
    });
    const response = await request(dependencies);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      readiness: {
        ready: false,
        blockers: ["missing_admin_client"],
      },
      summary: {
        fiscalWritesPossible: false,
        modeAllowsWrites: true,
        serverSchemaReady: false,
        deviceVerified: true,
      },
    });
  });
});
