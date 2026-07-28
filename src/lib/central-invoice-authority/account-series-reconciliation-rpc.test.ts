import { describe, expect, it, vi } from "vitest";

import type { CentralInvoiceAuthorityAccountSeriesSummary } from "./account-series-inventory";
import {
  buildCentralInvoiceAuthorityAccountSeriesReconciliationRpcArgs,
  reconcileCentralInvoiceAuthorityAccountSeriesThroughRpc,
} from "./account-series-reconciliation-rpc";

const summary: CentralInvoiceAuthorityAccountSeriesSummary = {
  environment: "test",
  issuerNif: "00000000T",
  seriesCode: "F-2026",
  fiscalYear: 2026,
  observedMaxSequence: 2955,
  sourceDocumentCount: 936,
  sourceDigest: `sha256:${"a".repeat(64)}`,
};

const input = {
  userId: "user-1",
  deviceId: "device-1",
  sessionId: "session-secret",
  summary,
};

describe("central authority account series reconciliation RPC", () => {
  it("hashes session, request and idempotency before calling Supabase", () => {
    const args =
      buildCentralInvoiceAuthorityAccountSeriesReconciliationRpcArgs(input);

    expect(args).toMatchObject({
      p_user_id: "user-1",
      p_device_id: "device-1",
      p_environment: "test",
      p_series_code: "F-2026",
      p_observed_max_sequence: 2955,
      p_source_document_count: 936,
    });
    expect(args.p_session_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(args.p_request_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(args.p_idempotency_key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(args)).not.toContain("session-secret");
  });

  it("parses a monotonic committed result", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          result_status: "committed",
          reconciliation_id: "reconciliation-1",
          previous_sequence: 0,
          resulting_sequence: 2955,
        },
      ],
      error: null,
    }));

    await expect(
      reconcileCentralInvoiceAuthorityAccountSeriesThroughRpc(
        { rpc },
        input,
      ),
    ).resolves.toMatchObject({
      status: "committed",
      reconciliationId: "reconciliation-1",
      resultingSequence: 2955,
      seriesCode: "F-2026",
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed summaries and regressive results", async () => {
    expect(() =>
      buildCentralInvoiceAuthorityAccountSeriesReconciliationRpcArgs({
        ...input,
        summary: { ...summary, sourceDigest: "raw-data" },
      }),
    ).toThrow(/datos invalidos/);

    await expect(
      reconcileCentralInvoiceAuthorityAccountSeriesThroughRpc(
        {
          rpc: vi.fn(async () => ({
            data: [
              {
                result_status: "committed",
                reconciliation_id: "reconciliation-1",
                previous_sequence: 0,
                resulting_sequence: 1,
              },
            ],
            error: null,
          })),
        },
        input,
      ),
    ).rejects.toMatchObject({ code: "INVALID_RPC_RESULT" });
  });
});
