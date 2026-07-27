import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildCentralInvoiceAuthorityIssueCommand } from "./issue-command";
import {
  buildCentralInvoiceAuthorityIssueRpcArgs,
  CENTRAL_INVOICE_AUTHORITY_RPC_ADAPTER,
  CentralInvoiceAuthorityIssueRpcAdapterError,
  issueCentralInvoiceThroughRpc,
  type CentralInvoiceAuthorityIssueRpcClient,
} from "./issue-rpc-adapter";

const command = buildCentralInvoiceAuthorityIssueCommand(
  {
    kind: "invoice",
    auth: {
      userId: "00000000-0000-4000-8000-000000000001",
      deviceId: "SYNTHETIC_ONLY_DEVICE_A",
      sessionId: "SYNTHETIC_ONLY_SESSION_A",
      userIdSource: "test",
    },
    idempotencyKey: "SYNTHETIC_ONLY_ISSUE_KEY_A",
    draft: {
      localDocumentId: "SYNTHETIC_ONLY_LOCAL_DOC_A",
      expectedVersion: 0,
      draftHash: "sha256:SYNTHETIC_ONLY_DRAFT_HASH_A",
    },
    series: {
      environment: "test",
      issuerNif: "B00000000",
      seriesCode: "F-2026",
      fiscalYear: 2026,
    },
    issuedAt: "2026-07-27T12:00:00.000Z",
  },
  "SYNTHETIC_ONLY_REQUEST_A",
);

const input = {
  command,
  documentPayload: { synthetic: true, total: 123.45 },
  emittedSnapshot: { synthetic: true, frozen: true },
  emittedHash: "sha256:SYNTHETIC_ONLY_EMITTED_HASH_A",
};

describe("central invoice authority RPC adapter", () => {
  it("construye argumentos para la RPC sin exponer la clave idempotente ni la sesion en claro", () => {
    const args = buildCentralInvoiceAuthorityIssueRpcArgs(input);
    const serialized = JSON.stringify(args);

    expect(args.p_user_id).toBe(command.userId);
    expect(args.p_idempotency_key_hash).toBe(command.safeSummary.idempotencyKeyHash);
    expect(args.p_session_hash).toBe(
      createHash("sha256").update(command.sessionId).digest("hex"),
    );
    expect(serialized).not.toContain(command.idempotencyKey);
    expect(serialized).not.toContain(command.sessionId);
  });

  it("invoca issue_central_invoice_v1 y normaliza resultado committed", async () => {
    const calls: unknown[] = [];
    const client: CentralInvoiceAuthorityIssueRpcClient = {
      async rpc(name, args) {
        calls.push([name, args]);
        return {
          error: null,
          data: [
            {
              result_status: "committed",
              document_id: "00000000-0000-4000-8000-000000000010",
              identity_id: "00000000-0000-4000-8000-000000000011",
              outbox_event_id: "00000000-0000-4000-8000-000000000012",
              full_number: "F-2026-0001",
              sequence: 1,
              document_version: 1,
            },
          ],
        };
      },
    };

    const result = await issueCentralInvoiceThroughRpc(client, input);

    expect(calls).toHaveLength(1);
    expect(result).toEqual({
      schema: CENTRAL_INVOICE_AUTHORITY_RPC_ADAPTER,
      status: "committed",
      documentId: "00000000-0000-4000-8000-000000000010",
      identityId: "00000000-0000-4000-8000-000000000011",
      outboxEventId: "00000000-0000-4000-8000-000000000012",
      fullNumber: "F-2026-0001",
      sequence: 1,
      documentVersion: 1,
    });
  });

  it("acepta replay idempotente confirmado", async () => {
    const client: CentralInvoiceAuthorityIssueRpcClient = {
      async rpc() {
        return {
          error: null,
          data: {
            result_status: "replayed",
            document_id: "00000000-0000-4000-8000-000000000010",
            identity_id: "00000000-0000-4000-8000-000000000011",
            outbox_event_id: "00000000-0000-4000-8000-000000000012",
            full_number: "F-2026-0001",
            sequence: 1,
            document_version: 1,
          },
        };
      },
    };

    await expect(issueCentralInvoiceThroughRpc(client, input)).resolves.toMatchObject({
      status: "replayed",
      fullNumber: "F-2026-0001",
    });
  });

  it("falla cerrado si Supabase rechaza o devuelve resultado incompleto", async () => {
    const rejected: CentralInvoiceAuthorityIssueRpcClient = {
      async rpc() {
        return { data: null, error: { code: "P0001", message: "denied" } };
      },
    };
    const incomplete: CentralInvoiceAuthorityIssueRpcClient = {
      async rpc() {
        return { data: [{ result_status: "committed" }], error: null };
      },
    };

    await expect(issueCentralInvoiceThroughRpc(rejected, input)).rejects.toMatchObject({
      code: "RPC_REJECTED",
      causeCode: "P0001",
    });
    await expect(issueCentralInvoiceThroughRpc(incomplete, input)).rejects.toMatchObject({
      code: "INVALID_RPC_RESULT",
    });
  });

  it("rechaza snapshots que no sean estructuras JSON completas", () => {
    expect(() =>
      buildCentralInvoiceAuthorityIssueRpcArgs({
        ...input,
        emittedSnapshot: "SYNTHETIC_ONLY_NOT_A_SNAPSHOT",
      }),
    ).toThrow(CentralInvoiceAuthorityIssueRpcAdapterError);
  });
});
