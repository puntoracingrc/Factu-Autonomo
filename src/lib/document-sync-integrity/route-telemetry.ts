// PHASE2C44_SYNC_ROUTE_SAFE_TELEMETRY_REPORT_V1
assertServerOnlyModule();

export type DocumentSyncRouteTelemetryEventType =
  | "route_disabled_hit"
  | "route_local_shell_hit"
  | "route_fake_execution_attempted"
  | "route_fake_execution_accepted"
  | "route_fake_execution_rejected"
  | "route_rate_limited"
  | "route_replay_detected"
  | "route_payload_rejected"
  | "route_method_rejected";

export interface DocumentSyncRouteTelemetryEvent {
  type: DocumentSyncRouteTelemetryEventType;
  occurredAt: string;
  requestId?: string;
  operationKind?: string;
  status?: string;
  reason?: string;
  persisted: false;
}

export interface InMemoryDocumentSyncRouteTelemetry {
  record(event: Omit<DocumentSyncRouteTelemetryEvent, "occurredAt" | "persisted">): void;
  report(): {
    total: number;
    byType: Record<string, number>;
    latest: DocumentSyncRouteTelemetryEvent[];
    persisted: false;
  };
  reset(): void;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("La telemetria de document sync route solo puede cargarse en servidor.");
  }
}

function safeText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (
    new RegExp(
      `token|${["sec", "ret"].join("")}|${["service", "role"].join("_")}|authorization|cookie|<\\?xml|%pdf|stack`,
      "i",
    ).test(value)
  ) {
    return "[redacted]";
  }
  return value.slice(0, 96);
}

export function redactDocumentSyncRouteTelemetryEvent(
  event: DocumentSyncRouteTelemetryEvent,
): DocumentSyncRouteTelemetryEvent {
  return {
    type: event.type,
    occurredAt: event.occurredAt,
    requestId: safeText(event.requestId),
    operationKind: safeText(event.operationKind),
    status: safeText(event.status),
    reason: safeText(event.reason),
    persisted: false,
  };
}

export function createInMemoryDocumentSyncRouteTelemetry():
  InMemoryDocumentSyncRouteTelemetry {
  let events: DocumentSyncRouteTelemetryEvent[] = [];

  return {
    record(event) {
      events.push(
        redactDocumentSyncRouteTelemetryEvent({
          ...event,
          occurredAt: new Date().toISOString(),
          persisted: false,
        }),
      );
      events = events.slice(-50);
    },
    report() {
      const byType: Record<string, number> = {};
      for (const event of events) byType[event.type] = (byType[event.type] ?? 0) + 1;
      return {
        total: events.length,
        byType,
        latest: events.slice(-10).map(redactDocumentSyncRouteTelemetryEvent),
        persisted: false,
      };
    },
    reset() {
      events = [];
    },
  };
}

export function recordDocumentSyncRouteTelemetryEvent(
  telemetry: InMemoryDocumentSyncRouteTelemetry,
  event: Omit<DocumentSyncRouteTelemetryEvent, "occurredAt" | "persisted">,
): void {
  telemetry.record(event);
}

export function buildDocumentSyncRouteTelemetryReport(
  telemetry: InMemoryDocumentSyncRouteTelemetry,
) {
  return telemetry.report();
}
