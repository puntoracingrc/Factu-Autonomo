import type {
  CentralInvoiceAuthorityIssueCommand,
  CentralInvoiceAuthorityIssueCommandSafeSummary,
} from "./issue-command";

// CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION_V1
assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION =
  "CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION_V1";

export type CentralInvoiceAuthorityStoredCommandStatus =
  | "pending"
  | "committed"
  | "failed";

export interface CentralInvoiceAuthorityStoredCommand {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION;
  userId: string;
  idempotencyKeyHash: string;
  requestHash: string;
  status: CentralInvoiceAuthorityStoredCommandStatus;
  storedAt: string;
  completedAt?: string;
  result?: CentralInvoiceAuthorityCommittedIssueResult;
}

export interface CentralInvoiceAuthorityCommittedIssueResult {
  centralDocumentId: string;
  identityId: string;
  documentVersion: number;
  outboxEventId: string;
}

export type CentralInvoiceAuthorityIdempotencyDecisionKind =
  | "reserve_new"
  | "replay_committed"
  | "wait_for_pending"
  | "retry_same_failed"
  | "reject_conflicting_reuse"
  | "reject_cross_user_reuse"
  | "reject_corrupt_ledger_entry";

export interface CentralInvoiceAuthorityIdempotencyDecision {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION;
  kind: CentralInvoiceAuthorityIdempotencyDecisionKind;
  accepted: boolean;
  replay: boolean;
  commandSafeSummary: CentralInvoiceAuthorityIssueCommandSafeSummary;
  result?: CentralInvoiceAuthorityCommittedIssueResult;
  reason?: string;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La decision de idempotencia de autoridad central solo puede cargarse en servidor.",
    );
  }
}

function validStoredCommand(entry: CentralInvoiceAuthorityStoredCommand): boolean {
  return (
    entry?.schema === CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION &&
    typeof entry.userId === "string" &&
    typeof entry.idempotencyKeyHash === "string" &&
    typeof entry.requestHash === "string" &&
    (entry.status === "pending" ||
      entry.status === "committed" ||
      entry.status === "failed")
  );
}

export function buildCentralInvoiceAuthorityStoredCommand(
  command: CentralInvoiceAuthorityIssueCommand,
  status: CentralInvoiceAuthorityStoredCommandStatus,
  storedAt: string,
  result?: CentralInvoiceAuthorityCommittedIssueResult,
): CentralInvoiceAuthorityStoredCommand {
  return {
    schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
    userId: command.userId,
    idempotencyKeyHash: command.safeSummary.idempotencyKeyHash,
    requestHash: command.requestHash,
    status,
    storedAt,
    completedAt: status === "committed" || status === "failed" ? storedAt : undefined,
    result,
  };
}

export function decideCentralInvoiceAuthorityIdempotency(
  command: CentralInvoiceAuthorityIssueCommand,
  existing: CentralInvoiceAuthorityStoredCommand | null | undefined,
): CentralInvoiceAuthorityIdempotencyDecision {
  if (!existing) {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
      kind: "reserve_new",
      accepted: true,
      replay: false,
      commandSafeSummary: command.safeSummary,
    };
  }

  if (!validStoredCommand(existing)) {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
      kind: "reject_corrupt_ledger_entry",
      accepted: false,
      replay: false,
      commandSafeSummary: command.safeSummary,
      reason: "ledger_entry_invalid",
    };
  }

  if (existing.userId !== command.userId) {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
      kind: "reject_cross_user_reuse",
      accepted: false,
      replay: false,
      commandSafeSummary: command.safeSummary,
      reason: "idempotency_key_belongs_to_another_user",
    };
  }

  if (
    existing.idempotencyKeyHash !== command.safeSummary.idempotencyKeyHash ||
    existing.requestHash !== command.requestHash
  ) {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
      kind: "reject_conflicting_reuse",
      accepted: false,
      replay: false,
      commandSafeSummary: command.safeSummary,
      reason: "same_idempotency_key_different_request",
    };
  }

  if (existing.status === "committed") {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
      kind: "replay_committed",
      accepted: true,
      replay: true,
      commandSafeSummary: command.safeSummary,
      result: existing.result,
    };
  }

  if (existing.status === "pending") {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
      kind: "wait_for_pending",
      accepted: false,
      replay: false,
      commandSafeSummary: command.safeSummary,
      reason: "same_request_still_processing",
    };
  }

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION,
    kind: "retry_same_failed",
    accepted: true,
    replay: false,
    commandSafeSummary: command.safeSummary,
    reason: "same_request_failed_before_commit",
  };
}
