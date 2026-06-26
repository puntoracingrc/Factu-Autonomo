import type {
  DocumentSyncServerCommand,
  DocumentSyncServerCommandResult,
} from "./server-sync-command";
import { serializeDocumentSyncServerResult } from "./server-sync-response";
import type {
  DocumentSyncDecisionStatus,
  DocumentSyncRiskFlag,
} from "./types";

// PHASE2C28_SERVER_SYNC_SAFE_RESPONSE_AUDIT_V1
assertServerOnlyModule();

export type DocumentSyncServerAuditEventType =
  | "server_sync_command_received"
  | "server_sync_command_rejected"
  | "server_sync_dry_run_completed"
  | "server_sync_apply_completed"
  | "server_sync_batch_completed"
  | "server_sync_conflict_report_requested"
  | "server_sync_safe_report_requested";

export interface DocumentSyncServerAuditEventInput {
  eventType: DocumentSyncServerAuditEventType;
  occurredAt?: string;
  command?: DocumentSyncServerCommand;
  result?: DocumentSyncServerCommandResult;
  decisionStatus?: DocumentSyncDecisionStatus | "batch_completed";
  riskFlags?: DocumentSyncRiskFlag[];
  details?: Record<string, unknown>;
}

export interface DocumentSyncServerAuditEvent {
  eventType: DocumentSyncServerAuditEventType;
  occurredAt: string;
  requestId?: string;
  serverDerivedUserId?: string;
  serverDerivedScopeId?: string;
  commandKind?: DocumentSyncServerCommand["kind"];
  decisionStatus?: DocumentSyncDecisionStatus | "batch_completed";
  riskFlags: DocumentSyncRiskFlag[];
  commandSummary?: DocumentSyncServerCommand["safeSummary"];
  result?: DocumentSyncServerCommandResult;
  details?: Record<string, unknown>;
  persisted: false;
}

export interface InMemoryDocumentSyncServerAuditSink {
  write(event: DocumentSyncServerAuditEvent): void;
  list(): DocumentSyncServerAuditEvent[];
  reset(): void;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La auditoria server-only de sync documental solo puede cargarse en servidor.",
    );
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueFlags(flags: DocumentSyncRiskFlag[] = []): DocumentSyncRiskFlag[] {
  return [...new Set(flags)];
}

export function buildDocumentSyncServerAuditEvent(
  input: DocumentSyncServerAuditEventInput,
): DocumentSyncServerAuditEvent {
  const result = input.result
    ? serializeDocumentSyncServerResult(input.result)
    : undefined;
  const details = input.details
    ? (serializeDocumentSyncServerResult({
        commandKind: input.command?.kind ?? "dry_run_single",
        status: "accepted",
        safeReport: input.details,
      }).safeReport as Record<string, unknown> | undefined)
    : undefined;

  return {
    eventType: input.eventType,
    occurredAt: input.occurredAt ?? nowIso(),
    requestId: input.command?.requestId ?? result?.requestId,
    serverDerivedUserId:
      input.command?.auth.userId ?? result?.serverDerivedUserId,
    serverDerivedScopeId:
      input.command?.auth.scopeId ?? result?.serverDerivedScopeId,
    commandKind: input.command?.kind ?? result?.commandKind,
    decisionStatus: input.decisionStatus ?? result?.status,
    riskFlags: uniqueFlags(input.riskFlags),
    commandSummary: input.command?.safeSummary,
    result,
    details,
    persisted: false,
  };
}

export function createInMemoryDocumentSyncServerAuditSink(
  initialEvents: DocumentSyncServerAuditEvent[] = [],
): InMemoryDocumentSyncServerAuditSink {
  let events = initialEvents.map((event) => ({ ...event, persisted: false as const }));

  return {
    write(event) {
      events.push({ ...event, persisted: false });
    },
    list() {
      return events.map((event) => ({ ...event }));
    },
    reset() {
      events = [];
    },
  };
}
