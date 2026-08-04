import { describe, expect, it } from "vitest";

import {
  buildCentralInvoiceAuthorityRelationshipRpcArgs,
  CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_RPC_ADAPTER,
  CentralInvoiceAuthorityRelationshipRpcAdapterError,
  unlinkCentralInvoiceQuoteThroughRpc,
  type CentralInvoiceAuthorityRelationshipRpcClient,
} from "./relationship-rpc-adapter";

const input = {
  auth: {
    userId: "00000000-0000-4000-8000-000000000001",
    deviceId: "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
    sessionId: "00000000-0000-4000-8000-000000000002",
  },
  idempotencyKey: "central-relationship:invoice-1:1:unlink-quote",
  documentRef: {
    serverDocumentId: "00000000-0000-4000-8000-000000000010",
    identityId: "00000000-0000-4000-8000-000000000011",
    expectedVersion: 1,
  },
};

describe("central invoice authority relationship RPC adapter", () => {
  it("construye argumentos privados, acotados e idempotentes", () => {
    const args = buildCentralInvoiceAuthorityRelationshipRpcArgs(input);

    expect(args).toMatchObject({
      p_user_id: input.auth.userId,
      p_device_id: input.auth.deviceId,
      p_document_id: input.documentRef.serverDocumentId,
      p_identity_id: input.documentRef.identityId,
      p_expected_version: 1,
    });
    expect(args.p_session_hash).toHaveLength(64);
    expect(args.p_idempotency_key_hash).toHaveLength(64);
    expect(args.p_request_hash).toHaveLength(64);
    expect(JSON.stringify(args)).not.toContain(input.auth.sessionId);
    expect(JSON.stringify(args)).not.toContain(input.idempotencyKey);
  });

  it("normaliza una confirmacion sin devolver contenido fiscal", async () => {
    const client: CentralInvoiceAuthorityRelationshipRpcClient = {
      async rpc(name) {
        expect(name).toBe("unlink_central_invoice_quote_v1");
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

    await expect(unlinkCentralInvoiceQuoteThroughRpc(client, input)).resolves.toEqual({
      schema: CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_RPC_ADAPTER,
      status: "committed",
      documentId: input.documentRef.serverDocumentId,
      identityId: input.documentRef.identityId,
      outboxEventId: "00000000-0000-4000-8000-000000000012",
      fullNumber: "F-2026-0001",
      sequence: 1,
      documentVersion: 2,
    });
  });

  it("falla cerrado ante una version invalida o rechazo de Supabase", async () => {
    expect(() =>
      buildCentralInvoiceAuthorityRelationshipRpcArgs({
        ...input,
        documentRef: { ...input.documentRef, expectedVersion: 0 },
      }),
    ).toThrow(CentralInvoiceAuthorityRelationshipRpcAdapterError);

    const rejected: CentralInvoiceAuthorityRelationshipRpcClient = {
      async rpc() {
        return { data: null, error: { code: "P0001", message: "denied" } };
      },
    };
    await expect(
      unlinkCentralInvoiceQuoteThroughRpc(rejected, input),
    ).rejects.toMatchObject({
      code: "RELATIONSHIP_RPC_REJECTED",
      causeCode: "P0001",
      causeMessage: "denied",
    });
  });
});
