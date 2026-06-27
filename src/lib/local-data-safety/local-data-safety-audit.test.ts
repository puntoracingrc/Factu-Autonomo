import { describe, expect, it } from "vitest";
import {
  assertLocalDataSafetyAuditEventSafe,
  buildLocalDataSafetyAuditEvent,
  createInMemoryLocalDataSafetyAuditSink,
} from "./local-data-safety-audit";

// PHASE2D8_LOCAL_DATA_SAFETY_AUDIT_EVENTS_V1

describe("local data safety audit events", () => {
  it("builds redacted in-memory events", () => {
    const event = buildLocalDataSafetyAuditEvent({
      eventType: "import_risk_detected",
      occurredAt: "2026-06-27T00:00:00.000Z",
      requestId: "req_2d",
      documentRef: "SYNTHETIC_ONLY_doc_1",
      riskFlags: ["incoming_would_overwrite_protected"],
      details: {
        rawPayload: "must not leak",
        nested: { authorization: "must not leak" },
      },
    });

    expect(event.marker).toBe("PHASE2D8_LOCAL_DATA_SAFETY_AUDIT_EVENTS_V1");
    expect(event.persisted).toBe(false);
    expect(JSON.stringify(event)).not.toContain("rawPayload");
    expect(JSON.stringify(event)).not.toContain("authorization");
    expect(assertLocalDataSafetyAuditEventSafe(event)).toBe(event);
  });

  it("records events only in memory", () => {
    const sink = createInMemoryLocalDataSafetyAuditSink();
    sink.record({ eventType: "backup_manifest_built" });
    sink.record({ eventType: "restore_blocked", riskFlags: ["restore_would_change_protected"] });

    expect(sink.list()).toHaveLength(2);
    expect(sink.list()[1].persisted).toBe(false);
    sink.clear();
    expect(sink.list()).toHaveLength(0);
  });
});
