import { describe, expect, it } from "vitest";

import {
  buildCentralInvoiceAuthorityRelationshipRpcArgs,
  CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_RPC_ADAPTER,
  CentralInvoiceAuthorityRelationshipRpcAdapterError,
  setCentralInvoiceQuoteThroughRpc,
  unlinkCentralInvoiceQuoteThroughRpc,
  type CentralInvoiceAuthorityRelationshipRpcClient,
} from "./relationship-rpc-adapter";

const baseInput = {
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
const input = { ...baseInput, quoteDocumentId: "quote-1" };

describe("central invoice authority relationship RPC adapter", () => {
  it("construye argumentos privados, acotados e idempotentes", () => {
    const args = buildCentralInvoiceAuthorityRelationshipRpcArgs(input);

    expect(args).toMatchObject({
      p_user_id: input.auth.userId,
      p_device_id: input.auth.deviceId,
      p_document_id: input.documentRef.serverDocumentId,
      p_identity_id: input.documentRef.identityId,
      p_expected_version: 1,
      p_quote_entity_id: "quote-1",
    });
    expect(args.p_session_hash).toHaveLength(64);
    expect(args.p_idempotency_key_hash).toHaveLength(64);
    expect(args.p_request_hash).toHaveLength(64);
    expect(JSON.stringify(args)).not.toContain(input.auth.sessionId);
    expect(JSON.stringify(args)).not.toContain(input.idempotencyKey);
  });

  it("normaliza la asignacion confirmada sin devolver contenido fiscal", async () => {
    const client: CentralInvoiceAuthorityRelationshipRpcClient = {
      async rpc(name) {
        expect(name).toBe("set_central_invoice_quote_relationship_v1");
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
              source_quote_document_id: "quote-1",
              source_quote_number: "P-2026-0007",
            },
          ],
        };
      },
    };

    await expect(
      setCentralInvoiceQuoteThroughRpc(client, input),
    ).resolves.toEqual({
      schema: CENTRAL_INVOICE_AUTHORITY_RELATIONSHIP_RPC_ADAPTER,
      status: "committed",
      documentId: input.documentRef.serverDocumentId,
      identityId: input.documentRef.identityId,
      outboxEventId: "00000000-0000-4000-8000-000000000012",
      fullNumber: "F-2026-0001",
      sequence: 1,
      documentVersion: 2,
      sourceQuoteDocumentId: "quote-1",
      sourceQuoteNumber: "P-2026-0007",
    });
  });

  it("mantiene la desvinculacion como caso compatible de la misma RPC", async () => {
    const client: CentralInvoiceAuthorityRelationshipRpcClient = {
      async rpc(name, args) {
        expect(name).toBe("set_central_invoice_quote_relationship_v1");
        expect(args.p_quote_entity_id).toBeNull();
        return {
          error: null,
          data: [
            {
              result_status: "committed",
              document_id: baseInput.documentRef.serverDocumentId,
              identity_id: baseInput.documentRef.identityId,
              outbox_event_id: "00000000-0000-4000-8000-000000000013",
              full_number: "F-2026-0001",
              sequence: 1,
              document_version: 3,
              source_quote_document_id: null,
              source_quote_number: null,
            },
          ],
        };
      },
    };

    await expect(
      unlinkCentralInvoiceQuoteThroughRpc(client, baseInput),
    ).resolves.toMatchObject({
      documentVersion: 3,
      sourceQuoteDocumentId: undefined,
      sourceQuoteNumber: undefined,
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
      setCentralInvoiceQuoteThroughRpc(rejected, input),
    ).rejects.toMatchObject({
      code: "RELATIONSHIP_RPC_REJECTED",
      causeCode: "P0001",
      causeMessage: "denied",
    });
  });
});
