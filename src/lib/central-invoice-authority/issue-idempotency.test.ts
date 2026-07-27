import { describe, expect, it } from "vitest";
import {
  buildCentralInvoiceAuthorityIssueCommand,
  type CentralInvoiceAuthorityIssueInput,
} from "./issue-command";
import {
  buildCentralInvoiceAuthorityStoredCommand,
  CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
  decideCentralInvoiceAuthorityIdempotency,
  type CentralInvoiceAuthorityStoredCommand,
} from "./issue-idempotency";

const baseInput: CentralInvoiceAuthorityIssueInput = {
  kind: "invoice",
  auth: {
    userId: "SYNTHETIC_ONLY_USER_A",
    deviceId: "SYNTHETIC_ONLY_DEVICE_A",
    sessionId: "SYNTHETIC_ONLY_SESSION_A",
    userIdSource: "test",
  },
  idempotencyKey: "SYNTHETIC_ONLY_IDEMPOTENCY_A",
  draft: {
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_DOC_A",
    expectedVersion: 1,
    draftHash: "sha256:SYNTHETIC_ONLY_DRAFT_HASH_A",
  },
  series: {
    environment: "test",
    issuerNif: "B00000000",
    seriesCode: "F-2026",
    fiscalYear: 2026,
  },
  issuedAt: "2026-07-27T12:00:00.000Z",
};

const command = buildCentralInvoiceAuthorityIssueCommand(baseInput);

describe("central invoice authority idempotency decision", () => {
  it("reserva un comando nuevo si no existe entrada previa", () => {
    const decision = decideCentralInvoiceAuthorityIdempotency(command, null);

    expect(decision).toMatchObject({
      schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
      kind: "reserve_new",
      accepted: true,
      replay: false,
    });
  });

  it("reproduce el resultado confirmado para la misma peticion", () => {
    const existing = buildCentralInvoiceAuthorityStoredCommand(
      command,
      "committed",
      "2026-07-27T12:01:00.000Z",
      {
        centralDocumentId: "SYNTHETIC_ONLY_CENTRAL_DOC_A",
        identityId: "SYNTHETIC_ONLY_IDENTITY_A",
        documentVersion: 4,
        outboxEventId: "SYNTHETIC_ONLY_OUTBOX_A",
      },
    );

    const decision = decideCentralInvoiceAuthorityIdempotency(command, existing);

    expect(decision.kind).toBe("replay_committed");
    expect(decision.accepted).toBe(true);
    expect(decision.replay).toBe(true);
    expect(decision.result?.identityId).toBe("SYNTHETIC_ONLY_IDENTITY_A");
  });

  it("rechaza la misma clave de idempotencia con otro contenido", () => {
    const existing = buildCentralInvoiceAuthorityStoredCommand(
      command,
      "committed",
      "2026-07-27T12:01:00.000Z",
    );
    const conflicting = buildCentralInvoiceAuthorityIssueCommand({
      ...baseInput,
      draft: {
        ...baseInput.draft,
        draftHash: "sha256:SYNTHETIC_ONLY_OTHER_DRAFT_HASH",
      },
    });

    const decision = decideCentralInvoiceAuthorityIdempotency(conflicting, existing);

    expect(decision.kind).toBe("reject_conflicting_reuse");
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe("same_idempotency_key_different_request");
  });

  it("rechaza reutilizacion cruzada entre usuarios", () => {
    const existing = {
      ...buildCentralInvoiceAuthorityStoredCommand(
        command,
        "committed",
        "2026-07-27T12:01:00.000Z",
      ),
      userId: "SYNTHETIC_ONLY_OTHER_USER",
    };

    const decision = decideCentralInvoiceAuthorityIdempotency(command, existing);

    expect(decision.kind).toBe("reject_cross_user_reuse");
    expect(decision.accepted).toBe(false);
  });

  it("mantiene en espera una peticion identica que sigue procesando", () => {
    const existing = buildCentralInvoiceAuthorityStoredCommand(
      command,
      "pending",
      "2026-07-27T12:01:00.000Z",
    );

    const decision = decideCentralInvoiceAuthorityIdempotency(command, existing);

    expect(decision.kind).toBe("wait_for_pending");
    expect(decision.accepted).toBe(false);
  });

  it("permite reintentar la misma peticion fallida antes del commit", () => {
    const existing = buildCentralInvoiceAuthorityStoredCommand(
      command,
      "failed",
      "2026-07-27T12:01:00.000Z",
    );

    const decision = decideCentralInvoiceAuthorityIdempotency(command, existing);

    expect(decision.kind).toBe("retry_same_failed");
    expect(decision.accepted).toBe(true);
    expect(decision.replay).toBe(false);
  });

  it("bloquea entradas de ledger corruptas sin exponer payload fiscal", () => {
    const corrupt = {
      schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
      userId: command.userId,
      idempotencyKeyHash: command.safeSummary.idempotencyKeyHash,
      requestHash: command.requestHash,
      status: "unknown",
      storedAt: "2026-07-27T12:01:00.000Z",
    } as unknown as CentralInvoiceAuthorityStoredCommand;

    const decision = decideCentralInvoiceAuthorityIdempotency(command, corrupt);
    const serialized = JSON.stringify(decision);

    expect(decision.kind).toBe("reject_corrupt_ledger_entry");
    expect(serialized).not.toContain(baseInput.idempotencyKey);
    expect(serialized).not.toContain(baseInput.series.issuerNif);
    expect(serialized).not.toContain(baseInput.auth.sessionId);
  });
});
