import { describe, expect, it } from "vitest";

import {
  buildCentralInvoiceAuthorityCollectionRpcArgs,
  CENTRAL_INVOICE_AUTHORITY_COLLECTION_RPC_ADAPTER,
  CentralInvoiceAuthorityCollectionRpcAdapterError,
  updateCentralInvoiceCollectionThroughRpc,
  type CentralInvoiceAuthorityCollectionRpcClient,
} from "./collection-rpc-adapter";

const input = {
  auth: {
    userId: "00000000-0000-4000-8000-000000000001",
    deviceId: "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
    sessionId: "00000000-0000-4000-8000-000000000002",
  },
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

describe("central invoice authority collection RPC adapter", () => {
  it("construye argumentos privados e idempotentes para la RPC", () => {
    const args = buildCentralInvoiceAuthorityCollectionRpcArgs(input);

    expect(args).toMatchObject({
      p_user_id: input.auth.userId,
      p_device_id: input.auth.deviceId,
      p_document_id: input.documentRef.serverDocumentId,
      p_identity_id: input.documentRef.identityId,
      p_expected_version: 1,
      p_status: "pagado",
      p_payment_status: "paid",
      p_paid_at: input.paidAt,
    });
    expect(args.p_session_hash).toHaveLength(64);
    expect(args.p_idempotency_key_hash).toHaveLength(64);
    expect(args.p_request_hash).toHaveLength(64);
    expect(JSON.stringify(args)).not.toContain(input.auth.sessionId);
    expect(JSON.stringify(args)).not.toContain(input.idempotencyKey);
  });

  it("normaliza una respuesta confirmada sin exponer payload completo", async () => {
    const calls: unknown[] = [];
    const client: CentralInvoiceAuthorityCollectionRpcClient = {
      async rpc(name, args) {
        calls.push([name, args]);
        return {
          error: null,
          data: [
            {
              result_status: "committed",
              document_id: input.documentRef.serverDocumentId,
              identity_id: input.documentRef.identityId,
              outbox_event_id: "00000000-0000-4000-8000-000000000012",
              full_number: "F-2026-0001",
              sequence: 1,
              document_version: 2,
            },
          ],
        };
      },
    };

    const result = await updateCentralInvoiceCollectionThroughRpc(client, input);

    expect(calls).toHaveLength(1);
    expect(result).toEqual({
      schema: CENTRAL_INVOICE_AUTHORITY_COLLECTION_RPC_ADAPTER,
      status: "committed",
      documentId: input.documentRef.serverDocumentId,
      identityId: input.documentRef.identityId,
      outboxEventId: "00000000-0000-4000-8000-000000000012",
      fullNumber: "F-2026-0001",
      sequence: 1,
      documentVersion: 2,
    });
    expect(JSON.stringify(result)).not.toContain("documentPayload");
  });

  it("falla cerrado ante estados incoherentes o rechazo RPC", async () => {
    expect(() =>
      buildCentralInvoiceAuthorityCollectionRpcArgs({
        ...input,
        paidAt: null,
      }),
    ).toThrow(CentralInvoiceAuthorityCollectionRpcAdapterError);

    const rejected: CentralInvoiceAuthorityCollectionRpcClient = {
      async rpc() {
        return { data: null, error: { code: "P0001", message: "denied" } };
      },
    };

    await expect(
      updateCentralInvoiceCollectionThroughRpc(rejected, input),
    ).rejects.toMatchObject({
      code: "COLLECTION_RPC_REJECTED",
      causeCode: "P0001",
      causeMessage: "denied",
    });
  });
});
