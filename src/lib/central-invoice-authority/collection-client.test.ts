import { describe, expect, it, vi } from "vitest";

import {
  CENTRAL_INVOICE_AUTHORITY_COLLECTION_CLIENT,
  updateCentralInvoiceCollectionFromBrowser,
} from "./collection-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const input = {
  idempotencyKey: "central-collection:invoice-1:1:paid:20260728T090000000Z",
  documentRef: {
    serverDocumentId: "00000000-0000-4000-8000-000000000010",
    identityId: "00000000-0000-4000-8000-000000000011",
    expectedVersion: 1,
  },
  status: "pagado" as const,
  paymentStatus: "paid" as const,
  paidAt: "2026-07-28T09:00:00.000Z",
  documentPayload: {
    schema: "CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY_V1",
    localDocumentId: "invoice-1",
    document: {
      id: "invoice-1",
      number: "F-2026-0001",
      status: "pagado",
      paymentStatus: "paid",
      paidAt: "2026-07-28T09:00:00.000Z",
    },
  },
};

describe("central invoice authority collection client", () => {
  it("no contacta la ruta sin sesion o dispositivo local", async () => {
    const fetchImpl = vi.fn();
    const result = await updateCentralInvoiceCollectionFromBrowser(input, {
      fetchImpl,
      getAccessToken: async () => null,
      getDeviceToken: () => "device-token",
    });

    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("envia bearer, token de dispositivo y payload privado", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        ok: true,
        schema: "CENTRAL_INVOICE_AUTHORITY_COLLECTION_ROUTE_V1",
        rpcResult: {
          documentId: input.documentRef.serverDocumentId,
          identityId: input.documentRef.identityId,
          outboxEventId: "00000000-0000-4000-8000-000000000012",
          fullNumber: "F-2026-0001",
          sequence: 1,
          documentVersion: 2,
        },
      }),
    );

    const result = await updateCentralInvoiceCollectionFromBrowser(input, {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-invoice-authority/collection",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "X-Factu-Device-Token": "device-token",
        }),
      }),
    );
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      status: "pagado",
      paymentStatus: "paid",
      documentRef: {
        expectedVersion: 1,
      },
    });
    expect(result).toEqual({
      ok: true,
      schema: CENTRAL_INVOICE_AUTHORITY_COLLECTION_CLIENT,
      identity: {
        serverDocumentId: input.documentRef.serverDocumentId,
        identityId: input.documentRef.identityId,
        outboxEventId: "00000000-0000-4000-8000-000000000012",
        fullNumber: "F-2026-0001",
        sequence: 1,
        documentVersion: 2,
      },
    });
  });

  it("convierte errores de ruta en errores seguros", async () => {
    const result = await updateCentralInvoiceCollectionFromBrowser(input, {
      fetchImpl: vi.fn(async () =>
        jsonResponse(409, {
          ok: false,
          error: {
            code: "COLLECTION_RPC_REJECTED",
            message: "Version antigua.",
          },
        }),
      ),
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: "COLLECTION_RPC_REJECTED",
      message: "Version antigua.",
    });
  });
});
