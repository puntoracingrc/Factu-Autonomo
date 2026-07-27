import { describe, expect, it } from "vitest";

import {
  buildCentralInvoiceAuthorityEventsRpcArgs,
  CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER,
  CentralInvoiceAuthorityEventsRpcAdapterError,
  listCentralInvoiceAuthorityEventsThroughRpc,
  type CentralInvoiceAuthorityEventsRpcClient,
} from "./events-rpc-adapter";

const input = {
  userId: "00000000-0000-4000-8000-000000000001",
  deviceId: "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
  afterCreatedAt: "2026-07-27T12:00:00.000Z",
  afterEventId: "00000000-0000-4000-8000-000000000010",
  limit: 250,
};

describe("central invoice authority events RPC adapter", () => {
  it("construye argumentos acotados para la RPC de eventos", () => {
    expect(buildCentralInvoiceAuthorityEventsRpcArgs(input)).toEqual({
      p_user_id: input.userId,
      p_device_id: input.deviceId,
      p_after_created_at: input.afterCreatedAt,
      p_after_event_id: input.afterEventId,
      p_limit: 100,
    });
  });

  it("normaliza eventos emitidos sin snapshot fiscal completo", async () => {
    const calls: unknown[] = [];
    const client: CentralInvoiceAuthorityEventsRpcClient = {
      async rpc(name, args) {
        calls.push([name, args]);
        return {
          error: null,
          data: [
            {
              event_id: "00000000-0000-4000-8000-000000000020",
              document_id: "00000000-0000-4000-8000-000000000021",
              identity_id: "00000000-0000-4000-8000-000000000022",
              event_type: "invoice_issued",
              created_at: "2026-07-27T12:01:00.000Z",
              full_number: "F-2026-0001",
              sequence: 1,
              document_version: 1,
              document_payload: {
                document: { number: "F-2026-0001" },
              },
              emitted_hash: "sha256:materialized",
              safe_summary: {
                fullNumber: "F-2026-0001",
                materializedSnapshotHash: "sha256:materialized",
              },
            },
          ],
        };
      },
    };

    const result = await listCentralInvoiceAuthorityEventsThroughRpc(client, input);

    expect(calls).toHaveLength(1);
    expect(result).toEqual([
      {
        schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER,
        eventId: "00000000-0000-4000-8000-000000000020",
        documentId: "00000000-0000-4000-8000-000000000021",
        identityId: "00000000-0000-4000-8000-000000000022",
        eventType: "invoice_issued",
        createdAt: "2026-07-27T12:01:00.000Z",
        fullNumber: "F-2026-0001",
        sequence: 1,
        documentVersion: 1,
        documentPayload: {
          document: { number: "F-2026-0001" },
        },
        emittedHash: "sha256:materialized",
        safeSummary: {
          fullNumber: "F-2026-0001",
          materializedSnapshotHash: "sha256:materialized",
        },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("emittedSnapshot");
  });

  it("falla cerrado ante rechazo o filas incompletas", async () => {
    const rejected: CentralInvoiceAuthorityEventsRpcClient = {
      async rpc() {
        return { data: null, error: { code: "P0001", message: "denied" } };
      },
    };
    const incomplete: CentralInvoiceAuthorityEventsRpcClient = {
      async rpc() {
        return { data: [{ event_type: "invoice_issued" }], error: null };
      },
    };

    await expect(
      listCentralInvoiceAuthorityEventsThroughRpc(rejected, input),
    ).rejects.toMatchObject({
      code: "EVENTS_RPC_REJECTED",
      causeCode: "P0001",
    });
    await expect(
      listCentralInvoiceAuthorityEventsThroughRpc(incomplete, input),
    ).rejects.toBeInstanceOf(CentralInvoiceAuthorityEventsRpcAdapterError);
  });

  it("rechaza entradas sin usuario o dispositivo", () => {
    expect(() =>
      buildCentralInvoiceAuthorityEventsRpcArgs({
        ...input,
        userId: "",
      }),
    ).toThrow(CentralInvoiceAuthorityEventsRpcAdapterError);
    expect(() =>
      buildCentralInvoiceAuthorityEventsRpcArgs({
        ...input,
        deviceId: "",
      }),
    ).toThrow(CentralInvoiceAuthorityEventsRpcAdapterError);
  });
});
