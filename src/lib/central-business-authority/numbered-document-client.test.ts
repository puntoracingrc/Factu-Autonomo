import { describe, expect, it, vi } from "vitest";

import {
  mutateCentralBusinessNumberedDocumentFromBrowser,
  type CentralBusinessNumberedDocumentBrowserInput,
} from "./numbered-document-client";

const input: CentralBusinessNumberedDocumentBrowserInput = {
  action: "create",
  idempotencyKey: "SYNTHETIC_NUMBERED_CREATE_A",
  entityType: "quote",
  entityId: "quote-a",
  numberTemplate: "P-{year}-{num}",
  padding: 4,
  fiscalYear: 2026,
  payloadWithoutNumber: {
    id: "quote-a",
    type: "presupuesto",
    date: "2026-07-31",
  },
};

function dependencies(fetchImpl: typeof fetch) {
  return {
    fetchImpl,
    getAccessToken: vi.fn(async () => "synthetic-access-token"),
    getDeviceToken: vi.fn(() => "synthetic-device-token"),
  };
}

describe("central business numbered document browser client", () => {
  it("envia credenciales privadas y acepta solo la confirmacion completa", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_ROUTE_V1",
          result: {
            action: "create",
            status: "committed",
            eventId: "event-a",
            eventSequence: 7,
            entityVersion: 1,
            fullNumber: "P-2026-0009",
            sequence: 9,
            scopeYear: 2026,
            contentHash: "a".repeat(64),
            documentPayload: {
              id: "quote-a",
              type: "presupuesto",
              date: "2026-07-31",
              number: "P-2026-0009",
            },
          },
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const result = await mutateCentralBusinessNumberedDocumentFromBrowser(
      input,
      dependencies(fetchImpl),
    );

    expect(result).toMatchObject({
      ok: true,
      result: { action: "create", fullNumber: "P-2026-0009" },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-business-authority/numbered-document",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer synthetic-access-token",
          "X-Factu-Device-Token": "synthetic-device-token",
        }),
      }),
    );
  });

  it("marca conflictos, red transitoria y respuestas incompletas", async () => {
    const conflictFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "CENTRAL_BUSINESS_SERIES_RECONCILIATION_REQUIRED",
            message: "Reconcile first",
            causeCode: "P4134",
          },
        }),
        { status: 409 },
      ),
    ) as unknown as typeof fetch;
    await expect(
      mutateCentralBusinessNumberedDocumentFromBrowser(
        input,
        dependencies(conflictFetch),
      ),
    ).resolves.toMatchObject({
      ok: false,
      conflict: true,
      retryable: false,
      causeCode: "P4134",
    });

    await expect(
      mutateCentralBusinessNumberedDocumentFromBrowser(
        input,
        dependencies(vi.fn(async () => {
          throw new Error("offline");
        }) as unknown as typeof fetch),
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 0,
      retryable: true,
    });

    const invalidFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_ROUTE_V1",
          result: { action: "create", status: "committed" },
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;
    await expect(
      mutateCentralBusinessNumberedDocumentFromBrowser(
        input,
        dependencies(invalidFetch),
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
    });
  });
});
