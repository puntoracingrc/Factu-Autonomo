import { describe, expect, it, vi } from "vitest";

import type { CentralInvoiceAuthorityAccountSeriesSummary } from "./account-series-inventory";
import {
  reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser,
} from "./account-series-reconciliation-client";

const summary: CentralInvoiceAuthorityAccountSeriesSummary = {
  environment: "test",
  issuerNif: "00000000T",
  seriesCode: "F-2026",
  fiscalYear: 2026,
  observedMaxSequence: 2955,
  sourceDocumentCount: 936,
  historicalImportDocumentCount: 0,
  sourceDigest: `sha256:${"a".repeat(64)}`,
};

describe("central authority account series reconciliation client", () => {
  it("requires browser session before network access", async () => {
    const fetchImpl = vi.fn();
    const result =
      await reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser(
        [summary],
        {
          fetchImpl,
          getAccessToken: async () => null,
          getDeviceToken: () => "device",
        },
      );

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_AUTHORITY_RECONCILIATION_SESSION_REQUIRED",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends only confirmed summaries with auth and device", async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({
        schema:
          "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_REQUEST_V1",
        confirmed: true,
        summaries: [summary],
      });
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer access-token",
        "X-Factu-Device-Token": "device-token",
      });
      return new Response(
        JSON.stringify({
          ok: true,
          schema:
            "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_ROUTE_V1",
          results: [
            {
              status: "committed",
              reconciliationId: "reconciliation-1",
              previousSequence: 0,
              resultingSequence: 2955,
              seriesCode: "F-2026",
              fiscalYear: 2026,
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result =
      await reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser(
        [summary],
        {
          fetchImpl,
          getAccessToken: async () => "access-token",
          getDeviceToken: () => "device-token",
        },
      );

    expect(result).toMatchObject({
      ok: true,
      results: [{ seriesCode: "F-2026", resultingSequence: 2955 }],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-invoice-authority/reconcile",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
  });

  it("rejects partial or malformed server evidence", async () => {
    const result =
      await reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser(
        [summary],
        {
          fetchImpl: vi.fn(async () =>
            new Response(
              JSON.stringify({
                ok: true,
                schema:
                  "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_ROUTE_V1",
                results: [],
              }),
              { status: 200 },
            ),
          ),
          getAccessToken: async () => "access-token",
          getDeviceToken: () => "device-token",
        },
      );

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_AUTHORITY_RECONCILIATION_INVALID_RESPONSE",
    });
  });
});
