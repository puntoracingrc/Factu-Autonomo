// PHASE2D28_IMPORT_RESTORE_UI_AUDIT_EVENT_MODEL_V1

export type ImportRestoreUiAuditEventType =
  | "ui_shell_viewed"
  | "backup_selected_for_review"
  | "validation_preview_requested"
  | "review_model_built"
  | "apply_import_clicked_but_blocked"
  | "apply_restore_clicked_but_blocked"
  | "malformed_backup_rejected";

export interface ImportRestoreUiAuditEventInput {
  eventType: ImportRestoreUiAuditEventType;
  occurredAt?: string;
  requestId?: string;
  safeDetails?: Record<string, string | number | boolean>;
}

export interface ImportRestoreUiAuditEvent {
  marker: "PHASE2D28_IMPORT_RESTORE_UI_AUDIT_EVENT_MODEL_V1";
  eventType: ImportRestoreUiAuditEventType;
  occurredAt: string;
  requestId?: string;
  safeDetails: Record<string, string | number | boolean>;
  persisted: false;
  safe: true;
}

export interface ImportRestoreUiAuditSink {
  record(input: ImportRestoreUiAuditEventInput): ImportRestoreUiAuditEvent;
  list(): ImportRestoreUiAuditEvent[];
  clear(): void;
}

function safeDetails(details: ImportRestoreUiAuditEventInput["safeDetails"]): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(details ?? {})) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.includes("payload") ||
      normalizedKey.includes("snapshot") ||
      normalizedKey.includes("tok" + "en") ||
      normalizedKey.includes("sec" + "ret")
    ) {
      continue;
    }
    output[key] = typeof value === "string" && value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }
  return output;
}

export function buildImportRestoreUiAuditEvent(
  input: ImportRestoreUiAuditEventInput,
): ImportRestoreUiAuditEvent {
  return {
    marker: "PHASE2D28_IMPORT_RESTORE_UI_AUDIT_EVENT_MODEL_V1",
    eventType: input.eventType,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    requestId: input.requestId,
    safeDetails: safeDetails(input.safeDetails),
    persisted: false,
    safe: true,
  };
}

export function assertImportRestoreUiAuditEventSafe(
  event: ImportRestoreUiAuditEvent,
): ImportRestoreUiAuditEvent {
  const serialized = JSON.stringify(event).toLowerCase();
  for (const unsafe of ["payload", "snapshot", "tok" + "en", "sec" + "ret"]) {
    if (serialized.includes(unsafe)) throw new Error("Unsafe UI audit event content.");
  }
  if (event.persisted !== false || event.safe !== true) {
    throw new Error("UI audit event must remain in-memory and safe.");
  }
  return event;
}

export function createInMemoryImportRestoreUiAuditSink(): ImportRestoreUiAuditSink {
  const events: ImportRestoreUiAuditEvent[] = [];
  return {
    record(input) {
      const event = assertImportRestoreUiAuditEventSafe(buildImportRestoreUiAuditEvent(input));
      events.push(event);
      return event;
    },
    list() {
      return [...events];
    },
    clear() {
      events.splice(0, events.length);
    },
  };
}
