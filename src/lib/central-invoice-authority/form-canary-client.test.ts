import { describe, expect, it, vi } from "vitest";

import {
  CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT,
  isCentralInvoiceAuthorityFormCanaryEnabled,
  issueCentralInvoiceAuthorityFromBrowser,
  type CentralInvoiceAuthorityFormIssueRequest,
} from "./form-canary-client";

function request(): CentralInvoiceAuthorityFormIssueRequest {
  return {
    kind: "invoice",
    idempotencyKey: "FORM_CANARY_SYNTHETIC_001",
    draft: {
      localDocumentId: "local-draft-1",
      expectedVersion: 0,
      draftHash: "sha256:draft",
    },
    series: {
      environment: "test",
      issuerNif: "B00000000",
      seriesCode: "F-2026",
      fiscalYear: 2026,
    },
    issuedAt: "2026-07-27T12:00:00.000Z",
    documentPayload: { synthetic: true },
    emittedSnapshot: { syntheticSnapshot: true },
    emittedHash: "sha256:emitted",
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function readyStatusPayload(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE_V1",
    activation: {
      requestedMode: "canary",
      effectiveMode: "canary",
      enabled: true,
      fiscalWritesEnabled: true,
      appliesToUser: true,
      production: false,
      reason: "canary_allowlisted",
    },
    readiness: {
      schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
      checkedAt: "2026-07-28T08:30:00.000Z",
      ready: true,
      checks: [
        {
          id: "issue_rpc",
          kind: "rpc",
          status: "ready",
          message: "RPC de emision disponible.",
          noBusinessRows: true,
          destructive: false,
        },
      ],
      blockers: [],
    },
    summary: {
      fiscalWritesPossible: true,
      modeAllowsWrites: true,
      serverSchemaReady: true,
      deviceVerified: true,
    },
    ...overrides,
  };
}

describe("central invoice authority form canary client", () => {
  it("permanece apagado salvo bandera publica explicita", () => {
    expect(isCentralInvoiceAuthorityFormCanaryEnabled({})).toBe(false);
    expect(
      isCentralInvoiceAuthorityFormCanaryEnabled({
        NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY: "true",
      }),
    ).toBe(true);
  });

  it("no contacta la ruta sin sesion o dispositivo", async () => {
    const fetchImpl = vi.fn();
    const result = await issueCentralInvoiceAuthorityFromBrowser(request(), {
      fetchImpl,
      getAccessToken: async () => null,
      getDeviceToken: () => "device-token",
    });

    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("comprueba status antes de emitir y transforma la identidad segura", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (url === "/api/central-invoice-authority/status") {
        return jsonResponse(200, readyStatusPayload());
      }
      return jsonResponse(200, {
        ok: true,
        rpcResult: {
          documentId: "server-doc-1",
          identityId: "identity-1",
          outboxEventId: "outbox-1",
          fullNumber: "F-2026-0001",
          sequence: 1,
          documentVersion: 1,
        },
      });
    });

    const result = await issueCentralInvoiceAuthorityFromBrowser(request(), {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
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
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "/api/central-invoice-authority/issue",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "X-Factu-Device-Token": "device-token",
        }),
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT,
      identity: {
        kind: "factura",
        fiscalYear: 2026,
        sequence: 1,
        fullNumber: "F-2026-0001",
      },
    });
    expect(JSON.stringify(result)).not.toContain("syntheticSnapshot");
  });

  it("falla cerrado si el status central no permite escrituras fiscales", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        200,
        readyStatusPayload({
          activation: {
            requestedMode: "canary",
            effectiveMode: "shadow",
            enabled: true,
            fiscalWritesEnabled: false,
            appliesToUser: true,
            production: false,
            reason: "shadow_mode",
          },
          readiness: {
            schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
            checkedAt: "2026-07-28T08:30:00.000Z",
            ready: false,
            checks: [
              {
                id: "issue_rpc",
                kind: "rpc",
                status: "blocked",
                message: "RPC de emision no disponible.",
                noBusinessRows: true,
                destructive: false,
              },
            ],
            blockers: ["RPC de emision no disponible."],
          },
          summary: {
            fiscalWritesPossible: false,
            modeAllowsWrites: false,
            serverSchemaReady: false,
            deviceVerified: true,
          },
        }),
      ),
    );

    const result = await issueCentralInvoiceAuthorityFromBrowser(request(), {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-invoice-authority/status",
      expect.any(Object),
    );
    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: "CENTRAL_AUTHORITY_PREFLIGHT_BLOCKED",
      message:
        "El servidor central no esta listo para emitir facturas: RPC de emision no disponible.",
    });
  });

  it("rechaza respuestas exitosas sin identidad fiscal completa", async () => {
    const result = await issueCentralInvoiceAuthorityFromBrowser(request(), {
      fetchImpl: vi.fn(async (url: RequestInfo | URL) => {
        if (url === "/api/central-invoice-authority/status") {
          return jsonResponse(200, readyStatusPayload());
        }
        return jsonResponse(200, {
          ok: true,
          rpcResult: { fullNumber: "F-2026-0001" },
        });
      }),
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_AUTHORITY_INVALID_RESPONSE",
    });
  });

  it("convierte errores de ruta en errores seguros para el formulario", async () => {
    const result = await issueCentralInvoiceAuthorityFromBrowser(request(), {
      fetchImpl: vi.fn(async (url: RequestInfo | URL) => {
        if (url === "/api/central-invoice-authority/status") {
          return jsonResponse(200, readyStatusPayload());
        }
        return jsonResponse(409, {
          ok: false,
          error: {
            code: "CENTRAL_AUTHORITY_DISABLED",
            message: "Canary apagado",
          },
        });
      }),
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: "CENTRAL_AUTHORITY_DISABLED",
      message: "Canary apagado",
    });
  });
});
