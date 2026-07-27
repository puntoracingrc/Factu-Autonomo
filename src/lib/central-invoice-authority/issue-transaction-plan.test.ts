import { describe, expect, it } from "vitest";
import {
  buildCentralInvoiceAuthorityIssueCommand,
  type CentralInvoiceAuthorityIssueInput,
} from "./issue-command";
import {
  CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
  decideCentralInvoiceAuthorityIdempotency,
} from "./issue-idempotency";
import {
  buildCentralInvoiceAuthorityTransactionPlan,
  CENTRAL_INVOICE_AUTHORITY_TRANSACTION_PLAN,
  summarizeCentralInvoiceAuthorityTransactionPlan,
} from "./issue-transaction-plan";

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
    expectedVersion: 9,
    draftHash: "sha256:SYNTHETIC_ONLY_DRAFT_HASH_A",
  },
  series: {
    environment: "test",
    issuerNif: "B00000000",
    seriesCode: "F-2026",
    fiscalYear: 2026,
  },
  issuedAt: "2026-07-27T14:00:00.000Z",
};

const command = buildCentralInvoiceAuthorityIssueCommand(baseInput);

describe("central invoice authority transaction plan", () => {
  it("ordena la emision fiscal dentro de una transaccion central", () => {
    const decision = decideCentralInvoiceAuthorityIdempotency(command, null);
    const plan = buildCentralInvoiceAuthorityTransactionPlan(command, decision);

    expect(plan.schema).toBe(CENTRAL_INVOICE_AUTHORITY_TRANSACTION_PLAN);
    expect(plan.acceptedForExecution).toBe(true);
    expect(plan.clientProvidedFiscalIdentityAllowed).toBe(false);
    expect(plan.steps.map((step) => step.id)).toEqual([
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

  it("bloquea la serie por usuario, entorno, NIF emisor, serie y ejercicio", () => {
    const decision = decideCentralInvoiceAuthorityIdempotency(command, null);
    const plan = buildCentralInvoiceAuthorityTransactionPlan(command, decision);

    expect(plan.seriesLockScope).toMatchObject({
      userId: baseInput.auth.userId,
      environment: "test",
      seriesCode: "F-2026",
      fiscalYear: 2026,
    });
    expect(plan.seriesLockScope.issuerNifHash).toBe(command.safeSummary.issuerNifHash);
    expect(JSON.stringify(plan.seriesLockScope)).not.toContain(baseInput.series.issuerNif);
  });

  it("impide asignar identidad fiscal antes de idempotencia, borrador y bloqueo de serie", () => {
    const decision = decideCentralInvoiceAuthorityIdempotency(command, null);
    const plan = buildCentralInvoiceAuthorityTransactionPlan(command, decision);
    const stepIds = plan.steps.map((step) => step.id);

    expect(stepIds.indexOf("allocate_next_identity")).toBeGreaterThan(
      stepIds.indexOf("reserve_idempotency_command"),
    );
    expect(stepIds.indexOf("allocate_next_identity")).toBeGreaterThan(
      stepIds.indexOf("verify_expected_draft_version"),
    );
    expect(stepIds.indexOf("allocate_next_identity")).toBeGreaterThan(
      stepIds.indexOf("lock_series_scope"),
    );
  });

  it("no ejecuta una segunda emision cuando la idempotencia devuelve replay", () => {
    const decision = {
      schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
      kind: "replay_committed",
      accepted: true,
      replay: true,
      commandSafeSummary: command.safeSummary,
      result: {
        centralDocumentId: "SYNTHETIC_ONLY_CENTRAL_DOC_A",
        identityId: "SYNTHETIC_ONLY_IDENTITY_A",
        documentVersion: 2,
        outboxEventId: "SYNTHETIC_ONLY_OUTBOX_A",
      },
    } as const;

    const plan = buildCentralInvoiceAuthorityTransactionPlan(command, decision);

    expect(plan.acceptedForExecution).toBe(false);
    expect(plan.replay).toBe(true);
  });

  it("resume sin exponer NIF, sesion ni clave de idempotencia en claro", () => {
    const decision = decideCentralInvoiceAuthorityIdempotency(command, null);
    const plan = buildCentralInvoiceAuthorityTransactionPlan(command, decision);
    const summary = JSON.stringify(
      summarizeCentralInvoiceAuthorityTransactionPlan(plan),
    );

    expect(summary).toContain("issuerNifHash");
    expect(summary).not.toContain(baseInput.series.issuerNif);
    expect(summary).not.toContain(baseInput.auth.sessionId);
    expect(summary).not.toContain(baseInput.idempotencyKey);
  });

  it("mantiene realtime fuera del commit fiscal", () => {
    const decision = decideCentralInvoiceAuthorityIdempotency(command, null);
    const plan = buildCentralInvoiceAuthorityTransactionPlan(command, decision);

    const realtimeStep = plan.steps.find((step) => step.id === "publish_realtime_hint");

    expect(realtimeStep?.databaseBoundary).toBe("after_commit");
    expect(realtimeStep?.blocksFiscalIdentity).toBe(false);
  });
});
