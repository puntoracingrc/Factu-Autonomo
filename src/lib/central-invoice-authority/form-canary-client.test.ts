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

  it("envia bearer y token de dispositivo, y transforma la identidad segura", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        ok: true,
        rpcResult: {
          documentId: "server-doc-1",
          identityId: "identity-1",
          outboxEventId: "outbox-1",
          fullNumber: "F-2026-0001",
          sequence: 1,
          documentVersion: 1,
        },
      }),
    );

    const result = await issueCentralInvoiceAuthorityFromBrowser(request(), {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
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

  it("rechaza respuestas exitosas sin identidad fiscal completa", async () => {
    const result = await issueCentralInvoiceAuthorityFromBrowser(request(), {
      fetchImpl: vi.fn(async () =>
        jsonResponse(200, {
          ok: true,
          rpcResult: { fullNumber: "F-2026-0001" },
        }),
      ),
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
      fetchImpl: vi.fn(async () =>
        jsonResponse(409, {
          ok: false,
          error: {
            code: "CENTRAL_AUTHORITY_DISABLED",
            message: "Canary apagado",
          },
        }),
      ),
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
