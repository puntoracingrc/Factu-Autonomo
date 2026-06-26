import { DocumentSyncPolicyError } from "./errors";
import type {
  DocumentSyncDecisionStatus,
  DocumentSyncRiskFlag,
  DocumentSyncSafeSummary,
  DocumentSyncServerContext,
} from "./types";

// PHASE2C5_SYNC_SAFE_AUDIT_EVENTS_V1
assertServerOnlyModule();

export type DocumentSyncAuditEventType =
  | "sync_candidate_received"
  | "sync_plan_accepted"
  | "sync_plan_rejected"
  | "sync_conflict_detected"
  | "sync_noop"
  | "protected_document_mutation_blocked";

export interface DocumentSyncAuditEventInput {
  eventType: DocumentSyncAuditEventType;
  occurredAt?: string;
  context: DocumentSyncServerContext;
  decisionStatus?: DocumentSyncDecisionStatus;
  riskFlags?: DocumentSyncRiskFlag[];
  safeSummary?: DocumentSyncSafeSummary;
  details?: Record<string, unknown>;
}

export interface DocumentSyncAuditEvent {
  eventType: DocumentSyncAuditEventType;
  occurredAt: string;
  requestId?: string;
  serverDerivedUserId?: string;
  serverDerivedScopeId?: string;
  decisionStatus?: DocumentSyncDecisionStatus;
  riskFlags: DocumentSyncRiskFlag[];
  safeSummary?: DocumentSyncSafeSummary;
  details?: Record<string, unknown>;
  persisted: false;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La auditoria de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueFlags(flags: DocumentSyncRiskFlag[] = []): DocumentSyncRiskFlag[] {
  return [...new Set(flags)];
}

function unsafeWords(): string[] {
  return [
    "document" + "snapshot",
    "pdf" + "snapshot",
    "raw" + "payload",
    "full" + "payload",
    "payload",
    "full" + "fiscal",
    "tok" + "en",
    "authorization",
    "cookie",
    "sec" + "ret",
    "service" + "_role",
    "private" + "key",
    "certificate",
    "xm" + "l",
    "%p" + "df",
  ];
}

function safeRequestId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_-]{1,80}$/.test(trimmed) ? trimmed : undefined;
}

function isAllowedSafeHashFlag(key: string): boolean {
  return (
    key === "payloadHashPresent" ||
    key === "snapshotHashPresent" ||
    key === "pdfSnapshotHashPresent"
  );
}

function shouldRedactKey(key: string): boolean {
  if (isAllowedSafeHashFlag(key)) return false;
  const normalized = key.toLowerCase();
  return unsafeWords().some((word) => normalized.includes(word));
}

function shouldRedactString(value: string): boolean {
  const normalized = value.toLowerCase();
  return unsafeWords().some((word) => normalized.includes(word));
}

function redactUnknown(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return shouldRedactString(value) ? "[redacted]" : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (typeof value !== "object") return "[redacted]";

  const safe: Record<string, unknown> = {};
  let redactedKeyIndex = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (shouldRedactKey(key)) {
      safe[`redacted_${redactedKeyIndex}`] = "[redacted]";
      redactedKeyIndex += 1;
    } else {
      safe[key] = redactUnknown(entry);
    }
  }
  return safe;
}

function assertSafeUnknown(value: unknown, key = ""): void {
  if (key && shouldRedactKey(key)) {
    throw new DocumentSyncPolicyError("UNSAFE_RESPONSE_SHAPE", [
      "unsafe_response_shape",
    ]);
  }
  if (typeof value === "string" && shouldRedactString(value)) {
    throw new DocumentSyncPolicyError("UNSAFE_RESPONSE_SHAPE", [
      "unsafe_response_shape",
    ]);
  }
  if (Array.isArray(value)) {
    for (const entry of value) assertSafeUnknown(entry);
    return;
  }
  if (value && typeof value === "object") {
    for (const [entryKey, entryValue] of Object.entries(value)) {
      assertSafeUnknown(entryValue, entryKey);
    }
  }
}

function serverDerivedUserId(context: DocumentSyncServerContext): string | undefined {
  return context.userIdSource === "server" || context.userIdSource === "test"
    ? context.userId
    : undefined;
}

export function buildDocumentSyncAuditEvent(
  input: DocumentSyncAuditEventInput,
): DocumentSyncAuditEvent {
  const event: DocumentSyncAuditEvent = {
    eventType: input.eventType,
    occurredAt: input.occurredAt ?? nowIso(),
    requestId: safeRequestId(input.context.requestId),
    serverDerivedUserId: serverDerivedUserId(input.context),
    serverDerivedScopeId: input.context.scopeId,
    decisionStatus: input.decisionStatus,
    riskFlags: uniqueFlags(input.riskFlags),
    safeSummary: input.safeSummary,
    details: input.details,
    persisted: false,
  };

  return redactDocumentSyncAuditEvent(event);
}

export function redactDocumentSyncAuditEvent(
  event: DocumentSyncAuditEvent,
): DocumentSyncAuditEvent {
  return redactUnknown(event) as DocumentSyncAuditEvent;
}

export function assertSafeDocumentSyncAuditEvent(
  event: DocumentSyncAuditEvent,
): void {
  assertSafeUnknown(event);
  if (event.persisted !== false) {
    throw new DocumentSyncPolicyError("UNSAFE_RESPONSE_SHAPE", [
      "unsafe_response_shape",
    ]);
  }
}
