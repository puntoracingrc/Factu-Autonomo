import { describe, expect, it, vi } from "vitest";

import {
  buildCentralBusinessDocumentSeriesReconciliationCommand,
  buildCentralBusinessNumberedDocumentCreateCommand,
} from "./numbered-document-command";
import {
  createCentralBusinessNumberedDocumentThroughRpc,
  reconcileCentralBusinessDocumentSeriesThroughRpc,
} from "./numbered-document-rpc-adapter";

const auth = {
  userId: "00000000-0000-4000-8000-000000000001",
  deviceId: "sha256:SYNTHETIC_DEVICE",
  sessionId: "00000000-0000-4000-8000-000000000002",
  userIdSource: "test" as const,
};

describe("central business numbered document RPC adapter", () => {
  it("concilia una serie con sesion hasheada", async () => {
    const rpc = vi.fn(async () => ({
      error: null,
      data: [{
        result_status: "committed",
        reconciliation_id: "00000000-0000-4000-8000-000000000010",
        scope_year: 2026,
        previous_sequence: 4,
        resulting_sequence: 8,
      }],
    }));
    const result = await reconcileCentralBusinessDocumentSeriesThroughRpc(
      { rpc },
      buildCentralBusinessDocumentSeriesReconciliationCommand({
        action: "reconcile_series",
        auth,
        idempotencyKey: "SYNTHETIC_RECONCILIATION_A",
        entityType: "quote",
        numberTemplate: "P-{year}-{num}",
        fiscalYear: 2026,
        observedMaxSequence: 8,
        sourceDocumentCount: 8,
        sourceDigest: `sha256:${"a".repeat(64)}`,
      }),
    );

    expect(result).toMatchObject({
      action: "reconcile_series",
      resultingSequence: 8,
    });
    expect(rpc).toHaveBeenCalledWith(
      "reconcile_central_business_document_series_v1",
      expect.objectContaining({
        p_user_id: auth.userId,
        p_session_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
  });

  it("devuelve la identidad y el payload exactos del servidor", async () => {
    const rpc = vi.fn(async () => ({
      error: null,
      data: {
        result_status: "committed",
        event_id: "00000000-0000-4000-8000-000000000011",
        event_sequence: 12,
        entity_version: 1,
        full_number: "P-2026-0009",
        sequence: 9,
        scope_year: 2026,
        content_hash: "a".repeat(64),
        document_payload: {
          id: "quote-a",
          type: "presupuesto",
          date: "2026-07-31",
          number: "P-2026-0009",
        },
      },
    }));
    const result = await createCentralBusinessNumberedDocumentThroughRpc(
      { rpc },
      buildCentralBusinessNumberedDocumentCreateCommand({
        action: "create",
        auth,
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
      }),
    );

    expect(result).toMatchObject({
      action: "create",
      fullNumber: "P-2026-0009",
      sequence: 9,
      documentPayload: { number: "P-2026-0009" },
    });
  });

  it("falla cerrado ante rechazo o confirmacion incompleta", async () => {
    const command = buildCentralBusinessNumberedDocumentCreateCommand({
      action: "create",
      auth,
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
    });
    await expect(
      createCentralBusinessNumberedDocumentThroughRpc(
        {
          async rpc() {
            return {
              data: null,
              error: { code: "P4134", message: "baseline missing" },
            };
          },
        },
        command,
      ),
    ).rejects.toMatchObject({ code: "RPC_REJECTED", causeCode: "P4134" });
    await expect(
      createCentralBusinessNumberedDocumentThroughRpc(
        {
          async rpc() {
            return { data: { result_status: "committed" }, error: null };
          },
        },
        command,
      ),
    ).rejects.toMatchObject({ code: "INVALID_RPC_RESULT" });
  });
});
