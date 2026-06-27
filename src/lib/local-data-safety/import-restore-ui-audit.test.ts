import { describe, expect, it } from "vitest";
import {
  assertImportRestoreUiAuditEventSafe,
  buildImportRestoreUiAuditEvent,
  createInMemoryImportRestoreUiAuditSink,
} from "./import-restore-ui-audit";

// PHASE2D28_IMPORT_RESTORE_UI_AUDIT_EVENT_MODEL_V1

describe("import restore UI audit event model", () => {
  it("builds in-memory safe events", () => {
    const event = buildImportRestoreUiAuditEvent({
      eventType: "ui_shell_viewed",
      occurredAt: "2026-06-27T00:00:00.000Z",
      safeDetails: { sectionCount: 5 },
    });

    expect(event.persisted).toBe(false);
    expect(assertImportRestoreUiAuditEventSafe(event).safe).toBe(true);
  });

  it("redacts unsafe details and stores only in memory", () => {
    const sink = createInMemoryImportRestoreUiAuditSink();
    sink.record({
      eventType: "malformed_backup_rejected",
      safeDetails: {
        payload: "must not leak",
        documentSnapshot: "must not leak",
        visible: "ok",
      },
    });

    expect(sink.list()).toHaveLength(1);
    expect(JSON.stringify(sink.list())).not.toContain("must not leak");
    sink.clear();
    expect(sink.list()).toHaveLength(0);
  });

  it("records blocked apply clicks as safe UI audit events", () => {
    const event = buildImportRestoreUiAuditEvent({
      eventType: "apply_import_clicked_but_blocked",
      safeDetails: { blocked: true },
    });

    expect(event.eventType).toBe("apply_import_clicked_but_blocked");
    expect(event.persisted).toBe(false);
  });
});
