import { describe, expect, it } from "vitest";
import {
  createInMemoryLocalStorageResilienceAuditEventStore,
  summarizeLocalStorageResilienceAuditEvents,
} from "./storage-audit-events";

// PHASE2E9_STORAGE_RESILIENCE_AUDIT_EVENTS_V1

describe("storage audit events", () => {
  it("records in-memory events without payloads or persistence", () => {
    const store = createInMemoryLocalStorageResilienceAuditEventStore();
    store.record({ type: "storage_adapter_blocked", safeReason: "blocked", tags: ["storage", "storage"] });
    store.record({ type: "backup_before_write_required" });

    expect(store.summary().eventCount).toBe(2);
    expect(store.summary().persisted).toBe(false);
    expect(store.list()[0].containsPayload).toBe(false);
    expect(JSON.stringify(store.list())).not.toContain("value");
  });

  it("summarizes event types safely", () => {
    const store = createInMemoryLocalStorageResilienceAuditEventStore();
    store.record({ type: "corruption_detected" });

    expect(summarizeLocalStorageResilienceAuditEvents(store.list()).types).toEqual(["corruption_detected"]);
  });
});
