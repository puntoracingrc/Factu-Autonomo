import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY,
  CENTRAL_INVOICE_AUTHORITY_CANARY_TEST_ONLY_KEY,
  CENTRAL_INVOICE_AUTHORITY_CANARY_USERS_KEY,
  CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS_KEY,
  CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY,
  CENTRAL_INVOICE_AUTHORITY_MODE_KEY,
  CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY,
  CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY,
  CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
  CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY,
  evaluateCentralInvoiceAuthorityActivation,
} from "./activation";
import {
  CENTRAL_INVOICE_AUTHORITY_ISSUE_SERVICE,
  issueCentralInvoiceWithAuthority,
  type CentralInvoiceAuthorityIssueServiceInput,
} from "./issue-service";

const userId = "00000000-0000-4000-8000-000000000001";
const userEmail = "puntoracingrc@gmail.com";

function serviceInput(): CentralInvoiceAuthorityIssueServiceInput {
  return {
    issueInput: {
      kind: "invoice",
      auth: {
        userId,
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
    documentPayload: { synthetic: true, total: 123.45 },
    emittedSnapshot: { synthetic: true, frozen: true },
    emittedHash: "sha256:SYNTHETIC_ONLY_EMITTED_HASH_A",
    rpcClient: {
      async rpc() {
        throw new Error("RPC should not be called in disabled scenarios");
      },
    },
  };
}

function activeCanary() {
  return evaluateCentralInvoiceAuthorityActivation({
    env: {
      [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "required",
      [CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY]:
        CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
      [CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY]: "true",
      [CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY]: "true",
      [CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY]: "true",
      [CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY]: "true",
    },
    userId,
  });
}

describe("central invoice authority issue service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bloquea por defecto sin llamar a la RPC", async () => {
    await expect(issueCentralInvoiceWithAuthority(serviceInput())).rejects.toMatchObject({
      code: "CENTRAL_AUTHORITY_DISABLED",
      activation: { fiscalWritesEnabled: false },
    });
  });

  it("bloquea shadow sin escrituras fiscales", async () => {
    await expect(
      issueCentralInvoiceWithAuthority({
        ...serviceInput(),
        activation: evaluateCentralInvoiceAuthorityActivation({
          env: { [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "shadow" },
          userId,
        }),
      }),
    ).rejects.toMatchObject({
      code: "CENTRAL_AUTHORITY_SHADOW_ONLY",
    });
  });

  it("impide que un canario test-only cree identidades de produccion", async () => {
    const rpc = vi.fn();
    const input = serviceInput();
    const activation = evaluateCentralInvoiceAuthorityActivation({
      env: {
        [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "canary",
        [CENTRAL_INVOICE_AUTHORITY_CANARY_USERS_KEY]: userId,
        [CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY]:
          CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
        [CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY]: "true",
        [CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY]: "true",
        [CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY]: "true",
        [CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY]: "true",
      },
      userId,
    });

    await expect(
      issueCentralInvoiceWithAuthority({
        ...input,
        issueInput: {
          ...input.issueInput,
          series: {
            ...input.issueInput.series,
            environment: "production",
          },
        },
        activation,
        env: {
          [CENTRAL_INVOICE_AUTHORITY_CANARY_TEST_ONLY_KEY]: "true",
        },
        rpcClient: { rpc },
      }),
    ).rejects.toMatchObject({
      code: "CENTRAL_AUTHORITY_CANARY_TEST_ONLY",
      activation: { effectiveMode: "canary", fiscalWritesEnabled: true },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("emite mediante el adaptador RPC cuando la activacion permite escrituras", async () => {
    const calls: unknown[] = [];
    const result = await issueCentralInvoiceWithAuthority({
      ...serviceInput(),
      activation: activeCanary(),
      rpcClient: {
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
      },
    });

    expect(calls).toHaveLength(1);
    expect(result.schema).toBe(CENTRAL_INVOICE_AUTHORITY_ISSUE_SERVICE);
    expect(result.rpcResult.fullNumber).toBe("F-2026-0001");
    expect(result.commandSafeSummary.idempotencyKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.transactionStepIds).toEqual([
      "derive_server_context",
      "reserve_idempotency_command",
      "lock_local_draft",
      "verify_expected_draft_version",
      "lock_series_scope",
      "allocate_next_identity",
      "freeze_document_snapshot",
      "commit_command_result",
      "enqueue_sync_outbox",
      "publish_realtime_hint",
    ]);
  });

  it("evalua la activacion por email privado cuando la ruta lo aporta", async () => {
    vi.stubEnv(CENTRAL_INVOICE_AUTHORITY_MODE_KEY, "canary");
    vi.stubEnv(CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS_KEY, userEmail);
    vi.stubEnv(
      CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY,
      CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
    );
    vi.stubEnv(CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY, "true");
    vi.stubEnv(CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY, "true");
    vi.stubEnv(
      CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY,
      "true",
    );
    vi.stubEnv(
      CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY,
      "true",
    );

    const calls: unknown[] = [];
    const result = await issueCentralInvoiceWithAuthority({
      ...serviceInput(),
      userEmail,
      rpcClient: {
        async rpc(name, args) {
          calls.push([name, args]);
          return {
            error: null,
            data: {
              result_status: "committed",
              document_id: "00000000-0000-4000-8000-000000000010",
              identity_id: "00000000-0000-4000-8000-000000000011",
              outbox_event_id: "00000000-0000-4000-8000-000000000012",
              full_number: "F-2026-0001",
              sequence: 1,
              document_version: 1,
            },
          };
        },
      },
    });

    expect(calls).toHaveLength(1);
    expect(result.activation.reason).toBe("canary_enabled");
  });

  it("no devuelve payload fiscal completo ni snapshot emitido en el resultado", async () => {
    const result = await issueCentralInvoiceWithAuthority({
      ...serviceInput(),
      activation: activeCanary(),
      rpcClient: {
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
      },
    });

    expect(JSON.stringify(result)).not.toContain("total");
    expect(JSON.stringify(result)).not.toContain("frozen");
  });
});
