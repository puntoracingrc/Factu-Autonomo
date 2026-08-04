import { describe, expect, it, vi } from "vitest";

import {
  CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_CLIENT,
  unlinkCentralInvoiceQuoteFromBrowser,
} from "./relationship-client";

const input = {
  idempotencyKey: "central-relationship:invoice-1:1:unlink-quote",
  documentRef: {
    serverDocumentId: "00000000-0000-4000-8000-000000000010",
    identityId: "00000000-0000-4000-8000-000000000011",
    expectedVersion: 1,
  },
};

describe("central invoice relationship browser client", () => {
  it("requiere sesion y dispositivo antes de enviar", async () => {
    const fetchImpl = vi.fn();
    const result = await unlinkCentralInvoiceQuoteFromBrowser(input, {
      fetchImpl,
      getAccessToken: async () => null,
      getDeviceToken: () => null,
    });
    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_AUTHORITY_RELATIONSHIP_SESSION_REQUIRED",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("envia solo la referencia central y normaliza la identidad", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual(input);
      return new Response(
        JSON.stringify({
          ok: true,
          rpcResult: {
            documentId: input.documentRef.serverDocumentId,
            identityId: input.documentRef.identityId,
            outboxEventId: "00000000-0000-4000-8000-000000000012",
            fullNumber: "F-2026-0001",
            sequence: 1,
            documentVersion: 2,
          },
        }),
        { status: 200 },
      );
    });
    const result = await unlinkCentralInvoiceQuoteFromBrowser(input, {
      fetchImpl: fetchImpl as typeof fetch,
      getAccessToken: async () => "access-token",
      getDeviceToken: () => "device-token",
    });

    expect(result).toEqual({
      ok: true,
      schema: CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_CLIENT,
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
});
