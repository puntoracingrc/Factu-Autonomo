import { uniqueSorted } from "./types";

// PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1

export type LocalStorageResilienceAuditEventType =
  | "storage_adapter_blocked"
  | "storage_fake_read"
  | "storage_fake_write_planned"
  | "backup_before_write_required"
  | "corruption_detected"
  | "recovery_plan_built"
  | "storage_operation_blocked";

export interface LocalStorageResilienceAuditEvent {
  marker: "PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1";
  type: LocalStorageResilienceAuditEventType;
  safeReason: string;
  tags: string[];
  containsPayload: false;
  persisted: false;
  realStorageTouched: false;
  safe: true;
}

export interface LocalStorageResilienceAuditEventStore {
  marker: "PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1";
  record(event: { type: LocalStorageResilienceAuditEventType; safeReason?: string; tags?: string[] }): LocalStorageResilienceAuditEvent;
  list(): LocalStorageResilienceAuditEvent[];
  summary(): {
    marker: "PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1";
    eventCount: number;
    persisted: false;
    containsPayload: false;
    realStorageTouched: false;
    safe: true;
  };
}

export function createInMemoryLocalStorageResilienceAuditEventStore(): LocalStorageResilienceAuditEventStore {
  let events: LocalStorageResilienceAuditEvent[] = [];

  return {
    marker: "PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1",
    record(event) {
      const safeEvent: LocalStorageResilienceAuditEvent = {
        marker: "PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1",
        type: event.type,
        safeReason: event.safeReason ?? event.type,
        tags: uniqueSorted(event.tags ?? []),
        containsPayload: false,
        persisted: false,
        realStorageTouched: false,
        safe: true,
      };
      events = [...events, safeEvent];
      return safeEvent;
    },
    list() {
      return events.map((event) => ({ ...event, tags: [...event.tags] }));
    },
    summary() {
      return {
        marker: "PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1",
        eventCount: events.length,
        persisted: false,
        containsPayload: false,
        realStorageTouched: false,
        safe: true,
      };
    },
  };
}

export function summarizeLocalStorageResilienceAuditEvents(events: LocalStorageResilienceAuditEvent[]) {
  return {
    marker: "PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1",
    eventCount: events.length,
    types: uniqueSorted(events.map((event) => event.type)),
    persisted: false,
    containsPayload: false,
    realStorageTouched: false,
    safe: true,
  };
}
