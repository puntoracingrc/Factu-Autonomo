import { describe, expect, it, vi } from "vitest";

import type { CentralInvoiceAuthorityActivation } from "./activation";
import {
  createCentralInvoiceAuthorityAccountSeriesReconciliationRouteHandler,
  type CentralInvoiceAuthorityAccountSeriesReconciliationRouteDependencies,
} from "./account-series-reconciliation-route-handler";

const activeCanary: CentralInvoiceAuthorityActivation = {
  requestedMode: "canary",
  effectiveMode: "canary",
  enabled: true,
  fiscalWritesEnabled: true,
  appliesToUser: true,
  production: true,
  reason: "canary_enabled",
};

function rawBody(environment: "test" | "production" = "test") {
  return JSON.stringify({
    schema:
      "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_REQUEST_V1",
    confirmed: true,
    summaries: [
      {
        environment,
        issuerNif: "00000000T",
        seriesCode: "F-2026",
        fiscalYear: 2026,
        observedMaxSequence: 2955,
        sourceDocumentCount: 936,
        sourceDigest: `sha256:${"a".repeat(64)}`,
      },
    ],
  });
}

function deps(
  overrides: Partial<CentralInvoiceAuthorityAccountSeriesReconciliationRouteDependencies> = {},
): CentralInvoiceAuthorityAccountSeriesReconciliationRouteDependencies {
  return {
    authenticate: vi.fn(async () => ({
      userId: "00000000-0000-4000-8000-000000000001",
      userEmail: "puntoracingrc@gmail.com",
      sessionId: "00000000-0000-4000-8000-000000000002",
    })),
    rateLimit: vi.fn(async () => ({ allowed: true as const })),
    verifyDevice: vi.fn(async () => ({
      allowed: true as const,
      deviceId: "sha256:synthetic-device",
    })),
    getRpcClient: vi.fn(() => ({
      rpc: vi.fn(async () => ({
        data: [
          {
            result_status: "committed",
            reconciliation_id:
              "00000000-0000-4000-8000-000000000003",
            previous_sequence: 0,
            resulting_sequence: 2955,
          },
        ],
        error: null,
      })),
    })),
    evaluateActivation: vi.fn(() => activeCanary),
    env: { CENTRAL_INVOICE_AUTHORITY_CANARY_TEST_ONLY: "true" },
    ...overrides,
  };
}

async function request(
  dependencies: CentralInvoiceAuthorityAccountSeriesReconciliationRouteDependencies,
  input: {
    method?: string;
    raw?: string;
    authorization?: string | null;
  } = {},
) {
  const headers = new Headers({
    "x-factu-device-token": "device-token",
    "user-agent": "vitest",
  });
  if (input.authorization !== null) {
    headers.set("authorization", input.authorization ?? "Bearer token");
  }
  return createCentralInvoiceAuthorityAccountSeriesReconciliationRouteHandler(
    dependencies,
  ).handle({
    method: input.method ?? "POST",
    headers,
    readBody: () => Promise.resolve(input.raw ?? rawBody()),
  });
}

describe("central authority account series reconciliation route", () => {
  it("rechaza sesion ausente y no lee ni reconcilia", async () => {
    const rpc = vi.fn();
    const dependencies = deps({
      authenticate: vi.fn(async () => null),
      getRpcClient: vi.fn(() => ({ rpc })),
    });
    const response = await request(dependencies, { authorization: null });

    expect(response.status).toBe(401);
    expect(dependencies.verifyDevice).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("exige confirmacion explicita y un resumen acotado", async () => {
    const dependencies = deps();
    const response = await request(dependencies, {
      raw: JSON.stringify({
        schema:
          "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_REQUEST_V1",
        confirmed: false,
        summaries: [],
      }),
    });

    expect(response.status).toBe(400);
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("bloquea series production en el canario test-only", async () => {
    const rpc = vi.fn();
    const dependencies = deps({
      getRpcClient: vi.fn(() => ({ rpc })),
    });
    const response = await request(dependencies, {
      raw: rawBody("production"),
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: { code: "CENTRAL_AUTHORITY_CANARY_TEST_ONLY" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reconcilia con identidad de servidor y devuelve solo evidencia segura", async () => {
    const rpc = vi.fn(async (_name, args) => ({
      data: [
        {
          result_status: "committed",
          reconciliation_id: "reconciliation-1",
          previous_sequence: 0,
          resulting_sequence: 2955,
        },
      ],
      error: null,
      args,
    }));
    const dependencies = deps({
      getRpcClient: vi.fn(() => ({ rpc })),
    });
    const response = await request(dependencies);
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc.mock.calls[0][1].p_user_id).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(serialized).toContain("reconciliation-1");
    expect(serialized).not.toContain("sessionId");
    expect(response.headers["Cache-Control"]).toContain("no-store");
  });

  it("falla cerrado si la activacion no permite escrituras", async () => {
    const dependencies = deps({
      evaluateActivation: vi.fn(
        (): CentralInvoiceAuthorityActivation => ({
          ...activeCanary,
          effectiveMode: "off",
          enabled: false,
          fiscalWritesEnabled: false,
          reason: "user_not_allowlisted",
        }),
      ),
    });
    const response = await request(dependencies);

    expect(response.status).toBe(409);
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });
});
