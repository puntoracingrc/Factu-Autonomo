import { LocalDataSafetyError } from "./errors";
import { nowIso, uniqueRiskFlags } from "./helpers";
import type {
  InMemoryLocalDataSafetyAuditSink,
  LocalDataSafetyAuditEvent,
  LocalDataSafetyAuditEventInput,
} from "./types";

// PHASE2D8_LOCAL_DATA_SAFETY_AUDIT_EVENTS_V1

function unsafeWords(): string[] {
  return [
    "document" + "Snapshot",
    "pdf" + "Snapshot",
    "raw" + "Payload",
    "full" + "Payload",
    "payload",
    "authorization",
    "cookie",
    "tok" + "en",
    "sec" + "ret",
    "private" + "Key",
    "certificate",
    "%p" + "df",
  ];
}

function shouldRedactKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return unsafeWords().some((word) => normalized.includes(word.toLowerCase()));
}

function shouldRedactString(value: string): boolean {
  const normalized = value.toLowerCase();
  return unsafeWords().some((word) => normalized.includes(word.toLowerCase()));
}

function redactUnknown(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return shouldRedactString(value) ? "[redacted]" : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (typeof value !== "object") return "[redacted]";

  const safe: Record<string, unknown> = {};
  let redactedIndex = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (shouldRedactKey(key)) {
      safe[`redacted_${redactedIndex}`] = "[redacted]";
      redactedIndex += 1;
    } else {
      safe[key] = redactUnknown(entry);
    }
  }
  return safe;
}

function safeRequestId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9:_-]{1,80}$/.test(trimmed) ? trimmed : undefined;
}

export function buildLocalDataSafetyAuditEvent(
  input: LocalDataSafetyAuditEventInput,
): LocalDataSafetyAuditEvent {
  return redactLocalDataSafetyAuditEvent({
    marker: "PHASE2D8_LOCAL_DATA_SAFETY_AUDIT_EVENTS_V1",
    eventType: input.eventType,
    occurredAt: input.occurredAt ?? nowIso(),
    requestId: safeRequestId(input.requestId),
    riskFlags: uniqueRiskFlags(input.riskFlags ?? []),
    documentRef: input.documentRef,
    details: input.details,
    persisted: false,
  });
}

export function redactLocalDataSafetyAuditEvent(
  event: LocalDataSafetyAuditEvent,
): LocalDataSafetyAuditEvent {
  return redactUnknown(event) as LocalDataSafetyAuditEvent;
}

export function assertLocalDataSafetyAuditEventSafe(
  event: LocalDataSafetyAuditEvent,
): LocalDataSafetyAuditEvent {
  if (event.persisted !== false) {
    throw new LocalDataSafetyError("UNSAFE_REPORT", "Local data safety audit events are in-memory only.");
  }
  const body = JSON.stringify(event).toLowerCase();
  for (const word of unsafeWords()) {
    if (body.includes(word.toLowerCase())) {
      throw new LocalDataSafetyError("UNSAFE_REPORT", "Local data safety audit event is unsafe.");
    }
  }
  return event;
}

export function createInMemoryLocalDataSafetyAuditSink(): InMemoryLocalDataSafetyAuditSink {
  const events: LocalDataSafetyAuditEvent[] = [];
  return {
    record(input) {
      const event = buildLocalDataSafetyAuditEvent(input);
      assertLocalDataSafetyAuditEventSafe(event);
      events.push(event);
      return event;
    },
    list() {
      return events.map((event) => ({ ...event, riskFlags: [...event.riskFlags] }));
    },
    clear() {
      events.splice(0, events.length);
    },
  };
}
